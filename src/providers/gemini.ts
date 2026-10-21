import { GoogleGenAI, type EmbedContentParameters, type GenerateContentParameters } from "@google/genai";
import { EngineError } from "../errors.js";
import { buildContentPrompt, buildKeywordProposalPrompt } from "../prompts.js";
import { generatedPostSchema, proposedKeywordSchema, geminiResponseSchema, geminiKeywordResponseSchema } from "../schema.js";
import type { ContentProvider, GeneratedPost } from "../types.js";

/** A trusted injection seam for tests or an in-process SDK wrapper, not user input. */
export interface GeminiClient {
  models: {
    generateContent(request: GenerateContentParameters): Promise<{ text?: string }>;
    embedContent(request: EmbedContentParameters): Promise<{ embeddings?: Array<{ values?: number[] }> }>;
  };
}
export interface GeminiOptions {
  apiKey?: string;
  model?: string;
  keywordModel?: string;
  embeddingModel?: string;
  client?: GeminiClient;
}
const MAX_SCHEMA_ATTEMPTS = 3;
const MAX_RESPONSE_CHARACTERS = 100_000;
const HTTP_OPTIONS = {
  baseUrl: "https://generativelanguage.googleapis.com",
  timeout: 60_000,
  retryOptions: { attempts: 1 },
};
const CLAMPABLE: Partial<Record<keyof GeneratedPost, number>> = { title: 90, excerpt: 220, metaTitle: 65, metaDescription: 165 };

function assertServer(): void {
  if ("window" in globalThis || typeof process === "undefined" || !process.versions?.node) {
    throw new EngineError("INVALID_CONFIG");
  }
}
function modelName(value: string): string {
  if (!/^[a-z0-9][a-z0-9._-]{0,99}$/i.test(value)) throw new EngineError("INVALID_CONFIG");
  return value;
}
function parseJSON(value: unknown): unknown {
  if (typeof value !== "string" || value.length > MAX_RESPONSE_CHARACTERS) return undefined;
  try { return JSON.parse(value); } catch { return undefined; }
}
function clampAtWordBoundary(value: string, max: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  const slice = normalized.slice(0, max + 1);
  const boundary = slice.lastIndexOf(" ");
  return slice.slice(0, boundary > max * 0.7 ? boundary : max).replace(/[\s,;:–—-]+$/g, "").trim();
}

/** Creates a server-only client. No browser key, arbitrary endpoint or raw errors are exposed. */
export function createGeminiProvider(options: GeminiOptions = {}): ContentProvider {
  assertServer();
  const model = modelName(options.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash");
  const keywordModel = modelName(options.keywordModel ?? process.env.GEMINI_KEYWORD_MODEL ?? "gemini-2.5-flash-lite");
  const embeddingModel = modelName(options.embeddingModel ?? process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001");
  const apiKey = (options.apiKey ?? process.env.GEMINI_API_KEY)?.trim();
  if (!options.client && !apiKey) throw new EngineError("MISSING_API_KEY");
  let client: GeminiClient;
  try {
    client = options.client ?? new GoogleGenAI({ apiKey, vertexai: false, httpOptions: HTTP_OPTIONS });
  } catch {
    throw new EngineError("PROVIDER_ERROR");
  }

  async function generate(request: GenerateContentParameters): Promise<unknown> {
    try {
      const response = await client.models.generateContent(request);
      return parseJSON(response.text);
    } catch {
      // Do not attach a cause: provider exceptions can contain URLs, keys and request bodies.
      throw new EngineError("PROVIDER_ERROR");
    }
  }

  return {
    async proposeKeyword(input) {
      for (let attempt = 0; attempt < MAX_SCHEMA_ATTEMPTS; attempt++) {
        const result = proposedKeywordSchema.safeParse(await generate({
          model: keywordModel,
          contents: buildKeywordProposalPrompt(input),
          config: { responseMimeType: "application/json", responseJsonSchema: geminiKeywordResponseSchema, temperature: 0.7, maxOutputTokens: 512, httpOptions: HTTP_OPTIONS },
        }));
        if (result.success) return result.data.keyword;
      }
      throw new EngineError("INVALID_DRAFT");
    },
    async generateDraft(input) {
      const basePrompt = buildContentPrompt(input);
      let correction = "";
      for (let attempt = 0; attempt < MAX_SCHEMA_ATTEMPTS; attempt++) {
        const parsed = await generate({
          model,
          contents: `${basePrompt}${correction}`,
          config: { responseMimeType: "application/json", responseJsonSchema: geminiResponseSchema, temperature: attempt ? 0.3 : 0.6, maxOutputTokens: 8000, httpOptions: HTTP_OPTIONS },
        });
        let result = generatedPostSchema.safeParse(parsed);
        if (!result.success && parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const onlyClampable = result.error.issues.every((issue) => issue.code === "too_big" && issue.path.length === 1 && typeof issue.path[0] === "string" && Object.hasOwn(CLAMPABLE, issue.path[0]));
          if (onlyClampable) {
            const record = parsed as Record<string, unknown>;
            for (const [field, max] of Object.entries(CLAMPABLE)) {
              if (typeof record[field] === "string") record[field] = clampAtWordBoundary(record[field], max);
            }
            result = generatedPostSchema.safeParse(record);
          }
        }
        if (result.success) return result.data;
        // Never echo a model response or an untrusted validation message into the next request.
        correction = "\n\nPrevious output failed validation. Regenerate a complete JSON object matching every schema constraint and use non-empty plain-text fields without HTML.";
      }
      throw new EngineError("INVALID_DRAFT");
    },
    async embedTexts(texts) {
      if (!texts.length) return [];
      if (texts.length > 10_000 || texts.some((value) => typeof value !== "string" || !value.trim() || value.length > 10_000)) {
        throw new EngineError("INVALID_EMBEDDING");
      }
      const result: number[][] = [];
      // The API accepts at most 100 items per embedding batch. Sequential batches
      // preserve order and avoid unbounded concurrent paid requests on large sites.
      for (let offset = 0; offset < texts.length; offset += 100) {
        const batch = texts.slice(offset, offset + 100);
        let response: Awaited<ReturnType<GeminiClient["models"]["embedContent"]>>;
        try {
          response = await client.models.embedContent({ model: embeddingModel, contents: batch, config: { taskType: "SEMANTIC_SIMILARITY", httpOptions: HTTP_OPTIONS } });
        } catch {
          throw new EngineError("PROVIDER_ERROR");
        }
        if (!response || !Array.isArray(response.embeddings)) throw new EngineError("INVALID_EMBEDDING");
        const vectors = response.embeddings.map((embedding) => embedding?.values);
        const size = result[0]?.length ?? vectors[0]?.length;
        if (!size || vectors.length !== batch.length || vectors.some((vector) => !Array.isArray(vector) || vector.length !== size || vector.length > 10_000 || vector.some((value) => !Number.isFinite(value)) || !vector.some((value) => value !== 0))) {
          throw new EngineError("INVALID_EMBEDDING");
        }
        result.push(...vectors as number[][]);
      }
      return result;
    },
  };
}
