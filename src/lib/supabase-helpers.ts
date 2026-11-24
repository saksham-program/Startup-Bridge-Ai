/**
 * Supabase queries resolve with `{ data, error }` instead of throwing. Code that only reads `.data ?? []`
 * therefore turns a FAILED request (RLS/permission error, network error…) into a silent empty list.
 * Call `ensureOk(...results)` after a batch of queries so failures reach React Query's error state.
 */
type Result = { error: { message: string } | null };

export function ensureOk(...results: Result[]): void {
  for (const r of results) {
    if (r.error) throw new Error(r.error.message);
  }
}
