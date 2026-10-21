import assert from "node:assert/strict";
import test from "node:test";
import type { GenerateContentParameters } from "@google/genai";
import { createGeminiProvider, type GeminiClient } from "../src/providers/gemini.js";
import { generatedPostSchema, geminiResponseSchema } from "../src/schema.js";
import type { DraftInput, GeneratedPost } from "../src/types.js";

const input: DraftInput = {
  config: {
    projectId: "example", brand: { name: "Example", audience: "Readers", locale: "en", tone: "Clear" },
    pillars: [{ id: "basics", label: "Basics", riskTier: "normal" }],
    facets: [{ id: "how", description: "How it works" }],
    editorialRules: ["Never invent evidence."], blockedPhrases: [],
    maxAttempts: 3, duplicateThreshold: 0.9, keywordThreshold: 0.93,
  },
  pillar: { id: "basics", label: "Basics", riskTier: "normal" },
  facet: { id: "how", description: "How it works" },
  targetKeyword: "how to start a reading routine", existingTitles: [],
};
function fixture(): GeneratedPost {
  return {
    title: "A practical guide to reading routines", slug: "reading-routines",
    excerpt: "A simple reading routine starts with a manageable choice and a short time that fits your day. This guide explains the steps.",
    metaTitle: "A practical reading routine guide",
    metaDescription: "Explore a practical approach to starting a reading routine, choosing a suitable time, and reflecting on what works for you.",
    keywords: ["reading", "routines", "books", "planning"], tags: ["books", "habits", "learning"],
    introParagraphs: ["Start with a short period that fits your schedule.", "Choose material that interests you."],
    definition: { question: "What is a reading routine?", answer: "It is a repeatable time and place for reading." },
    bodyParagraphs: ["Choose a comfortable place.", "Start with a short time.", "Keep a book available.", "Review what worked."],
    faqItems: [
      { question: "When can I start?", answer: "Choose a suitable time." },
      { question: "Which book can I choose?", answer: "Choose one that interests you." },
      { question: "How do I adapt the routine?", answer: "Reflect on your experience." },
    ],
  };
}
function client(generate: GeminiClient["models"]["generateContent"]): GeminiClient {
  return { models: { generateContent: generate, embedContent: async () => ({ embeddings: [{ values: [1, 0] }] }) } };
}
const providerOptions = { model: "gemini-2.5-flash", keywordModel: "gemini-2.5-flash-lite", embeddingModel: "gemini-embedding-001" };

test("valid draft uses structured output, bounded transport, and data-only brand context", async () => {
  const requests: GenerateContentParameters[] = [];
  const provider = createGeminiProvider({ ...providerOptions, client: client(async (request) => {
    requests.push(request); return { text: JSON.stringify(fixture()) };
  }) });
  const result = await provider.generateDraft(input);
  assert.equal(result.slug, "reading-routines");
  assert.equal(requests.length, 1);
  const request = requests[0]!;
  assert.equal(request.config?.responseMimeType, "application/json");
  assert.equal(request.config?.maxOutputTokens, 8000);
  assert.equal(request.config?.httpOptions?.timeout, 60_000);
  assert.equal(request.config?.httpOptions?.retryOptions?.attempts, 1);
  assert.equal(request.config?.httpOptions?.baseUrl, "https://generativelanguage.googleapis.com");
  assert.match(String(request.contents), /Never invent evidence/);
  assert.match(String(request.contents), /"name":"Example"/);
});

test("overlong metadata is clamped without another API request", async () => {
  let calls = 0;
  const draft = fixture(); draft.metaTitle = "A reading routine that fits around your day and supports a pleasant experience with your chosen books";
  const provider = createGeminiProvider({ ...providerOptions, client: client(async () => { calls++; return { text: JSON.stringify(draft) }; }) });
  const result = await provider.generateDraft(input);
  assert.ok(result.metaTitle.length <= 65); assert.equal(calls, 1);
});

test("invalid JSON and HTML fail after three attempts without reflecting model output", async () => {
  let calls = 0; const requests: GenerateContentParameters[] = [];
  const poison = "private-value-not-for-logs";
  const provider = createGeminiProvider({ ...providerOptions, client: client(async (request) => {
    calls++; requests.push(request); return { text: JSON.stringify({ ...fixture(), title: `<script>${poison}</script>` }) };
  }) });
  await assert.rejects(provider.generateDraft(input), (error: unknown) => {
    assert.equal((error as { code: string }).code, "INVALID_DRAFT");
    assert.doesNotMatch(String(error), new RegExp(poison)); return true;
  });
  assert.equal(calls, 3);
  assert.ok(requests.every((request) => !String(request.contents).includes(poison)));
  assert.equal(generatedPostSchema.safeParse({ ...fixture(), faqItems: [{ question: " ", answer: "Answer" }] }).success, false);
});

