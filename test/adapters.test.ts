import assert from "node:assert/strict";
import test from "node:test";
import { authorizeCron, createCronHandler, toMarkdown, toPayloadDraft } from "../src/adapters/index.js";
import type { DraftResult } from "../src/types.js";

const secret = "test-".repeat(8);
function draft(): DraftResult {
  return {
    projectId: "example-project", status: "draft", reviewRequired: true, reviewReasons: ["editorial-review"],
    targetKeyword: "useful project planning", pillarId: "planning", facetId: "guide", maxSimilarity: 0, keywordSimilarity: 0, attempts: 1,
    post: {
      title: "Useful planning for small projects", slug: "useful-planning",
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
    },
  };
}
function request(method = "POST", authorization = `Bearer ${secret}`): Request {
  return new Request("https://example.test/api/draft", { method, headers: { authorization } });
}

test("cron authorization requires the exact Bearer scheme and the exact long secret", () => {
  assert.equal(authorizeCron(`Bearer ${secret}`, secret), true);
  assert.equal(authorizeCron(`Bearer ${"x".repeat(32)}`, "x".repeat(32)), true);
  for (const header of [secret, `bearer ${secret}`, `Bearer  ${secret}`, `Bearer ${secret} `, `Bearer ${secret}suffix`, "", null]) {
    assert.equal(authorizeCron(header, secret), false);
  }
  for (const configured of [undefined, "", "short", "x".repeat(31), ` ${secret}`, `${secret} `]) {
    assert.equal(authorizeCron(`Bearer ${configured}`, configured), false);
  }
});

test("unauthorized calls, including missing configuration, never invoke generation", async () => {
  let calls = 0;
  const run = async () => { calls++; return draft(); };
  const handler = createCronHandler(run, secret);
  for (const header of [secret, "Bearer incorrect", ""]) {
    const response = await handler(request("POST", header));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { ok: false, error: "UNAUTHORIZED" });
  }
  assert.equal((await createCronHandler(run, undefined)(request())).status, 401);
  assert.equal(calls, 0);
});

test("only authenticated POST requests can generate a draft", async () => {
  let calls = 0;
  const handler = createCronHandler(async () => { calls++; return draft(); }, secret);
  for (const method of ["GET", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]) {
    const response = await handler(request(method));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "POST");
  }
  assert.equal(calls, 0);
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, slug: "useful-planning", status: "draft", reviewRequired: true });
  assert.equal(calls, 1);
});

test("a second concurrent request receives 409 without executing the runner", async () => {
  let calls = 0;
  let release!: (value: DraftResult) => void;
  const pending = new Promise<DraftResult>(resolve => { release = resolve; });
  const handler = createCronHandler(async () => { calls++; return calls === 1 ? pending : draft(); }, secret);
  const first = handler(request());
  try {
    const second = await handler(request());
    assert.equal(second.status, 409);
    assert.deepEqual(await second.json(), { ok: false, error: "RUN_IN_PROGRESS" });
    assert.equal(calls, 1);
  } finally {
    release(draft());
  }
  assert.equal((await first).status, 200);
  assert.equal((await handler(request())).status, 200, "lock is released after success");
  assert.equal(calls, 2);
});

test("error responses contain no raw provider diagnostics and release the concurrency guard", async () => {
  let calls = 0;
  const privateValue = "synthetic-provider-secret-in-error";
  const handler = createCronHandler(async () => {
    calls++;
    if (calls === 1) throw new Error(`Request failed, credential=${privateValue}`, { cause: privateValue });
    return draft();
  }, secret);
  const failed = await handler(request());
  assert.equal(failed.status, 500);
  const body = await failed.text();
  assert.equal(body.includes(privateValue), false);
  assert.deepEqual(JSON.parse(body), { ok: false, error: "PROVIDER_ERROR" });
  assert.equal((await handler(request())).status, 200, "a failed run must not leave the guard locked");
});

test("Markdown conversion escapes untrusted plain text and injects the exact configured notice", () => {
  const value = draft();
  value.post.title = "Title\n---\nstatus: published";
  value.post.introParagraphs[0] = '<script>alert("example")</script>';
  value.post.bodyParagraphs[0] = "[click](javascript:alert(1)) and **bold**";
  value.requiredNotice = "Review required: <expert> & [editor].";
  const markdown = toMarkdown(value);
  assert.equal(markdown.split("\n").filter(line => line === "---").length, 2, "quoted title cannot close frontmatter");
  assert.ok(markdown.includes('title: "Title\\n---\\nstatus: published"'));
  assert.ok(markdown.includes('status: "draft"'));
  assert.equal(markdown.includes("<script>"), false);
  assert.ok(markdown.includes("&lt;script&gt;"));
  assert.equal(markdown.includes("[click](javascript:alert(1))"), false);
  assert.ok(markdown.includes("\\[click\\]\\(javascript:alert\\(1\\)\\)"));
  assert.ok(markdown.includes("\\*\\*bold\\*\\*"));
  const escapedNotice = "Review required: &lt;expert&gt; &amp; \\[editor\\]\\.";
  assert.equal(markdown.split(escapedNotice).length - 1, 1);
});

test("Payload conversion always creates a generic draft and preserves only supplied content", () => {
  const value = draft();
  value.requiredNotice = "Review before use.";
  (value as unknown as { status: string }).status = "published";
  const payload = toPayloadDraft(value);
  assert.deepEqual(payload, {
    title: value.post.title, slug: value.post.slug, excerpt: value.post.excerpt, status: "draft",
    seo: { metaTitle: value.post.metaTitle, metaDescription: value.post.metaDescription, keywords: value.post.keywords.map(keyword => ({ value: keyword })) },
    automationMeta: { pillarId: value.pillarId, facetId: value.facetId },
    content: value.post, requiredNotice: value.requiredNotice, reviewReasons: value.reviewReasons,
  });
  assert.equal("publishedAt" in payload, false);
  assert.equal("author" in payload, false);
  assert.equal("site" in payload, false);
});
