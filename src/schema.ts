import { z } from "zod";

// Every generated field is plain text. Renderers must still escape it for their
// output format; accepting a string is never permission to insert raw HTML.
function text(min: number, max: number) {
  return z.string().trim().min(min).max(max).refine(
    (value) => !/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(value),
    "Plain text without HTML or control characters is required.",
  );
}
const questionAnswer = z.object({ question: text(1, 300), answer: text(1, 4000) }).strict();

export const generatedPostSchema = z.object({
  title: text(10, 90),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: text(80, 220),
  metaTitle: text(10, 65),
  metaDescription: text(100, 165),
  keywords: z.array(text(1, 120)).min(4).max(10),
  tags: z.array(text(1, 80)).min(3).max(6),
  introParagraphs: z.array(text(1, 4000)).min(2).max(3),
  definition: questionAnswer,
  bodyParagraphs: z.array(text(1, 6000)).min(4).max(6),
  faqItems: z.array(questionAnswer).min(3).max(5),
}).strict();

export const proposedKeywordSchema = z.object({ keyword: text(8, 120) }).strict();

const stringSchema = (minLength: number, maxLength: number) => ({ type: "string", minLength, maxLength });
const pairSchema = {
  type: "object", additionalProperties: false,
  properties: { question: stringSchema(1, 300), answer: stringSchema(1, 4000) },
  required: ["question", "answer"],
};
const arraySchema = (items: unknown, minItems: number, maxItems: number) => ({ type: "array", items, minItems, maxItems });
export const geminiResponseSchema = {
  type: "object", additionalProperties: false,
  properties: {
    title: stringSchema(10, 90),
    slug: { type: "string", minLength: 1, maxLength: 80, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
    excerpt: stringSchema(80, 220),
    metaTitle: stringSchema(10, 65),
    metaDescription: stringSchema(100, 165),
    keywords: arraySchema(stringSchema(1, 120), 4, 10),
    tags: arraySchema(stringSchema(1, 80), 3, 6),
    introParagraphs: arraySchema(stringSchema(1, 4000), 2, 3),
    definition: pairSchema,
    bodyParagraphs: arraySchema(stringSchema(1, 6000), 4, 6),
    faqItems: arraySchema(pairSchema, 3, 5),
  },
  required: ["title", "slug", "excerpt", "metaTitle", "metaDescription", "keywords", "tags", "introParagraphs", "definition", "bodyParagraphs", "faqItems"],
};
export const geminiKeywordResponseSchema = {
  type: "object", additionalProperties: false,
  properties: { keyword: stringSchema(8, 120) }, required: ["keyword"],
};
