import { mkdir, readFile, writeFile, open, rename, unlink, realpath } from "node:fs/promises";
import { dirname, resolve, basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { parseConfig, parseHistory } from "./config.js";
import { generateContent } from "./engine.js";
import { createGeminiProvider } from "./providers/gemini.js";
import { EngineError, safeError } from "./errors.js";
import type { ContentProvider, DraftResult } from "./types.js";

async function readJson(file: string): Promise<unknown> { return JSON.parse(await readFile(file, "utf8")); }
async function canonicalFile(file: string): Promise<string> {
  const absolute = resolve(file);
  await mkdir(dirname(absolute), { recursive: true, mode: 0o700 });
  try { return await realpath(absolute); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return join(await realpath(dirname(absolute)), basename(absolute));
  }
}
/** Serializes local runs per history file. Output is exclusive; existing files are never overwritten. */
export async function runLocal(input: { configPath: string; historyPath: string; outPath: string; provider?: ContentProvider }): Promise<DraftResult> {
  const config = parseConfig(await readJson(input.configPath));
  const historyPath = await canonicalFile(input.historyPath);
  const outputPath = await canonicalFile(input.outPath);
  const configPath = await realpath(resolve(input.configPath));
  if (new Set([historyPath, outputPath, configPath]).size !== 3) throw new EngineError("INVALID_CONFIG");
  const lockPath = `${historyPath}.lock`;
  const lock = await open(lockPath, "wx", 0o600);
  const temporary = `${historyPath}.${randomUUID()}.tmp`;
  try {
    let historyData: unknown = { projectId: config.projectId, posts: [] };
    try { historyData = await readJson(historyPath); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if (!historyData || typeof historyData !== "object" || Array.isArray(historyData) || !("projectId" in historyData) || historyData.projectId !== config.projectId || !("posts" in historyData)) throw new EngineError("INVALID_HISTORY");
    const history = parseHistory(historyData.posts);
    if (history.length >= 10_000) throw new EngineError("INVALID_HISTORY");
    // Reserve the output before any paid request and fail if the destination already exists.
    const output = await open(outputPath, "wx", 0o600);
    let outputCompleted = false;
    try {
      const result = await generateContent({ config, history, provider: input.provider ?? createGeminiProvider() });
      await output.writeFile(`${JSON.stringify(result, null, 2)}\n`, "utf8");
      await output.sync();
      outputCompleted = true;
      const posts = [...history, {
        title: result.post.title, excerpt: result.post.excerpt, slug: result.post.slug,
        targetKeyword: result.targetKeyword, pillarId: result.pillarId, facetId: result.facetId,
      }];
      await writeFile(temporary, `${JSON.stringify({ projectId: config.projectId, posts }, null, 2)}\n`, { mode: 0o600, flag: "wx" });
      await rename(temporary, historyPath);
      return result;
    } finally {
      await output.close();
      // Remove only the incomplete output this run exclusively created.
      if (!outputCompleted) await unlink(outputPath).catch(() => {});
    }
  } finally {
    await unlink(temporary).catch(() => {});
    await lock.close();
    await unlink(lockPath);
  }
}
async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("Usage: npm run generate -- --config config/local.json --history data/history.json --out data/draft.json");
    return;
  }
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    if (!["--config", "--history", "--out"].includes(args[i] ?? "") || !args[i + 1] || options.has(args[i]!)) throw new EngineError("INVALID_CONFIG");
    options.set(args[i]!, args[i + 1]!);
  }
  if (options.size !== 3) throw new EngineError("INVALID_CONFIG");
  const draft = await runLocal({ configPath: options.get("--config")!, historyPath: options.get("--history")!, outPath: options.get("--out")! });
  console.log(JSON.stringify({ ok: true, status: draft.status, reviewRequired: true, slug: draft.post.slug }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    const sanitized = error instanceof EngineError ? safeError(error) : new EngineError("IO_ERROR");
    console.error(JSON.stringify({ ok: false, error: sanitized.code, message: sanitized.message }));
    process.exitCode = 1;
  });
}
