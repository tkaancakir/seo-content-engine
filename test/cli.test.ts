import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runLocal } from "../src/cli.js";
import { parseHistory } from "../src/config.js";
import { samplePost } from "../examples/sample-post.js";
import type { ContentProvider } from "../src/types.js";

const config = JSON.parse(await readFile(new URL("../examples/config.json", import.meta.url), "utf8"));
const provider: ContentProvider = {
  async proposeKeyword() { return "evde hobi malzeme seçimi"; },
  async generateDraft() { return structuredClone(samplePost); },
  async embedTexts(texts) { return texts.map(() => [1, 0]); },
};
async function temporary(fn: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "seo-engine-test-"));
  try { await writeFile(join(root, "config.json"), JSON.stringify(config)); await fn(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}
function input(root: string, override: Partial<Parameters<typeof runLocal>[0]> = {}) {
  return { configPath: join(root, "config.json"), historyPath: join(root, "history.json"), outPath: join(root, "draft.json"), provider, ...override };
}
test("local run persists draft and scoped history with private permissions", async () => temporary(async root => {
  const result = await runLocal(input(root));
  assert.equal(result.status, "draft");
  const draft = JSON.parse(await readFile(join(root, "draft.json"), "utf8"));
  const history = JSON.parse(await readFile(join(root, "history.json"), "utf8"));
  assert.equal(history.projectId, config.projectId);
  assert.equal(parseHistory(history.posts)[0]?.slug, draft.post.slug);
  assert.equal((await stat(join(root, "draft.json"))).mode & 0o777, 0o600);
  assert.equal((await stat(join(root, "history.json"))).mode & 0o777, 0o600);
  await assert.rejects(stat(join(root, "history.json.lock")), { code: "ENOENT" });
}));
test("different project history is rejected without a provider call", async () => temporary(async root => {
  let calls = 0;
  await writeFile(join(root, "history.json"), JSON.stringify({ projectId: "another-project", posts: [] }));
  await assert.rejects(runLocal(input(root, { provider: { ...provider, async proposeKeyword() { calls++; return "anything"; } } })), { code: "INVALID_HISTORY" });
  assert.equal(calls, 0);
  await assert.rejects(stat(join(root, "draft.json")), { code: "ENOENT" });
}));
test("existing output survives and stops generation before paid work", async () => temporary(async root => {
  let calls = 0;
  await writeFile(join(root, "draft.json"), "keep-existing");
  await assert.rejects(runLocal(input(root, { provider: { ...provider, async proposeKeyword() { calls++; return "anything"; } } })), { code: "EEXIST" });
  assert.equal(calls, 0);
  assert.equal(await readFile(join(root, "draft.json"), "utf8"), "keep-existing");
}));
test("same history lock blocks second local run and recovers after completion", async () => temporary(async root => {
  let started!: () => void;
  const start = new Promise<void>(resolve => { started = resolve; });
  let finish!: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  const first = runLocal(input(root, { provider: { ...provider, async proposeKeyword() { started(); await gate; return "evde hobi malzeme seçimi"; } } }));
  await start;
  await assert.rejects(runLocal(input(root, { outPath: join(root, "second.json") })), { code: "EEXIST" });
  finish();
  await first;
  await assert.rejects(stat(join(root, "history.json.lock")), { code: "ENOENT" });
}));
test("failed provider leaves no partial draft or history", async () => temporary(async root => {
  await assert.rejects(runLocal(input(root, { provider: { ...provider, async generateDraft() { throw new Error("private diagnostic data"); } } })), { code: "PROVIDER_ERROR" });
  for (const name of ["draft.json", "history.json", "history.json.lock"]) await assert.rejects(stat(join(root, name)), { code: "ENOENT" });
}));
test("config/history/output path overlap is rejected", async () => temporary(async root => {
  const before = await readFile(join(root, "config.json"), "utf8");
  await assert.rejects(runLocal(input(root, { historyPath: join(root, "config.json") })), { code: "INVALID_CONFIG" });
  assert.equal(await readFile(join(root, "config.json"), "utf8"), before);
}));
test("full history stops before provider calls and leaves history unchanged", async () => temporary(async root => {
  let calls = 0;
  const posts = Array.from({ length: 10_000 }, (_, i) => ({ title: "Previous topic", excerpt: "A previous article.", slug: `post-${i}` }));
  const before = JSON.stringify({ projectId: config.projectId, posts });
  await writeFile(join(root, "history.json"), before);
  await assert.rejects(runLocal(input(root, { provider: { ...provider, async embedTexts() { calls++; return []; } } })), { code: "INVALID_HISTORY" });
  assert.equal(calls, 0);
  assert.equal(await readFile(join(root, "history.json"), "utf8"), before);
  await assert.rejects(stat(join(root, "draft.json")), { code: "ENOENT" });
}));
