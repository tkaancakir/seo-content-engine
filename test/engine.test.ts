import assert from "node:assert/strict";
import test from "node:test";
import { generateContent, cosineSimilarity } from "../src/engine.js";
import { parseHistory } from "../src/config.js";
import { EngineError } from "../src/errors.js";
import { generatedPostSchema } from "../src/schema.js";
import type { ContentProvider, EngineConfig, ExistingPost, GeneratedPost } from "../src/types.js";

function config(): EngineConfig {
  return {
    projectId: "sample-project",
    brand: { name: "Example Studio", audience: "Curious readers", locale: "en", tone: "Clear and measured" },
    pillars: [{ id: "planning", label: "Planning", riskTier: "normal" }],
    facets: [{ id: "guide", description: "A practical guide" }],
    editorialRules: [], blockedPhrases: [], maxAttempts: 3,
    duplicateThreshold: 0.9, keywordThreshold: 0.93,
  };
}
function post(): GeneratedPost {
  return {
    title: "A practical guide to useful planning", slug: "useful-planning",
    excerpt: "A practical introduction to planning small projects, choosing realistic next steps, and reviewing the results of a first attempt.",
    metaTitle: "Useful planning for small projects",
    metaDescription: "Explore a practical approach to small project planning, with clear priorities, realistic next steps, and thoughtful review questions.",
    keywords: ["small project planning", "practical priorities", "next steps", "weekly review"],
    tags: ["planning", "projects", "learning"],
    introParagraphs: ["Planning begins with a concrete question.", "Choose a small outcome you can observe."],
    definition: { question: "What is a useful plan?", answer: "It connects a clear outcome to a realistic next step." },
    bodyParagraphs: ["Describe the result.", "Choose one next step.", "Allow time to review it.", "Adjust the plan using what you learn."],
    faqItems: [
      { question: "Where should I begin?", answer: "Begin with a small, observable outcome." },
      { question: "How often should I review?", answer: "Review after a meaningful attempt." },
      { question: "Can a plan change?", answer: "Yes. New evidence can justify a change." },
    ],
  };
}
const previous: ExistingPost = {
  title: "An earlier project guide", excerpt: "An existing guide with a different focus.",
  slug: "earlier-guide", targetKeyword: "existing project guide", pillarId: "planning", facetId: "guide",
};
function makeProvider(overrides: Partial<ContentProvider> = {}) {
  const calls = { keywords: 0, drafts: 0, embeddings: [] as string[][] };
  const provider: ContentProvider = {
    async proposeKeyword(input) {
      calls.keywords++;
      return overrides.proposeKeyword ? overrides.proposeKeyword(input) : "new project planning";
    },
    async generateDraft(input) {
      calls.drafts++;
      return overrides.generateDraft ? overrides.generateDraft(input) : post();
    },
    async embedTexts(texts) {
      calls.embeddings.push([...texts]);
      if (overrides.embedTexts) return overrides.embedTexts(texts);
      return texts.map(text => text === previous.targetKeyword || text === `${previous.title}\n${previous.excerpt}` ? [1, 0] : [0, 1]);
    },
  };
  return { provider, calls };
}
function code(expected: string) {
  return (error: unknown) => {
    assert.ok(error instanceof EngineError);
    assert.equal(error.code, expected);
    return true;
  };
}

test("normalized exact keyword duplicates exhaust a bounded budget without drafting", async () => {
  const { provider, calls } = makeProvider({ proposeKeyword: async () => "  EXISTING   PROJECT GUIDE  " });
  await assert.rejects(generateContent({ config: config(), history: [previous], provider }), code("NO_UNIQUE_TOPIC"));
  assert.equal(calls.keywords, 3);
  assert.equal(calls.drafts, 0);
  assert.equal(calls.embeddings.length, 2, "only the cached reference batches are needed");
});

test("the final semantically duplicate article is rejected instead of accepted as a fallback", async () => {
  let attempt = 0;
  const { provider, calls } = makeProvider({
    proposeKeyword: async () => `different planning question ${++attempt}`,
    embedTexts: async texts => texts.map(text => text.startsWith("different planning question") ? [0, 1] : [1, 0]),
  });
  await assert.rejects(generateContent({ config: config(), history: [previous], provider }), code("NO_UNIQUE_TOPIC"));
  assert.equal(calls.keywords, 3);
  assert.equal(calls.drafts, 3);
});

