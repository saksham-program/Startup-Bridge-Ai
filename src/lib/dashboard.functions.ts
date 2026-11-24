import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getModeratorDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isModerator, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "moderator",
    });
    if (roleError || !isModerator) throw new Error("Moderator access required.");
    const [reports, reportCount] = await Promise.all([
      context.supabase.from("reports").select("id,reporter_id,target_type,target_id,reason,details,status,created_at").eq("status", "open").order("created_at", { ascending: false }).limit(8),
      context.supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);
    if (reports.error) throw new Error(reports.error.message);
    if (reportCount.error) throw new Error(reportCount.error.message);

    return {
      openReports: reportCount.count ?? 0,
      reports: reports.data ?? [],
    };
  });

const ModerationDecision = z.object({ id: z.string().uuid(), status: z.enum(["reviewed", "resolved", "dismissed"]) });

export const reviewModerationItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ModerationDecision.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isModerator, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "moderator",
    });
    if (roleError || !isModerator) throw new Error("Moderator access required.");
    const { data: updated, error } = await context.supabase.from("reports").update({ status: data.status }).eq("id", data.id).eq("status", "open").select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("This report is no longer open. Refresh the dashboard.");
    return { ok: true as const };
  });