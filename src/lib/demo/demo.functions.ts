import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Local Demo Mode transport. The browser's demo "Supabase client" sends its queries here and the
 * in-memory demo store executes them. Every handler refuses to run unless the app is in Local Demo
 * Mode, so these endpoints are inert when a real Supabase backend is configured.
 */
const filter = z.discriminatedUnion("op", [
  z.object({ op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "is"]), col: z.string().max(64), val: z.unknown() }),
  z.object({ op: z.literal("in"), col: z.string().max(64), val: z.array(z.unknown()).max(500) }),
  z.object({ op: z.literal("or"), expr: z.string().max(1000) }),
]);

const spec = z.object({
  table: z.string().max(64),
  action: z.enum(["select", "insert", "update", "upsert", "delete"]),
  columns: z.string().max(500).optional(),
  filters: z.array(filter).max(20),
  order: z.array(z.object({ col: z.string().max(64), asc: z.boolean() })).max(4),
  limit: z.number().int().min(0).max(5000).optional(),
  values: z.unknown().optional(),
  onConflict: z.string().max(200).optional(),
  ignoreDuplicates: z.boolean().optional(),
  count: z.enum(["exact", "planned", "estimated"]).nullable().optional(),
  head: z.boolean().optional(),
  returning: z.boolean(),
  mode: z.enum(["many", "single", "maybe"]),
});

const call = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("query"), spec }),
  z.object({ kind: z.literal("rpc"), name: z.string().max(64), args: z.record(z.string(), z.unknown()) }),
  z.object({ kind: z.literal("reset") }),
  z.object({ kind: z.literal("deck") }),
]);

export const demoExec = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => call.parse(i))
  .handler(async ({ data }) => {
    const { handleDemoCall } = await import("./store.server");
    return handleDemoCall(data as never);
  });
