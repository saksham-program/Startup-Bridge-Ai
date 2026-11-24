/** Shared fetch wrapper for Supabase clients. */
function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/** New-style Supabase API keys are opaque strings, not bearer JWTs: strip them from Authorization. */
export function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);

    // Never wait forever: a hung request would otherwise leave a page on skeletons indefinitely.
    // Reads get 30s; writes/uploads get longer because file uploads can legitimately take a while.
    const method = (init?.method ?? (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")).toUpperCase();
    const limitMs = method === "GET" || method === "HEAD" ? 30_000 : 120_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new DOMException(`The request timed out after ${limitMs / 1000}s. Check your connection and try again.`, "TimeoutError")), limitMs);
    const upstream = init?.signal ?? (typeof Request !== "undefined" && input instanceof Request ? input.signal : undefined);
    if (upstream) {
      if (upstream.aborted) controller.abort(upstream.reason);
      else upstream.addEventListener("abort", () => controller.abort(upstream.reason), { once: true });
    }
    return fetch(input, { ...init, headers, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}
