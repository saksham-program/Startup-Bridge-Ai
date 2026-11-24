# StartupBridge AI

**Connect • Validate • Build • Grow** — an AI-assisted startup ecosystem that connects **founders**, **investors** and **general users** around real-world problems: discover problems, validate ideas with surveys and AI analysis, match with the right people, and track growth.

Users register with their own email and password and choose a role (**Founder**, **Investor** or **General User**); a **Moderator** role can additionally be granted in the database. Authentication is handled by Supabase Auth and every table is protected by Row Level Security. A Supabase project is required for sign-up, sign-in and data.

---

## 1. Technology stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19, TanStack Router, server functions, SSR) built with Vite 8 + Nitro
- **Build configuration:** `vite.config.ts` uses the published npm package [`@lovable.dev/vite-tanstack-config`](https://www.npmjs.com/package/@lovable.dev/vite-tanstack-config), a thin wrapper that bundles the standard plugins (TanStack Start, React, Tailwind, tsconfig paths, Nitro). It installs from the public npm registry and does not require the Lovable editor or hosting. An **experimental, untested** wrapper-free alternative is provided in `vite.config.standalone.ts` (see *Build configuration* below)
- **UI:** Tailwind CSS v4, shadcn/ui (Radix), lucide-react, Recharts
- **Data:** TanStack Query, Supabase (Postgres, Auth, Storage), Zod validation
- **Tooling:** TypeScript (strict), ESLint, Prettier, `bun test`
- **Package manager:** [Bun](https://bun.sh) (`bun.lock`)
- **AI (optional):** any OpenAI-compatible API; a built-in heuristic engine is used otherwise

## 2. Architecture

```
Browser ──► React routes ──► `supabase` client (src/integrations/supabase/client.ts)
                │                 supabase-js, publishable key only, RLS enforced
                │
                └──► server functions (src/lib/*.functions.ts, run on the server)
                          ├─ auth middleware  (src/integrations/supabase/auth-middleware.ts)
                          │     verifies the user's JWT → RLS-scoped client
                          └─ service-role client (client.server.ts) — server only
                                used for profile/role creation after sign-up, notifications, audit logs, AI results
```

- **Row Level Security** — all reads/writes from the browser go through RLS policies defined in `drizzle/migrations/`. Privileged work happens only in server functions using `SUPABASE_SERVICE_ROLE_KEY`, which is never sent to the browser.
- **Roles** — `founder`, `investor`, `general_user` (chosen at sign-up and provisioned server-side) and `moderator` (granted manually).
- `src/lib/demo/` contains an inactive, in-memory simulation that has no entry point in the UI. It is not used by the application and can be deleted together with `src/components/DemoModeBanner.tsx`.

## 3. Folder structure

```
src/
  routes/                 File-based routes (landing, auth, forgot/reset password, _authenticated/* app)
  components/             UI (brand/, layout/, ui/ = shadcn) 
  lib/                    Server functions, constants, AI engine, auth provider, app-mode.ts (env + mode)
  lib/demo/               Inactive simulation code (no UI entry point)
  integrations/supabase/  Clients, auth middleware, generated DB types
public/                   Static assets (brand/ logos, favicon, PWA icons, manifest)
drizzle/migrations/       Ordered SQL migrations (schema, RLS, storage buckets & policies)
scripts/                  db:migrate, db:seed, sample-data SQL
docs/                     Original product brief and project notes
.env.example              Every environment variable, with placeholders
```

> **npm works too.** `npm install && npm run dev` serves the app on <http://localhost:8080> (the config wrapper's dev port; `bun run dev` is identical). The committed lockfile is `bun.lock`; the TanStack/Vite packages are pinned to exact versions in `package.json`, so npm resolves the same versions for them.

## 4. Prerequisites

- [Bun](https://bun.sh) ≥ 1.1 (`curl -fsSL https://bun.sh/install | bash`, or `npm i -g bun`)
- Node.js ≥ 20 (used by the DB scripts and Node-based deployments)
- *Supabase mode only:* a free [Supabase](https://supabase.com) project

## 5. Installation

```bash
git clone <your-repo-url> startupbridge-ai
cd startupbridge-ai
bun install
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
```

> `bun.lock` originally pinned 122 packages to a private registry mirror that is not reachable outside the original platform; those URLs were replaced with the default public registry (integrity hashes unchanged). If `bun install` rewrites the lockfile, commit the result.

## 6. Local development

```bash
bun run dev
```

Open <http://localhost:5173>. Fill in `.env` first (next section); without Supabase settings the landing page loads but the sign-in and sign-up pages show a *Backend not configured* notice.

### Creating an account and signing in

1. Open **Get started** (`/get-started`), choose a role, fill in your details (name, email, a password of at least 8 characters and the role-specific fields) and accept the terms.
2. If **Confirm email** is enabled in Supabase (Authentication → Providers → Email), a confirmation link is sent; sign in after confirming. Otherwise you are signed in immediately.
3. On first sign-in the server creates your profile and role from your sign-up details, and you land in the workspace for your role. Protected routes redirect to `/auth` when signed out.
4. **Sign in** at `/auth`; **Forgot password?** sends a reset link that opens `/reset-password`; **Log out** is in the account menu. Add your site URL to Supabase → Authentication → URL Configuration so e-mail links return to the app.

## 7. Supabase configuration (real backend)

1. **Create a project** at <https://supabase.com/dashboard> (note the database password).
2. **API keys** — Project Settings → API:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = the **anon / publishable** key
   - `VITE_SUPABASE_PROJECT_ID` = the project reference (informational)
   - `SUPABASE_SERVICE_ROLE_KEY` = the **service_role / secret** key — **server only, never commit, never prefix with `VITE_`**
3. **Database URL** — Project Settings → Database → Connection string → *URI* → `DATABASE_URL` (used only by the migration/seed scripts).
4. **Auth settings** — Authentication → URL Configuration: add `http://localhost:5173` (and your production URL) to *Site URL / Redirect URLs* (required for sign-up confirmation and `/reset-password` links).
5. Restart `bun run dev`. Missing or invalid variables are reported with the exact variable name.

### Database migrations

```bash
bun run db:migrate
```

Applies `drizzle/migrations/*.sql` in journal order (two files share the prefix `0008`, so order follows `meta/_journal.json`), exactly once each (tracked in `public.app_migrations`), each inside a transaction. Use it on a **fresh** database; if your database was already migrated by another tool, do not re-run it. Existing migrations were deliberately **not renamed or edited**; additions are new files (`0010_create_storage_buckets.sql`) plus a journal entry for the previously unlisted `0004`. They create the schema, enums, triggers, Row Level Security policies, the private `media` and `pitch-decks` storage buckets and their storage policies. You can alternatively paste the files into the Supabase SQL editor in order.

### Sample data (optional)

Migration `0001_seed_demo_data.sql` inserts sample profiles, problems, startups, surveys and messages so the discovery pages are populated. These are plain records; they are **not login accounts**. Optionally add ten more illustrative startups:

```bash
bun run db:seed
```

(Guarded and safe to re-run.) If you do not want sample data in a brand-new production project, remove `0001_seed_demo_data.sql` (and its journal entry) **before the first apply** — never on a database where it has already run.

### Make yourself a moderator (optional)

```sql
insert into public.user_roles (user_id, role) values ('<your auth user id>', 'moderator');
```

## 8. Environment variables

See [`.env.example`](./.env.example) — it documents every variable.

| Variable | Scope | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | browser-safe | Supabase connection |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Profile/role creation, notifications, audit logs, AI results |
| `DATABASE_URL` | scripts only | `db:migrate`, `db:seed` |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | **server only** | Optional OpenAI-compatible provider |
| `NITRO_PRESET` | build time | Deployment target (wrapper default: Cloudflare) |

`.env` / `.env.local` are git-ignored. Only `.env.example` (placeholders) is tracked.

## 9. Quality checks

```bash
bun run typecheck   # tsc --noEmit
bun run lint        # eslint
bun test            # unit tests (config, seed & migration integrity, AI engine …)
bun run build       # production build
```

The brand icon was reconstructed from the project's `public/favicon.ico` (48 px was the only source resolution); if you have a higher-resolution original, replace `public/brand/*`, `public/icon-*.png` and `public/apple-touch-icon.png`.

## 10. Production build & deployment

```bash
bun run build
```

`vite.config.ts` delegates Nitro to the config wrapper, whose documented default deployment target is **Cloudflare**. Where the output goes and how to run it therefore depends on the Nitro preset; to choose another target set `NITRO_PRESET` at build time (for example `NITRO_PRESET=node-server`, `vercel`, `netlify`, `bun`; see the [Nitro deployment docs](https://nitro.build/deploy)). This preset override and the Node run command (`node .output/server/index.mjs`) are standard Nitro behaviour but **have not been exercised against this exact setup**.

### Build configuration

| Script | Config | Status |
|---|---|---|
| `bun run dev` / `build` / `preview` | `vite.config.ts` (wrapper) | The configuration the project was developed with |
| `bun run dev:standalone` / `build:standalone` / `start:standalone` | `vite.config.standalone.ts` (explicit plugins, Node server output) | **Experimental, never built** — written from the official plugin APIs; use it only if you want to drop the wrapper and be ready to adjust the Nitro options |

Set the same environment variables in your host's dashboard — `VITE_*` values must be present **at build time**; server secrets at **runtime**.

Production checklist: apply migrations to the production Supabase project, decide deliberately about sample data (see above), enable e-mail confirmation in Supabase, add the production URL to Supabase *Redirect URLs*, keep `SUPABASE_SERVICE_ROLE_KEY` in the server secret store only.

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| Sign-in page shows *"Backend not configured"* | Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env` and restart. |
| A page shows *"… didn’t load"* with a **Try again** button | A request failed and the page now shows the real reason instead of loading forever. Typical causes: a missing/invalid `.env` value, a database migration that has not been applied (`bun run db:migrate`), or no network. Requests are also capped at 30 s (reads) / 120 s (writes) so nothing can hang indefinitely. |
| Terminal warnings about `inputValidator` or `vite-tsconfig-paths` | Harmless deprecation notices. The installed TanStack version (1.168.60, pinned) documents `.inputValidator(...)`, so it was intentionally not renamed; check with `npm ls @tanstack/react-start`. The `vite-tsconfig-paths` plugin comes from the config wrapper. |
| Dashboard says *"Your workspace didn't load"* / sidebar shows `?` and `…` for a new account | The profile could not be created. The error text on the page says why; the usual cause is `SUPABASE_SERVICE_ROLE_KEY` missing from `.env` (restart after adding it). Signing in again then completes the setup automatically, including for accounts whose sign-up was interrupted. |
| *"SUPABASE_SERVICE_ROLE_KEY is not set"* right after signing in | Add the key to the **server** environment (`.env`) and restart; it is needed to create your profile. |
| Sign-up e-mail link or password reset goes to the wrong page | Add your URL to Supabase → Authentication → URL Configuration. |
| Uploads fail with "bucket not found" | Re-run `bun run db:migrate` (migration `0002` creates the buckets). |
| `bun install` fails on a registry URL | You have an old lockfile; use the one in this repo (cleaned) and run `bun install`. |
| Logo or icons missing | They are static files in `public/` (`brand/startupbridge-icon-*.webp`, `favicon.ico`, `icon-*.png`, `apple-touch-icon.png`); make sure `public/` was copied. |
| Port already in use | `bun run dev -- --port 3001` |

## 12. Disclaimer

StartupBridge AI facilitates discovery and communication. It does not guarantee investment returns or startup success. AI output is indicative only.
#   S t a r t u p - B r i d g e - A i  
 