test("keyword similarity rejects a proposal before spending an article generation call", async () => {
  const { provider, calls } = makeProvider({ embedTexts: async texts => texts.map(() => [1, 0]) });
  await assert.rejects(generateContent({ config: config(), history: [previous], provider }), code("NO_UNIQUE_TOPIC"));
  assert.equal(calls.keywords, 3);
  assert.equal(calls.drafts, 0);
});

for (const [label, vectors] of [
  ["missing batch", undefined], ["missing vector", []], ["extra vector", [[1, 0], [1, 0]]],
  ["empty vector", [[]]], ["zero vector", [[0, 0]]], ["NaN coordinate", [[Number.NaN, 1]]],
  ["infinite coordinate", [[Infinity, 1]]], ["non-array vector", [null]],
] as const) {
  test(`invalid reference embedding fails closed: ${label}`, async () => {
    const { provider, calls } = makeProvider({ embedTexts: async () => vectors as unknown as number[][] });
    await assert.rejects(generateContent({ config: config(), history: [previous], provider }), code("INVALID_EMBEDDING"));
    assert.equal(calls.keywords, 0);
    assert.equal(calls.drafts, 0);
  });
}

test("mixed dimensions within a reference batch fail closed", async () => {
  const { provider, calls } = makeProvider({ embedTexts: async () => [[1, 0], [1, 0, 0]] });
  const second = { ...previous, slug: "second-guide", targetKeyword: "second existing guide" };
  await assert.rejects(generateContent({ config: config(), history: [previous, second], provider }), code("INVALID_EMBEDDING"));
  assert.equal(calls.keywords, 0);
});

test("candidate embedding dimension mismatch cannot bypass the duplicate gate", async () => {
  const { provider, calls } = makeProvider({
    embedTexts: async texts => texts.map(text => text === "new project planning" ? [0, 1, 0] : [1, 0]),
  });
  await assert.rejects(generateContent({ config: config(), history: [previous], provider }), code("INVALID_EMBEDDING"));
  assert.equal(calls.drafts, 0);
});

test("cosine similarity rejects invalid vectors and handles very large finite values", () => {
  for (const pair of [[[], []], [[0, 0], [1, 0]], [[1, 0], [1]], [[NaN, 1], [1, 0]]] as [number[], number[]][]) {
    assert.throws(() => cosineSimilarity(...pair), code("INVALID_EMBEDDING"));
  }
  assert.ok(Math.abs(cosineSimilarity([1e300, 1e300], [1e300, 1e300]) - 1) < 1e-12);
});

for (const [label, getInput, expectedCode] of [
  ["empty config", () => ({ config: {}, history: [] }), "INVALID_CONFIG"],
  ["duplicate pillar IDs", () => { const c = config(); c.pillars.push({ ...c.pillars[0]! }); return { config: c, history: [] }; }, "INVALID_CONFIG"],
  ["invalid locale", () => { const c = config(); c.brand.locale = "invalid_locale"; return { config: c, history: [] }; }, "INVALID_CONFIG"],
  ["unknown secret-bearing config field", () => ({ config: { ...config(), apiKey: "synthetic-config-secret" }, history: [] }), "INVALID_CONFIG"],
  ["invalid history", () => ({ config: config(), history: [{ title: "Missing required fields" }] }), "INVALID_HISTORY"],
  ["non-array history", () => ({ config: config(), history: {} }), "INVALID_HISTORY"],
] as const) {
  test(`${label} is rejected before any provider invocation`, async () => {
    const { provider, calls } = makeProvider();
    await assert.rejects(generateContent({ ...getInput(), provider }), code(expectedCode));
    assert.deepEqual(calls, { keywords: 0, drafts: 0, embeddings: [] });
  });
}

for (const stage of ["proposeKeyword", "generateDraft", "embedTexts"] as const) {
  test(`${stage} provider errors cannot disclose raw messages, stack, or causes`, async () => {
    const secret = "synthetic-provider-credential-value";
    const fail = async () => { throw new Error(`Authorization rejected: ${secret}`, { cause: { request: { authorization: secret } } }); };
    const { provider } = makeProvider({ [stage]: fail });
    await assert.rejects(generateContent({ config: config(), history: stage === "embedTexts" ? [previous] : [], provider }), error => {
      assert.ok(error instanceof EngineError);
      assert.equal(error.code, "PROVIDER_ERROR");
      assert.equal(error.message, "Content provider request failed.");
      assert.equal(error.cause, undefined);
      assert.ok(!`${error.message}\n${error.stack}\n${JSON.stringify(error)}`.includes(secret));
      return true;
    });
  });
}

