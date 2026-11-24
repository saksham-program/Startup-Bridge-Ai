import { defineConfig } from "drizzle-kit";

// Only used if you choose drizzle-kit tooling. The supported way to apply the SQL migrations is
// `bun run db:migrate` (scripts/migrate.mjs), which reads DATABASE_URL from .env.
export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});
