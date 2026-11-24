import { formatDistanceToNowStrict } from "date-fns";

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "";
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again.") {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return fallback;
}

export function truncate(s: string | null | undefined, n = 140) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
