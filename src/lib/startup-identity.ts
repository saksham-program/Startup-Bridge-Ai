const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isStartupId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

type NestedStartup = { id?: unknown };

export type StartupIdentitySource = {
  id?: unknown;
  startup_id?: unknown;
  startup?: NestedStartup | null;
  founder_id?: unknown;
  problem_id?: unknown;
  stage?: unknown;
  name?: unknown;
  tagline?: unknown;
};

function pickId(value: unknown): string | null {
  return isStartupId(value) ? value : null;
}

export function resolveStartupId(source: StartupIdentitySource | null | undefined): string | null {
  if (!source || typeof source !== "object") return null;

  const nested =
    source.startup && typeof source.startup === "object" ? pickId(source.startup.id) : null;
  if (nested) return nested;

  const explicit = pickId(source.startup_id);
  if (explicit) return explicit;

  const looksLikeStartup =
    source.founder_id !== undefined ||
    source.stage !== undefined ||
    (source.name !== undefined && source.tagline !== undefined);
  if (looksLikeStartup) return pickId(source.id);

  return null;
}

export function startupMatchesParam(
  startup: { id?: unknown } | null | undefined,
  paramId: string,
): boolean {
  return isStartupId(paramId) && pickId(startup?.id) === paramId;
}
