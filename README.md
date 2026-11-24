# StartupBridge AI

**Connect · Validate · Build · Grow**

StartupBridge AI is an AI-assisted startup ecosystem platform that
connects founders, investors, and general users around real-world
problems. It supports problem discovery, startup idea validation,
feedback collection, investor discovery, and collaboration.

Users register with their own email and password and choose a role:
**Founder**, **Investor**, or **General User**. A **Moderator** role can
be assigned separately by an authorized administrator.

------------------------------------------------------------------------

## Table of Contents

-   [Key Features](#key-features)
-   [Technology Stack](#technology-stack)
-   [System Architecture](#system-architecture)
-   [Project Structure](#project-structure)
-   [Getting Started](#getting-started)
-   [Environment Configuration](#environment-configuration)
-   [Database Setup](#database-setup)
-   [Authentication and Roles](#authentication-and-roles)
-   [Development Commands](#development-commands)
-   [Build and Deployment](#build-and-deployment)
-   [Troubleshooting](#troubleshooting)
-   [Disclaimer](#disclaimer)

## Key Features

### Founder

-   Discover real-world problems and explore opportunities.
-   Create and manage startup profiles.
-   Manage startup milestones and documents.
-   Create surveys and review feedback.
-   View AI-assisted insights and potential investor matches.
-   Manage connections with investors.

### Investor

-   Create an investor profile and specify investment preferences.
-   Discover startups and review relevant information.
-   Explore ranked startup matches.
-   Save opportunities and manage connection requests.

### General User

-   Explore problems and startup opportunities.
-   Submit problems, participate in surveys, and share feedback.
-   Follow topics and engage with platform content.

### Platform capabilities

-   Role-based workspaces and protected routes.
-   Supabase authentication and profile provisioning.
-   Startup discovery and investor matching.
-   AI-assisted analysis with a deterministic fallback engine.
-   Notifications, messaging, connections, and moderation features where
    enabled.

> Feature availability depends on backend configuration, database
> migrations, and external service credentials.

## Technology Stack

  -----------------------------------------------------------------------
  Area                    Technologies            Purpose
  ----------------------- ----------------------- -----------------------
  Frontend                React 19, TypeScript    Interactive, typed user
                                                  interface

  Application framework   TanStack Start,         File-based routing,
                          TanStack Router         server functions,
                                                  server-side rendering

  Build tooling           Vite 8, Nitro           Development server and
                                                  application build

  Styling and UI          Tailwind CSS 4,         Responsive styling and
                          shadcn/ui, Radix UI     accessible UI
                                                  components

  Data fetching           TanStack Query          Client-side data
                                                  fetching and caching

  Backend services        Supabase                Authentication,
                                                  database access, file
                                                  storage

  Database                PostgreSQL              Relational application
                                                  data

  Validation              Zod                     Runtime input and
                                                  environment validation

  Charts and icons        Recharts, lucide-react  Data visualization and
                                                  interface icons

  Development tools       TypeScript, ESLint,     Type checking and code
                          Prettier                quality

  Package manager         Bun                     Dependency installation
                                                  and scripts

  Optional AI             OpenAI-compatible API   AI-assisted analysis;
                                                  heuristic fallback is
                                                  available
  -----------------------------------------------------------------------

The current Vite configuration uses `@lovable.dev/vite-tanstack-config`
as a configuration wrapper. It is installed from the public npm registry
and does not require the Lovable editor or hosting. An alternative
standalone Vite configuration is included, but it is experimental and
has not been verified for production use.

## System Architecture

``` text
                       ┌─────────────────────────┐
                       │       Web Browser       │
                       │   React + TypeScript    │
                       └────────────┬────────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
                    ▼                                ▼
          ┌──────────────────┐            ┌────────────────────┐
          │ Supabase Client  │            │ TanStack Server    │
          │ Publishable key  │            │ Functions          │
          │ RLS-protected    │            │ Business logic     │
          └────────┬─────────┘            └─────────┬──────────┘
                   │                     ┌──────────┴──────────┐
                   │                     ▼                     ▼
                   │             ┌──────────────┐    ┌────────────────┐
                   │             │ Auth         │    │ Server-only    │
                   │             │ Middleware   │    │ Supabase Admin │
                   │             │ JWT checks   │    │ Client         │
                   │             └──────┬───────┘    └───────┬────────┘
                   └────────────────────┴──────────┬─────────┘
                                                   ▼
                                      ┌────────────────────────┐
                                      │ Supabase               │
                                      │ PostgreSQL + Storage   │
                                      │ Row Level Security     │
                                      └────────────────────────┘

                         Optional AI provider
                         + heuristic fallback
```

### Request and security flow

1.  The browser renders the React application and uses the Supabase
    client with a publishable key for permitted user operations.
2.  Protected server functions receive authenticated requests.
3.  Authentication middleware verifies the user's JWT and establishes
    the user context.
4.  User-scoped operations remain subject to PostgreSQL Row Level
    Security (RLS).
5.  Privileged operations use the server-only Supabase service-role
    client.
6.  The service-role key must remain on the server and must never be
    exposed in browser code.

The service-role client is used for selected privileged operations such
as profile/role provisioning and system writes. It must not replace
user-level authorization.

## Project Structure

``` text
StartupBridge-AI/
├── public/                       # Static files, logos, favicon and PWA icons
├── src/
│   ├── routes/                   # Landing, authentication and app routes
│   ├── components/               # Brand, layout and reusable UI components
│   ├── lib/                      # Server functions, AI logic and utilities
│   └── integrations/
│       └── supabase/             # Supabase clients, middleware and types
├── drizzle/
│   └── migrations/               # Ordered SQL migrations and migration journal
├── scripts/                      # Database migration and seed scripts
├── docs/                         # Project documentation
├── .env.example                  # Environment variable template
├── package.json
├── bun.lock
├── vite.config.ts
└── README.md
```

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) 20 or later.
-   [Bun](https://bun.sh/) 1.1 or later.
-   A [Supabase](https://supabase.com/) project.

Install Bun if needed:

``` bash
npm install --global bun
```

### 1. Clone the repository

``` bash
git clone https://github.com/saksham-program/Startup-Bridge-Ai.git
cd Startup-Bridge-Ai
```

### 2. Install dependencies

``` bash
bun install
```

The project includes `bun.lock`. Use Bun to keep dependency resolution
consistent.

### 3. Create your local environment file

macOS/Linux:

``` bash
cp .env.example .env
```

Windows PowerShell:

``` powershell
Copy-Item .env.example .env
```

### 4. Configure Supabase

Add your own values to `.env`. See [Environment
Configuration](#environment-configuration).

### 5. Start the development server

``` bash
bun run dev
```

Open the local URL printed in the terminal. The port may vary depending
on the Vite configuration and port availability.

## Environment Configuration

The repository includes `.env.example` as a template. Create a local
`.env` file and add your own credentials.

  ---------------------------------------------------------------------------------
  Variable                          Exposure                Purpose
  --------------------------------- ----------------------- -----------------------
  `VITE_SUPABASE_URL`               Browser-safe            Supabase project URL

  `VITE_SUPABASE_PUBLISHABLE_KEY`   Browser-safe            Supabase
                                                            publishable/anon key

  `VITE_SUPABASE_PROJECT_ID`        Browser-safe            Supabase project
                                                            reference

  `SUPABASE_SERVICE_ROLE_KEY`       **Server only**         Privileged server-side
                                                            operations

  `DATABASE_URL`                    Scripts/server only     Database migration and
                                                            seed scripts

  `AI_API_KEY`                      **Server only**         Optional AI provider
                                                            credential

  `AI_BASE_URL`                     Server only             Optional
                                                            OpenAI-compatible API
                                                            endpoint

  `AI_MODEL`                        Server only             Optional model
                                                            identifier

  `NITRO_PRESET`                    Build time              Nitro deployment target
  ---------------------------------------------------------------------------------

### Security requirements

-   Never commit `.env` or `.env.local`.
-   Commit `.env.example` with placeholder values only.
-   Never prefix `SUPABASE_SERVICE_ROLE_KEY` or AI secrets with `VITE_`.
-   Never put server secrets in frontend components or
    browser-accessible code.
-   Configure production secrets in the hosting platform's server-side
    environment.
-   Rotate any secret that has been committed or exposed.

If Supabase environment variables are missing, the landing page may
still load, but authentication and backend features will not work until
configuration is completed.

## Database Setup

The application uses Supabase PostgreSQL. SQL migrations are stored in
`drizzle/migrations/`.

### Apply migrations

Configure `DATABASE_URL` in `.env`, then run:

``` bash
bun run db:migrate
```

The migration runner applies migrations in the order recorded in
`drizzle/migrations/meta/_journal.json` and tracks applied migrations in
`public.app_migrations`.

**Important:** Review the target database before running migrations. The
migration set establishes the application schema and related policies.
Do not blindly rerun or manually reorder migrations on a database that
has already been migrated by another process.

Migrations define the database schema, roles and policies, triggers, and
storage configuration. Do not rename or edit migration files that have
already been applied to a shared database. Use new migration files for
future schema changes.

### Sample data

The initial seed migration includes illustrative records such as sample
profiles, problems, startups, surveys, and messages. These records are
application data; they are **not login accounts** and cannot be used to
sign in.

To add the additional sample startup catalogue, run:

``` bash
bun run db:seed
```

The sample startup seed script is designed to be safe to rerun. Review
the script and target database before using it in production.

### Moderator role

A moderator role can be granted to an existing authenticated user by an
authorized database administrator. Use the authenticated user's actual
ID and follow the project's access-control procedures.

## Authentication and Roles

Users create their own accounts through the registration page using an
email address and password.

Supported roles: - **Founder** --- manages startup information and
founder activities. - **Investor** --- manages investment preferences
and discovers startups. - **General User** --- explores problems and
participates in platform activities. - **Moderator** --- an additional
role assigned separately where moderation access is required.

Supabase Auth manages authentication. The application provisions the
user's profile and role through server-side logic. Protected routes
require an authenticated session and enforce role-specific access.

There are no shared demo login credentials. Sample database records do
not provide accounts that can be used to sign in.

For email confirmation and password reset links, configure local and
production URLs in **Supabase → Authentication → URL Configuration**.

## Development Commands

  Command                Purpose
  ---------------------- ---------------------------
  `bun install`          Install dependencies
  `bun run dev`          Start local development
  `bun run typecheck`    Run TypeScript checks
  `bun run lint`         Run ESLint
  `bun test`             Run the test suite
  `bun run build`        Create a production build
  `bun run db:migrate`   Apply database migrations
  `bun run db:seed`      Add sample startup data

Use the package manager and scripts defined by the repository. If using
npm, check `package.json` for the available scripts and use the matching
lockfile consistently.

## Build and Deployment

Create a production build:

``` bash
bun run build
```

The primary build configuration is `vite.config.ts`, which uses the
project's TanStack/Vite configuration wrapper and Nitro.

The repository also contains `vite.config.standalone.ts` with explicit
plugins and a Node-oriented output configuration. The standalone scripts
are experimental and have not been verified against the complete
deployment setup. Use the primary configuration unless you have tested
the standalone alternative.

The Nitro deployment preset can be configured using `NITRO_PRESET`. The
correct preset and runtime command depend on the hosting provider.
Verify the selected deployment target before publishing.

### Production checklist

-   Apply and verify database migrations.
-   Configure all required environment variables in the hosting
    provider.
-   Keep service-role and AI credentials server-side.
-   Configure Supabase authentication redirect URLs.
-   Decide whether illustrative sample data belongs in the production
    database.
-   Verify RLS policies and storage permissions.
-   Test registration, sign-in, role access, and core workflows in the
    deployed environment.

## Troubleshooting

  ----------------------------------------------------------------------------
  Problem                                  What to check
  ---------------------------------------- -----------------------------------
  Backend configuration notice             Check `VITE_SUPABASE_URL` and
                                           `VITE_SUPABASE_PUBLISHABLE_KEY` in
                                           `.env`, then restart the server.

  `SUPABASE_SERVICE_ROLE_KEY is not set`   Configure the server-only key in
                                           the local/server environment. Do
                                           not add a `VITE_` prefix.

  Sign-up or password-reset links return   Add the local or production URL to
  to the wrong URL                         Supabase Authentication URL
                                           Configuration.

  Storage bucket not found                 Verify that storage-related
                                           migrations have been applied to the
                                           correct Supabase project.

  Database migration fails                 Check `DATABASE_URL`, database
                                           permissions, migration journal
                                           state, and whether earlier
                                           migrations have already been
                                           applied.

  Logo or icons are missing                Confirm that required static assets
                                           are present in `public/` and their
                                           paths match the code.

  Development port is already in use       Stop the other process or start
                                           Vite with another available port.
  ----------------------------------------------------------------------------

For persistent errors, inspect the browser console and terminal output.
Resolve the underlying configuration, network, database, or
authorization issue rather than hiding the error.

## Disclaimer

StartupBridge AI supports startup discovery, feedback collection,
analysis, and communication. AI-generated insights and matching results
are indicative and should be reviewed by users. The platform does not
guarantee investment, funding, business success, or investment returns.
