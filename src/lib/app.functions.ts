import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { spamCheck } from "./ai/engine.server";
import { CATEGORIES, FREQUENCIES } from "./constants";

const ProblemInput = z.object({
  title: z.string().min(8).max(140),
  description: z.string().min(30).max(4000),
  category: z.enum(CATEGORIES),
  location: z.string().max(120).optional().nullable(),
  who_faces: z.string().max(200).optional().nullable(),
  frequency: z.enum(FREQUENCIES).optional().nullable(),
  image_url: z.string().max(500).optional().nullable(),
  tags: z.array(z.string().min(1).max(30)).max(8),
});

/** Server-validated problem creation with spam check + rate limit. Insert runs under RLS as the user. */
export const createProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ProblemInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const spam = spamCheck(`${data.title} ${data.description}`);
    if (spam.spam) throw new Error(`Post blocked by spam protection: ${spam.reason}`);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase.from("problems").select("id", { count: "exact", head: true }).eq("author_id", userId).gte("created_at", since);
    if ((count ?? 0) >= 5) throw new Error("Rate limit: you can post up to 5 problems per hour.");
    const { data: row, error } = await supabase
      .from("problems")
      .insert({
        title: data.title,
        description: data.description,
        category: data.category,
        location: data.location ?? null,
        who_faces: data.who_faces ?? null,
        frequency: data.frequency ?? null,
        image_url: data.image_url ?? null,
        author_id: userId,
        tags: data.tags.map((t) => t.toLowerCase()),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("audit_logs").insert({ user_id: userId, action: "problem.create", target_type: "problem", target_id: row.id });
    return { id: row.id };
  });

const CONNECTION_RESTRICTED = "Connections are restricted. General Users cannot connect with founders or investors.";
const DOCUMENTS_RESTRICTED = "Documents are restricted. General Users cannot access startup documents.";

const ConnectionInput = z.object({
  recipient_id: z.string().uuid(),
  startup_id: z.string().uuid().optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
});

/** Creates a connection request. Founders and investors only; general users are rejected server-side. */
export const createConnectionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ConnectionInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.recipient_id === userId) throw new Error("You cannot connect with yourself.");
    const [{ data: isFounder }, { data: isInvestor }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "founder" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "investor" }),
    ]);
    if (!isFounder && !isInvestor) throw new Error(CONNECTION_RESTRICTED);
    const { data: row, error } = await supabase
      .from("connections")
      .insert({
        requester_id: userId,
        recipient_id: data.recipient_id,
        startup_id: data.startup_id ?? null,
        message: data.message?.trim() || null,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message.includes("row-level security") ? CONNECTION_RESTRICTED : error.message);
    return row;
  });

const SignedDeckInput = z.object({ path: z.string().min(1).max(500) });

/** Issues a short-lived pitch-deck URL. General users are rejected server-side; storage RLS still applies. */
export const getStartupDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SignedDeckInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: isGeneral }, { data: isFounder }, { data: isInvestor }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "general_user" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "founder" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "investor" }),
    ]);
    if (isGeneral && !isFounder && !isInvestor) throw new Error(DOCUMENTS_RESTRICTED);
    const { data: doc } = await supabase.from("documents").select("id").eq("storage_path", data.path).maybeSingle();
    if (!doc) throw new Error("You don't have access to this document yet.");
    const { data: signed, error } = await supabase.storage.from("pitch-decks").createSignedUrl(data.path, 60 * 10);
    if (error || !signed?.signedUrl) throw new Error("You don't have access to this document yet.");
    return signed.signedUrl;
  });

const MessageInput = z.object({ connection_id: z.string().uuid(), body: z.string().min(1).max(2000) });

/** Sends a message inside an accepted connection. Spam + rate-limited server-side; RLS enforces participation. */
export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => MessageInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const body = data.body.trim();
    const spam = spamCheck(body);
    if (spam.spam) throw new Error(`Message blocked by spam protection: ${spam.reason}`);
    const { data: conn } = await supabase.from("connections").select("id,status,requester_id,recipient_id").eq("id", data.connection_id).maybeSingle();
    if (!conn || conn.status !== "accepted" || (conn.requester_id !== userId && conn.recipient_id !== userId)) {
      throw new Error("You can only message accepted connections.");
    }
    const { data: isGeneral } = await supabase.rpc("has_role", { _user_id: userId, _role: "general_user" });
    if (isGeneral) {
      const otherId = conn.requester_id === userId ? conn.recipient_id : conn.requester_id;
      const [{ data: otherFounder }, { data: otherInvestor }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: otherId, _role: "founder" }),
        supabase.rpc("has_role", { _user_id: otherId, _role: "investor" }),
      ]);
      if (otherFounder || otherInvestor) throw new Error(CONNECTION_RESTRICTED);
    }
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", userId).gte("created_at", since);
    if ((count ?? 0) >= 30) throw new Error("You are sending messages too quickly. Please wait a moment.");
    const { data: row, error } = await supabase.from("messages").insert({ connection_id: data.connection_id, sender_id: userId, body }).select("*").single();
    if (error) throw new Error(error.message.includes("row-level security") ? "You can only message accepted connections." : error.message);
    return row;
  });

