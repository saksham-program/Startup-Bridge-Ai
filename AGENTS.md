# Contributor / AI-agent notes

- Two runtime modes exist: **Supabase mode** (real backend) and **Local Demo Mode** (in-memory simulation in `src/lib/demo/`). The mode is resolved once in `src/lib/app-mode.ts`. Never make a failed real login fall back to a demo session.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client code or give it a `VITE_` prefix; it is read only in `src/integrations/supabase/client.server.ts`.
- Keep optional demo-data SQL in `scripts/` separate from schema migrations (`drizzle/migrations/`), using stable IDs and guards so setup can be safely repeated without overwriting user records. After editing the SQL seeds run `bun run demo:generate` to refresh `src/lib/demo/seed.generated.ts`.
- Keep role dashboards on the shared authenticated route; any moderator-only data access must verify the moderator role server-side before privileged reads or writes, because ordinary row policies intentionally hide review queues.
