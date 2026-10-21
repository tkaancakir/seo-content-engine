import { createHash, timingSafeEqual } from "node:crypto";
import { safeError } from "../errors.js";
import type { DraftResult } from "../types.js";

const escapeMarkdown = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/([\\`*_{}\[\]()#+.!|~-])/g, "\\$1");
/** Frontmatter is JSON-quoted; plain-text model fields cannot inject HTML or Markdown links. */
export function toMarkdown(draft: DraftResult): string {
  const post = draft.post;
  const fields = { title: post.title, slug: post.slug, status: "draft", reviewRequired: true, metaTitle: post.metaTitle, metaDescription: post.metaDescription, keywords: post.keywords };
  const frontmatter = Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n");
  const paragraph = (text: string) => escapeMarkdown(text).replace(/\r?\n/g, " ");
  return `---\n${frontmatter}\n---\n\n# ${paragraph(post.title)}\n\n${[
    ...post.introParagraphs.map(paragraph),
    `## ${paragraph(post.definition.question)}\n\n${paragraph(post.definition.answer)}`,
    ...post.bodyParagraphs.map(paragraph),
    ...post.faqItems.map(item => `## ${paragraph(item.question)}\n\n${paragraph(item.answer)}`),
    ...(draft.requiredNotice ? [paragraph(draft.requiredNotice)] : []),
  ].join("\n\n")}\n`;
}
/** Generic Payload-style draft fields. Map body/category to your own collection schema. */
export function toPayloadDraft(draft: DraftResult) {
  return {
    title: draft.post.title, slug: draft.post.slug, excerpt: draft.post.excerpt,
    status: "draft" as const,
    seo: { metaTitle: draft.post.metaTitle, metaDescription: draft.post.metaDescription, keywords: draft.post.keywords.map(value => ({ value })) },
    automationMeta: { pillarId: draft.pillarId, facetId: draft.facetId },
    content: draft.post,
    requiredNotice: draft.requiredNotice,
    reviewReasons: draft.reviewReasons,
  };
}
export function authorizeCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.trim() !== secret || secret.length < 32 || !header?.startsWith("Bearer ")) return false;
  const token = header.slice(7);
  return timingSafeEqual(createHash("sha256").update(token).digest(), createHash("sha256").update(secret).digest());
}
/** Process-local concurrency guard only. Hosting apps must supply durable locks/idempotency. */
export function createCronHandler(run: () => Promise<DraftResult>, secret: string | undefined) {
  let running = false;
  return async (request: Request): Promise<Response> => {
    if (!authorizeCron(request.headers.get("authorization"), secret)) return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    if (request.method !== "POST") return Response.json({ ok: false, error: "METHOD_NOT_ALLOWED" }, { status: 405, headers: { Allow: "POST" } });
    if (running) return Response.json({ ok: false, error: "RUN_IN_PROGRESS" }, { status: 409 });
    running = true;
    try {
      const result = await run();
      return Response.json({ ok: true, slug: result.post.slug, status: "draft", reviewRequired: true });
    } catch (error) {
      return Response.json({ ok: false, error: safeError(error).code }, { status: 500 });
    } finally { running = false; }
  };
}