const ReportInput = z.object({
  target_type: z.enum(["problem", "startup", "user", "message", "survey"]),
  target_id: z.string().uuid(),
  reason: z.enum(["Spam", "Fraud", "Harassment", "Misleading information", "Inappropriate content", "Other"]),
  details: z.string().max(1000).optional().nullable(),
});

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ReportInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("reports").insert({ target_type: data.target_type, target_id: data.target_id, reason: data.reason, details: data.details ?? null, reporter_id: userId });
    if (error) throw new Error(error.message);
    await supabase.from("audit_logs").insert({ user_id: userId, action: "report.create", target_type: data.target_type, target_id: data.target_id });
    return { ok: true };
  });

/** Demo verification workflow: submit → under_review; simulate review → verified. No real KYC data is collected. */
export const submitVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      organization: z.string().min(2).max(120),
      professional_reference: z.string().min(2).max(200),
      notes: z.string().max(500).optional(),
      legal_name: z.string().min(2).max(120),
      date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter date of birth as YYYY-MM-DD"),
      legal_company_name: z.string().min(2).max(160),
      company_registration: z.string().max(80).optional(),
      ownership_attestation: z.boolean().optional(),
      startup_id: z.string().uuid().optional().nullable(),
      investor_type: z.string().min(2).max(80).optional(),
      professional_role: z.string().min(2).max(80).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: isInvestor }, { data: isFounder }, { data: isGeneral }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "investor" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "founder" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "general_user" }),
    ]);
    if (isGeneral || (!isInvestor && !isFounder)) throw new Error("Only founders and investors can request verification");

    const dob = new Date(`${data.date_of_birth}T00:00:00Z`);
    const today = new Date();
    const age = today.getUTCFullYear() - dob.getUTCFullYear() - (today.getUTCMonth() < dob.getUTCMonth() || (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate()) ? 1 : 0);
    if (Number.isNaN(dob.getTime()) || age < 18) throw new Error("You must be at least 18 years old to request verification.");

    let startupId: string | null = null;
    if (isFounder) {
      if (!data.ownership_attestation) throw new Error("Please confirm you own or are authorized to represent this startup.");
      if (data.startup_id) {
        const { data: owned } = await supabase.from("startups").select("id").eq("id", data.startup_id).eq("founder_id", userId).maybeSingle();
        if (!owned) throw new Error("You can only associate a startup you own.");
        startupId = owned.id;
      }
    }
    let investorType: string | null = null;
    let professionalRole: string | null = null;
    if (isInvestor && !isFounder) {
      const { data: investorProfile } = await supabase.from("investor_profiles").select("investor_type").eq("user_id", userId).maybeSingle();
      investorType = data.investor_type?.trim() || investorProfile?.investor_type?.trim() || null;
      professionalRole = data.professional_role?.trim() || null;
      if (!investorType) throw new Error("Please select your investor type.");
      if (!professionalRole) throw new Error("Please enter your professional role.");
    }

    const { data: existing } = await supabase.from("verification_records").select("id,status").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existing?.status === "verified") return { status: "verified" as const };
    const payload = {
      user_id: userId,
      status: "under_review" as const,
      organization: data.organization,
      professional_reference: data.professional_reference,
      notes: data.notes ?? null,
      submitted_at: new Date().toISOString(),
      legal_name: data.legal_name,
      date_of_birth: data.date_of_birth,
      legal_company_name: data.legal_company_name,
      company_registration: data.company_registration?.trim() || null,
      ownership_attestation: isFounder ? true : false,
      startup_id: startupId,
      investor_type: investorType,
      professional_role: professionalRole,
    };
    const { error } = existing
      ? await supabase.from("verification_records").update(payload).eq("id", existing.id)
      : await supabase.from("verification_records").insert(payload);
    if (error) throw new Error(error.message);
    await supabase.from("audit_logs").insert({ user_id: userId, action: "verification.submit" });
    return { status: "under_review" as const };
  });

export const simulateVerificationReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ outcome: z.enum(["verified", "rejected"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: isInvestor }, { data: isFounder }, { data: isGeneral }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "investor" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "founder" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "general_user" }),
    ]);
    if (isGeneral || (!isInvestor && !isFounder)) throw new Error("Only founders and investors can request verification");
    const { data: existing } = await supabase.from("verification_records").select("id,status").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!existing || existing.status !== "under_review") throw new Error("Submit verification details first.");
    const { error } = await supabase.from("verification_records").update({ status: data.outcome, reviewed_at: new Date().toISOString(), notes: "Demo review (prototype) – no real KYC performed" }).eq("id", existing.id);
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const verifiedTitle = isFounder && !isInvestor ? "You are now a Verified Founder" : "You are now a Verified Investor";
    await supabaseAdmin.from("notifications").insert({ user_id: userId, type: "verification", title: data.outcome === "verified" ? verifiedTitle : "Verification not approved", body: "Demo verification workflow", link: "/verification" });
    return { status: data.outcome };
  });

