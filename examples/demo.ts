import { readFile } from "node:fs/promises";
import { generateContent } from "../src/index.js";
import { toMarkdown } from "../src/adapters/index.js";
import { samplePost } from "./sample-post.js";
const config = JSON.parse(await readFile(new URL("./config.json", import.meta.url), "utf8"));
const draft = await generateContent({ config, history: [], provider: {
  async proposeKeyword() { return "choosing supplies for home crafts"; },
  async generateDraft() { return structuredClone(samplePost); },
  async embedTexts(texts) { return texts.map(() => [1, 0]); },
} });
console.log("Offline demo — synthetic content, no API call.\n");
console.log(toMarkdown(draft));
