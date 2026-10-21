import { z } from "zod";
import { EngineError } from "./errors.js";
import type { EngineConfig, ExistingPost } from "./types.js";

const text = z.string().trim().min(1).max(10_000);
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
export const configSchema = z.object({
  projectId: id,
  brand: z.object({ name: text, audience: text, locale: z.string().min(2).max(40).default("tr"), tone: text }).strict(),
  pillars: z.array(z.object({ id, label: text, riskTier: z.enum(["normal", "high"]).default("normal") }).strict()).min(1).max(100),
  facets: z.array(z.object({ id, description: text }).strict()).min(1).max(30),
  editorialRules: z.array(text).max(100).default([]),
  blockedPhrases: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  requiredNotice: text.optional(),
  maxAttempts: z.number().int().min(1).max(5).default(3),
  duplicateThreshold: z.number().min(0.5).max(1).default(0.9),
  keywordThreshold: z.number().min(0.5).max(1).default(0.93),
}).strict().superRefine((config, ctx) => {
  for (const field of ["pillars", "facets"] as const) {
    if (new Set(config[field].map(item => item.id)).size !== config[field].length) {
      ctx.addIssue({ code: "custom", path: [field], message: "Duplicate IDs" });
    }
  }
});
export function parseConfig(value: unknown): EngineConfig {
  const parsed = configSchema.safeParse(value);
  if (!parsed.success) throw new EngineError("INVALID_CONFIG");
  return parsed.data;
}
const historySchema = z.array(z.object({
  title: z.string().trim().min(1).max(200), excerpt: z.string().max(2000),
  slug: id, targetKeyword: z.string().trim().min(1).max(120).optional(),
  pillarId: id.optional(), facetId: id.optional(),
}).strict()).max(10_000);
export function parseHistory(value: unknown): ExistingPost[] {
  const parsed = historySchema.safeParse(value);
  if (!parsed.success) throw new EngineError("INVALID_HISTORY");
  return parsed.data;
}
