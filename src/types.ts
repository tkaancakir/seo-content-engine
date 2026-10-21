export interface ContentPillar {
  id: string;
  label: string;
  riskTier: "normal" | "high";
}
export interface ContentFacet { id: string; description: string }
export interface EngineConfig {
  projectId: string;
  brand: { name: string; audience: string; locale: string; tone: string };
  pillars: ContentPillar[];
  facets: ContentFacet[];
  editorialRules: string[];
  blockedPhrases: string[];
  requiredNotice?: string;
  maxAttempts: number;
  duplicateThreshold: number;
  keywordThreshold: number;
}
export interface GeneratedPost {
  title: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  tags: string[];
  introParagraphs: string[];
  definition: { question: string; answer: string };
  bodyParagraphs: string[];
  faqItems: Array<{ question: string; answer: string }>;
}
export interface ExistingPost {
  title: string;
  excerpt: string;
  slug: string;
  targetKeyword?: string;
  pillarId?: string;
  facetId?: string;
}
export interface KeywordInput {
  config: EngineConfig;
  pillar: ContentPillar;
  facet: ContentFacet;
  avoidPhrases: string[];
}
export interface DraftInput extends Omit<KeywordInput, "avoidPhrases"> {
  targetKeyword: string;
  existingTitles: string[];
}
export interface ContentProvider {
  proposeKeyword(input: KeywordInput): Promise<string>;
  generateDraft(input: DraftInput): Promise<GeneratedPost>;
  embedTexts(texts: string[]): Promise<number[][]>;
}
export interface DraftResult {
  projectId: string;
  status: "draft";
  reviewRequired: true;
  reviewReasons: string[];
  targetKeyword: string;
  pillarId: string;
  facetId: string;
  maxSimilarity: number;
  keywordSimilarity: number;
  attempts: number;
  post: GeneratedPost;
  requiredNotice?: string;
}
