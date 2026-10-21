import { parseConfig, parseHistory } from "./config.js";
import { EngineError, safeError } from "./errors.js";
import { generatedPostSchema, proposedKeywordSchema } from "./schema.js";
import type { ContentProvider, DraftResult, EngineConfig, ExistingPost } from "./types.js";

function normalized(value: string, locale: string): string {
  try { return value.normalize("NFKC").toLocaleLowerCase(locale).replace(/\s+/g, " ").trim(); }
  catch { throw new EngineError("INVALID_CONFIG"); }
}
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length || !a.every(Number.isFinite) || !b.every(Number.isFinite)) {
    throw new EngineError("INVALID_EMBEDDING");
  }
  const normA = Math.hypot(...a);
  const normB = Math.hypot(...b);
  if (!normA || !normB || !Number.isFinite(normA) || !Number.isFinite(normB)) throw new EngineError("INVALID_EMBEDDING");
  const dot = a.reduce((sum, x, i) => sum + (x / normA) * (b[i]! / normB), 0);
  return Math.max(-1, Math.min(1, dot));
}
async function embeddings(provider: ContentProvider, texts: string[]): Promise<number[][]> {
  const vectors = await provider.embedTexts(texts);
  if (!Array.isArray(vectors) || vectors.length !== texts.length) throw new EngineError("INVALID_EMBEDDING");
  const dimension = vectors[0]?.length;
  if (!dimension || dimension > 10_000) throw new EngineError("INVALID_EMBEDDING");
  for (const vector of vectors) {
    if (!Array.isArray(vector) || vector.length !== dimension) throw new EngineError("INVALID_EMBEDDING");
    cosineSimilarity(vector, vector);
  }
  return vectors;
}
function maximumSimilarity(candidate: number[], existing: number[][]): number {
  return existing.reduce((max, vector) => Math.max(max, cosineSimilarity(candidate, vector)), 0);
}
function chooseCell(config: EngineConfig, history: ExistingPost[], excluded: Set<string>) {
  const usage = new Map<string, number>();
  for (const post of history) {
    const key = `${post.pillarId}::${post.facetId}`;
    usage.set(key, (usage.get(key) ?? 0) + 1);
  }
  const cells = config.pillars.flatMap(pillar => config.facets.map(facet => ({ pillar, facet, key: `${pillar.id}::${facet.id}` })));
  const remaining = cells.filter(cell => !excluded.has(cell.key));
  return (remaining.length ? remaining : cells).sort((a, b) => (usage.get(a.key) ?? 0) - (usage.get(b.key) ?? 0))[0]!;
}
function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectStrings);
  return [];
}
function phrasePresent(text: string, phrase: string, locale: string): boolean {
  const escaped = normalized(phrase, locale).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}($|[^\\p{L}\\p{N}_])`, "u").test(text);
}

/** Produces review-only drafts. It has no publication, database or scheduler capability. */
export async function generateContent(input: { config: unknown; history: unknown; provider: ContentProvider }): Promise<DraftResult> {
  try {
    const config = parseConfig(input.config);
    const history = parseHistory(input.history);
    const { provider } = input;
    normalized("validate-locale", config.brand.locale);
    const usedKeywords = new Set(history.flatMap(post => post.targetKeyword ? [normalized(post.targetKeyword, config.brand.locale)] : []));
    const existingKeywordTexts = history.flatMap(post => post.targetKeyword ? [post.targetKeyword] : []);
    // Compute reference embeddings once, never treat an invalid response as a successful check.
    const keywordVectors = existingKeywordTexts.length ? await embeddings(provider, existingKeywordTexts) : [];
    const articleVectors = history.length ? await embeddings(provider, history.map(post => `${post.title}\n${post.excerpt}`)) : [];
    const triedCells = new Set<string>();
    const rejectedKeywords: string[] = [];
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      const { pillar, facet, key } = chooseCell(config, history, triedCells);
      triedCells.add(key);
      const proposed = proposedKeywordSchema.safeParse({ keyword: await provider.proposeKeyword({ config, pillar, facet, avoidPhrases: [...existingKeywordTexts, ...rejectedKeywords] }) });
      if (!proposed.success) throw new EngineError("INVALID_DRAFT");
      const targetKeyword = proposed.data.keyword.trim();
      rejectedKeywords.push(targetKeyword);
      if (usedKeywords.has(normalized(targetKeyword, config.brand.locale))) continue;
      const keywordSimilarity = keywordVectors.length ? maximumSimilarity((await embeddings(provider, [targetKeyword]))[0]!, keywordVectors) : 0;
      if (keywordSimilarity >= config.keywordThreshold) continue;
      const parsed = generatedPostSchema.safeParse(await provider.generateDraft({ config, pillar, facet, targetKeyword, existingTitles: history.map(post => post.title) }));
      if (!parsed.success) throw new EngineError("INVALID_DRAFT");
      const post = parsed.data;
      const maxSimilarity = articleVectors.length ? maximumSimilarity((await embeddings(provider, [`${post.title}\n${post.excerpt}`]))[0]!, articleVectors) : 0;
      if (maxSimilarity >= config.duplicateThreshold) continue;
      const baseSlug = post.slug;
      const usedSlugs = new Set(history.map(item => item.slug));
      let suffix = 2;
      while (usedSlugs.has(post.slug)) post.slug = `${baseSlug.slice(0, 70).replace(/-+$/, "")}-${suffix++}`;
      post.keywords = [targetKeyword, ...post.keywords.filter(value => normalized(value, config.brand.locale) !== normalized(targetKeyword, config.brand.locale))].slice(0, 10);
      if (!generatedPostSchema.safeParse(post).success) throw new EngineError("INVALID_DRAFT");
      const fullText = normalized(collectStrings(post).join("\n"), config.brand.locale);
      const reviewReasons = ["editorial-review"];
      if (pillar.riskTier === "high") reviewReasons.push("high-risk-topic");
      if (config.blockedPhrases.some(phrase => phrasePresent(fullText, phrase, config.brand.locale))) reviewReasons.push("blocked-phrase");
      return {
        projectId: config.projectId, status: "draft", reviewRequired: true, reviewReasons,
        targetKeyword, pillarId: pillar.id, facetId: facet.id, maxSimilarity, keywordSimilarity,
        attempts: attempt, post, ...(config.requiredNotice ? { requiredNotice: config.requiredNotice } : {}),
      };
    }
    throw new EngineError("NO_UNIQUE_TOPIC");
  } catch (error) { throw safeError(error); }
}