/* ------------------------------ Surveys ------------------------------ */

const QuestionInput = z.object({
  type: z.enum(["single_choice", "multiple_choice", "rating", "yes_no", "short_answer", "long_answer"]),
  prompt: z.string().min(4).max(300),
  options: z.array(z.string().min(1).max(120)).max(8).default([]),
  required: z.boolean().default(true),
});

const SurveyInput = z.object({
  title: z.string().min(6).max(140),
  description: z.string().max(2000).optional().nullable(),
  startup_id: z.string().uuid().optional().nullable(),
  problem_id: z.string().uuid().optional().nullable(),
  target_audience: z.object({ categories: z.array(z.string()).max(6).default([]), location: z.string().max(120).optional().nullable() }).default({ categories: [] }),
  publish: z.boolean().default(false),
  questions: z.array(QuestionInput).min(1).max(15),
});

/** Create a survey with its questions, optionally publishing immediately. Founders and general users only. */
export const createSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SurveyInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: isFounder }, { data: isGeneral }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "founder" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "general_user" }),
    ]);
    if (!isFounder && !isGeneral) throw new Error("Only founders and general users can create surveys");
    const spam = spamCheck(`${data.title} ${data.description ?? ""}`);
    if (spam.spam) throw new Error(`Survey blocked by spam protection: ${spam.reason}`);
    for (const q of data.questions) {
      if ((q.type === "single_choice" || q.type === "multiple_choice") && q.options.filter((o) => o.trim()).length < 2) {
        throw new Error(`"${q.prompt}" needs at least two options.`);
      }
    }
    let startupId = data.startup_id ?? null;
    if (!isFounder) {
      startupId = null;
    } else if (startupId) {
      const { data: owned } = await supabase.from("startups").select("id").eq("id", startupId).eq("founder_id", userId).maybeSingle();
      if (!owned) throw new Error("You can only link a survey to your own startup.");
    }
    const { data: survey, error } = await supabase
      .from("surveys")
      .insert({
        founder_id: userId,
        title: data.title,
        description: data.description ?? null,
        startup_id: startupId,
        problem_id: data.problem_id ?? null,
        target_audience: data.target_audience,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: qErr } = await supabase.from("survey_questions").insert(
      data.questions.map((q, idx) => ({
        survey_id: survey.id,
        position: idx,
        type: q.type,
        prompt: q.prompt,
        options: q.options.filter((o) => o.trim()),
        required: q.required,
      })),
    );
    if (qErr) throw new Error(qErr.message);
    if (data.publish) {
      const { error: pErr } = await supabase.from("surveys").update({ status: "published" }).eq("id", survey.id);
      if (pErr) throw new Error(pErr.message);
    }
    await supabase.from("audit_logs").insert({ user_id: userId, action: "survey.create", target_type: "survey", target_id: survey.id });
    return { id: survey.id, status: data.publish ? ("published" as const) : ("draft" as const) };
  });

/** Owner-only: publish or close one of their surveys. */
export const setSurveyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["draft", "published", "closed"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: survey } = await supabase.from("surveys").select("id,founder_id").eq("id", data.id).maybeSingle();
    if (!survey || survey.founder_id !== userId) throw new Error("Survey not found");
    const { error } = await supabase.from("surveys").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { status: data.status };
  });

/** Submit answers for a published survey. One response per user, validated against the questions. */
export const submitSurveyResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ survey_id: z.string().uuid(), answers: z.record(z.string(), z.unknown()) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: survey } = await supabase.from("surveys").select("id,status").eq("id", data.survey_id).maybeSingle();
    if (!survey) throw new Error("Survey not found");
    if (survey.status !== "published") throw new Error("This survey is not accepting responses.");
    const { data: existing } = await supabase.from("survey_responses").select("id").eq("survey_id", data.survey_id).eq("respondent_id", userId).maybeSingle();
    if (existing) throw new Error("You have already responded to this survey.");
    const { data: questions } = await supabase.from("survey_questions").select("id,required,type").eq("survey_id", data.survey_id);
    for (const q of questions ?? []) {
      const a = data.answers[q.id];
      const empty = a === undefined || a === null || a === "" || (Array.isArray(a) && a.length === 0);
      if (q.required && empty) throw new Error("Please answer all required questions.");
    }
    const { error } = await supabase.from("survey_responses").insert({ survey_id: data.survey_id, respondent_id: userId, answers: data.answers as never });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ Blocking ------------------------------ */

export const setBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid(), blocked: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.user_id === userId) throw new Error("You cannot block yourself.");
    if (data.blocked) {
      const { error } = await supabase.from("blocks").insert({ blocker_id: userId, blocked_id: data.user_id });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("blocks").delete().eq("blocker_id", userId).eq("blocked_id", data.user_id);
      if (error) throw new Error(error.message);
    }
    return { blocked: data.blocked };
  });
