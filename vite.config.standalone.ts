import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

/**
 * EXPERIMENTAL / OPT-IN — not exercised by an actual build yet.
 * Standard Vite + TanStack Start setup that does not use @lovable.dev/vite-tanstack-config.
 * Try it with:  bun run build:standalone   /   bun run dev:standalone
 * The default vite.config.ts (wrapper-based) is the configuration the project was developed with.
 *
 * Deployment target is chosen by Nitro's preset. The default is a plain Node server
 * (`bun run build:standalone` → `bun run start:standalone`). To deploy elsewhere set NITRO_PRESET at build time,
 * e.g. NITRO_PRESET=vercel | netlify | cloudflare_pages | bun  (see README → Deployment).
 */
export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart({
      // Use src/server.ts (our SSR error-handling wrapper) as the server entry.
      server: { entry: "server" },
    }),
    // Nitro packages the server output; it is only needed for production builds.
    ...(command === "build" ? [nitro({ preset: process.env["NITRO_PRESET"] || "node-server" })] : []),
    viteReact(),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start", "@tanstack/react-query"],
  },
}));