test("high-risk topics stay drafts and receive a mandatory review reason", async () => {
  const c = config(); c.pillars[0]!.riskTier = "high";
  const { provider } = makeProvider();
  const result = await generateContent({ config: c, history: [], provider });
  assert.equal(result.status, "draft");
  assert.equal(result.reviewRequired, true);
  assert.deepEqual(result.reviewReasons, ["editorial-review", "high-risk-topic"]);
});

for (const field of ["metaTitle", "keywords", "tags", "faq"] as const) {
  test(`blocked phrases in ${field} are scanned and cannot trigger publication`, async () => {
    const draft = post();
    if (field === "metaTitle") draft.metaTitle = "An instant guarantee for your plan";
    if (field === "keywords") draft.keywords[1] = "instant guarantee";
    if (field === "tags") draft.tags[1] = "instant guarantee";
    if (field === "faq") draft.faqItems[0]!.question = "Is there an instant guarantee?";
    const c = config(); c.blockedPhrases = ["instant guarantee"];
    const { provider } = makeProvider({ generateDraft: async () => draft });
    const result = await generateContent({ config: c, history: [], provider });
    assert.equal(result.status, "draft");
    assert.equal(result.reviewRequired, true);
    assert.ok(result.reviewReasons.includes("blocked-phrase"));
  });
}

test("slug collision resolution checks all suffixes instead of overwriting an existing article", async () => {
  const history = ["useful-planning", "useful-planning-2", "useful-planning-3"].map(slug => ({ ...previous, slug }));
  const { provider } = makeProvider();
  const result = await generateContent({ config: config(), history, provider });
  assert.equal(result.post.slug, "useful-planning-4");
  assert.equal(new Set(history.map(item => item.slug)).has(result.post.slug), false);
});

test("a long colliding slug truncated at a hyphen remains valid for future history", async () => {
  const baseSlug = `${"a".repeat(69)}-guide`;
  assert.equal(baseSlug[69], "-");
  assert.ok(baseSlug.length > 70);
  const history = [{ ...previous, slug: baseSlug }];
  const { provider } = makeProvider({ generateDraft: async () => ({ ...post(), slug: baseSlug }) });
  const result = await generateContent({ config: config(), history, provider });
  assert.equal(result.post.slug, `${"a".repeat(69)}-2`);
  const nextHistory = parseHistory([
    ...history,
    { title: result.post.title, excerpt: result.post.excerpt, slug: result.post.slug, targetKeyword: result.targetKeyword },
  ]);
  assert.equal(nextHistory[1]!.slug, result.post.slug);
});

test("keyword normalization cannot return a draft with fewer than four keywords", async () => {
  const targetKeyword = "new project planning";
  const draft = { ...post(), keywords: Array<string>(4).fill(targetKeyword) };
  assert.equal(generatedPostSchema.safeParse(draft).success, true, "the provider response passes the initial schema");
  const { provider, calls } = makeProvider({ generateDraft: async () => draft });
  await assert.rejects(generateContent({ config: config(), history: [], provider }), code("INVALID_DRAFT"));
  assert.equal(calls.drafts, 1);
});

test("keyword and article reference embeddings are cached once across retries", async () => {
  let attempt = 0;
  const { provider, calls } = makeProvider({
    proposeKeyword: async () => `fresh planning question ${++attempt}`,
    generateDraft: async () => ({ ...post(), title: `Candidate article number ${attempt}` }),
    embedTexts: async texts => texts.map(text => {
      if (text.startsWith("fresh planning question")) return [0, 1];
      if (text.startsWith("Candidate article number 3")) return [0, 1];
      return [1, 0];
    }),
  });
  const result = await generateContent({ config: config(), history: [previous], provider });
  assert.equal(result.attempts, 3);
  assert.equal(calls.drafts, 3);
  assert.equal(calls.embeddings.filter(texts => texts[0] === previous.targetKeyword).length, 1);
  assert.equal(calls.embeddings.filter(texts => texts[0] === `${previous.title}\n${previous.excerpt}`).length, 1);
  assert.equal(calls.embeddings.length, 8, "two reference batches plus two candidate batches per attempt");
});
