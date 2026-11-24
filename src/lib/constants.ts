export const APP_NAME = "StartupBridge AI";
export const TAGLINE = "Connect • Validate • Build • Grow";
export const POLICY_VERSION = "2026-10-v1";

export type AppRole = "founder" | "investor" | "general_user" | "moderator";
export type PrimaryRole = Exclude<AppRole, "moderator">;

export const ROLE_META: Record<PrimaryRole, { label: string; emoji: string; blurb: string; home: string }> = {
  founder: { label: "Founder", emoji: "🚀", blurb: "Build and validate your startup.", home: "/dashboard" },
  investor: { label: "Investor", emoji: "💰", blurb: "Discover and connect with startups.", home: "/dashboard" },
  general_user: { label: "General User", emoji: "👥", blurb: "Share problems and help validate ideas.", home: "/dashboard" },
};

export const CATEGORIES = [
  "Healthcare",
  "Agriculture",
  "Transportation",
  "Education",
  "Fintech",
  "Housing",
  "Consumer",
  "Sustainability",
  "Logistics",
  "SaaS",
  "Public services",
  "Other",
] as const;

export const INDUSTRIES = [
  "Healthcare",
  "Agriculture",
  "Transportation",
  "Education",
  "Fintech",
  "Housing",
  "Consumer",
  "Sustainability",
  "Logistics",
  "SaaS",
  "Other",
] as const;

export const STAGES = [
  { value: "idea", label: "Idea" },
  { value: "prototype", label: "Prototype" },
  { value: "mvp", label: "MVP" },
  { value: "early_traction", label: "Early traction" },
  { value: "growth", label: "Growth" },
] as const;

export const FREQUENCIES = ["Daily", "Weekly", "Monthly", "Occasionally"] as const;
export const INVESTOR_TYPES = ["Angel", "Pre-seed Fund", "Seed Fund", "Venture Capital", "Family Office", "Corporate"] as const;
export const REPORT_REASONS = ["Spam", "Fraud", "Harassment", "Misleading information", "Inappropriate content", "Other"] as const;

export const QUESTION_TYPES = [
  { value: "single_choice", label: "Single choice" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "rating", label: "Rating (1–5)" },
  { value: "yes_no", label: "Yes / No" },
  { value: "short_answer", label: "Short answer" },
  { value: "long_answer", label: "Long answer" },
] as const;

export const DEMO_ACCOUNTS: Record<PrimaryRole, { id: string; email: string; name: string }> = {
  founder: { id: "11111111-1111-4111-8111-000000000001", email: "demo.founder@startupbridge.ai", name: "Karan Mehta" },
  investor: { id: "22222222-2222-4222-8222-000000000001", email: "demo.investor@startupbridge.ai", name: "Neha Kapoor" },
  general_user: { id: "33333333-3333-4333-8333-000000000001", email: "demo.user@startupbridge.ai", name: "Demo User 1" },
};

export const DISCLAIMER =
  "StartupBridge AI facilitates discovery and communication. It does not guarantee investment returns or startup success.";

export function stageLabel(v: string | null | undefined) {
  return STAGES.find((s) => s.value === v)?.label ?? v ?? "—";
}

export function formatINR(n: number | null | undefined) {
  if (!n) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}