test("provider failures never expose response details or cause", async () => {
  const poison = "credential-in-provider-response";
  const provider = createGeminiProvider({ ...providerOptions, client: client(async () => { throw new Error(poison); }) });
  await assert.rejects(provider.generateDraft(input), (error: unknown) => {
    assert.equal((error as { code: string }).code, "PROVIDER_ERROR");
    assert.doesNotMatch(String(error), new RegExp(poison));
    assert.equal((error as { cause?: unknown }).cause, undefined); return true;
  });
});

test("invalid keyword responses are bounded and empty vectors fail closed", async () => {
  let calls = 0;
  const provider = createGeminiProvider({ ...providerOptions, client: {
    models: { generateContent: async () => { calls++; return { text: "not JSON" }; }, embedContent: async () => ({ embeddings: [{ values: [] }] }) },
  } });
  await assert.rejects(provider.proposeKeyword({ ...input, avoidPhrases: [] }), { code: "INVALID_DRAFT" });
  assert.equal(calls, 3);
  await assert.rejects(provider.embedTexts(["Example text"]), { code: "INVALID_EMBEDDING" });
});

test("embedding batches preserve order and reject missing or inconsistent vectors", async () => {
  const batchSizes: number[] = [];
  const provider = createGeminiProvider({ ...providerOptions, client: {
    models: { generateContent: async () => ({}), embedContent: async (request) => {
      const texts = request.contents as string[]; batchSizes.push(texts.length);
      return { embeddings: texts.map((value) => ({ values: [Number(value), 1] })) };
    } },
  } });
  const vectors = await provider.embedTexts(Array.from({ length: 205 }, (_, index) => String(index)));
  assert.deepEqual(batchSizes, [100, 100, 5]); assert.deepEqual(vectors[204], [204, 1]);
  const invalid = createGeminiProvider({ ...providerOptions, client: {
    models: { generateContent: async () => ({}), embedContent: async () => ({ embeddings: [{ values: [1, 0] }] }) },
  } });
  await assert.rejects(invalid.embedTexts(["one", "two"]), { code: "INVALID_EMBEDDING" });
});

test("server runtime and model IDs are enforced before requests", () => {
  assert.throws(() => createGeminiProvider({ model: "https://example.invalid", client: client(async () => ({})) }), { code: "INVALID_CONFIG" });
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
  try { assert.throws(() => createGeminiProvider({ client: client(async () => ({})) }), { code: "INVALID_CONFIG" }); }
  finally { Reflect.deleteProperty(globalThis, "window"); }
});

test("real SDK transport stays on official endpoint and uses server key header", async () => {
  const previousFetch = globalThis.fetch;
  const previousBase = process.env.GOOGLE_GEMINI_BASE_URL;
  let called = false;
  process.env.GOOGLE_GEMINI_BASE_URL = "https://example.invalid";
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    called = true;
    const requestURL = new URL(typeof url === "string" || url instanceof URL ? url : url.url);
    assert.equal(requestURL.hostname, "generativelanguage.googleapis.com");
    assert.equal(requestURL.searchParams.has("key"), false);
    assert.equal(new Headers(init?.headers).get("x-goog-api-key"), "unit-test-key");
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ keyword: "how to build a reading routine" }) }] } }] }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const provider = createGeminiProvider({ ...providerOptions, apiKey: "unit-test-key" });
    assert.equal(await provider.proposeKeyword({ ...input, avoidPhrases: [] }), "how to build a reading routine");
    assert.equal(called, true);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousBase === undefined) delete process.env.GOOGLE_GEMINI_BASE_URL;
    else process.env.GOOGLE_GEMINI_BASE_URL = previousBase;
  }
});


test("generated slugs remain compatible with persisted history limits", () => {
  assert.equal(generatedPostSchema.safeParse({ ...fixture(), slug: "a".repeat(80) }).success, true);
  assert.equal(generatedPostSchema.safeParse({ ...fixture(), slug: "a".repeat(81) }).success, false);
  assert.equal(geminiResponseSchema.properties.slug.maxLength, 80);
});
