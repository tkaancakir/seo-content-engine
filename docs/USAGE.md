# Usage Guide

[Türkçe](USAGE.tr.md)

This guide walks you through running SEO Content Engine on your computer and creating drafts for your own project. Start with the demo, which needs no API key, then connect your own Gemini account when you are ready.

## 1. What does it do?

The engine uses your brand context and topic areas to propose a target search query, then produces a structured draft containing a title, metadata, article body, and frequently asked questions. It checks for similarity to previous drafts.

The result is a JSON file. Every successful result has `status: "draft"` and `reviewRequired: true`. The tool does not install a website, admin panel, or automatic publishing system. You review the content and decide how to add it to your site.

## 2. Requirements and download

- **Node.js 22.12 or later and npm:** Use the [official Node.js download page](https://nodejs.org/en/download) to install the version for your operating system. Choose an installation that includes npm.
- **A terminal:** Terminal on macOS, PowerShell or Command Prompt on Windows, or your terminal application on Linux.
- **Internet access:** Required to install dependencies and make real Gemini requests. After installation, the demo works offline.
- **A Gemini API key:** Required only for real generation. The demo and local tests do not use a key.

Check your installed versions in the terminal:

```sh
node --version
npm --version
```

If `node` is not found, close and reopen your terminal after installation. Your Node version must be `v22.12.0` or later.

If you use Git, download the project with:

```sh
git clone https://github.com/tkaancakir/seo-content-engine.git
cd seo-content-engine
```

Without Git, open the [GitHub repository](https://github.com/tkaancakir/seo-content-engine) and select **Code → Download ZIP**. Extract the ZIP and open a terminal in the extracted folder. You should see `package.json`, `src`, and `examples` in that folder.

**Run every command below from the project folder containing `package.json`.** Paste commands into your terminal, not your web browser or a JavaScript file.

## 3. Install and run the free demo

Install the dependencies:

```sh
npm ci
```

This installs the package versions recorded in the lockfile. Then run:

```sh
npm run demo
```

You should see `Offline demo — synthetic content, no API call.` followed by an example Markdown draft. Its opening metadata includes `status: "draft"` and `reviewRequired: true`.

**The demo does not create files, update history, or connect to Gemini.** It prints prepared sample content, not a live generation result or an SEO performance measurement.

To run the local type checks, tests, and build:

```sh
npm run check
```

A successful run finishes without errors and writes compiled files to `dist/`. This does not verify your live API access, account quota, or model availability.

## 4. Configure your project

In your file manager, create a `config` folder inside the project. Copy `examples/config.json` into it and name the copy **`local.json`**. On macOS/Linux, you can do the same in your terminal:

```sh
mkdir -p config
cp examples/config.json config/local.json
```

Open `config/local.json` in a text editor. Start by changing `projectId`, `brand`, `pillars`, and `facets`. You can leave the other settings at their sample values for your first run.

A **pillar** is a topic area; a **facet** is the angle or kind of question to explore within that topic. For example, “choosing materials” is a topic area, while “a first-time beginner's question” is a facet. The engine selects the combination used least often in your history.

Use double quotes in JSON. Do not add comments or trailing commas. Unknown fields are rejected during validation.

| Field | Meaning and accepted values |
| --- | --- |
| `projectId` | Required project identifier, 1–80 characters. Use lowercase Latin letters, digits, and single hyphens between words, such as `example-workshop`. Keep it unchanged once you start using history. |
| `brand.name` | Required brand name, 1–10,000 characters after trimming whitespace. |
| `brand.audience` | Required description of the intended audience, 1–10,000 characters. |
| `brand.tone` | Required writing style, 1–10,000 characters. |
| `brand.locale` | A valid language/locale tag, such as `en` or `tr`, 2–40 characters. Defaults to `en` when omitted. |
| `pillars` | 1–100 topic areas. Each item needs a unique `id` and a `label` of 1–10,000 characters. IDs follow the same format rules as the project identifier. |
| `pillars[].riskTier` | `normal` or `high`; defaults to `normal`. `high` adds a review reason to the result. Both values produce drafts only. |
| `facets` | 1–30 question angles. Each item needs a unique `id` and a `description` of 1–10,000 characters. IDs follow the same format rules as the project identifier. |
| `editorialRules` | Up to 100 writing rules, each 1–10,000 characters. Defaults to an empty list. These are model instructions, not a guarantee of accuracy. |
| `blockedPhrases` | Up to 100 phrases, each 1–200 characters. Defaults to an empty list. A match adds a review reason; it does not cause publication. |
| `requiredNotice` | Optional fixed notice, 1–10,000 characters. It is kept separate from model-generated text and included in the Markdown export. |
| `maxAttempts` | An integer from 1 to 5 for topic/query attempts; defaults to `3`. The provider also has separate format-correction retries, so this is not a cap on the total number of API requests. |
| `duplicateThreshold` | Title-and-excerpt similarity threshold from `0.5` to `1`; defaults to `0.9`. A candidate is rejected when its score is greater than or equal to the threshold. |
| `keywordThreshold` | Target-query similarity threshold from `0.5` to `1`; defaults to `0.93`. A query is rejected when its score is greater than or equal to the threshold. |

Lower thresholds make the similarity check stricter; higher thresholds allow more similar candidates through. Start with the defaults. Article similarity compares **titles and excerpts**, not the full article bodies.

## 5. Add your own API key

Follow [Google's Gemini API key guide](https://ai.google.dev/gemini-api/docs/api-key) to create a key in your own account. Check your account's access, quota, and billing conditions.

Copy `.env.example` in the project root to **`.env`** in the same folder. Make sure the filename is not `.env.txt`. On macOS/Linux:

```sh
cp .env.example .env
```

Open `.env` in a text editor and paste your key after the equals sign on the empty `GEMINI_API_KEY=` line. Do not put the key in a terminal command, GitHub issue, screenshot, or project configuration file.

The same file contains the model settings:

| Setting | Purpose | Initial value |
| --- | --- | --- |
| `GEMINI_MODEL` | Article drafting | `gemini-2.5-flash` |
| `GEMINI_KEYWORD_MODEL` | Target-query proposal | `gemini-2.5-flash-lite` |
| `GEMINI_EMBEDDING_MODEL` | Similarity vectors | `gemini-embedding-001` |

These defaults are retained for compatibility with the original engine. Do not assume they are currently available to your account; replace them with accessible model IDs when needed. You do not need to fill in `CRON_SECRET` for CLI use.

Git ignores `.env`, `config/`, and `data/`. Still inspect your files before uploading anything, and do not bypass those exclusions with `git add -f`. See the [security policy](../SECURITY.md).

## 6. Generate your first real draft

**This step makes API requests using your own Gemini account and may incur charges or consume quota.** Brand context, rules, target queries, and relevant text from your history are sent to the provider. Do not include confidential client data.

Run this from the project folder:

```sh
node --env-file=.env --import tsx src/cli.ts --config config/local.json --history data/history.json --out data/draft-001.json
```

On first use, the tool creates `data/` and the history file if they do not exist. The arguments mean:

- `--config`: The project configuration to use.
- `--history`: The JSON file containing previous titles, excerpts, slugs, target queries, and topic information.
- `--out`: A **new** file path where this run's complete draft will be saved.

A successful run prints `ok: true`, `status: "draft"`, `reviewRequired: true`, and the generated `slug`. Read the full article in `data/draft-001.json`; the terminal prints only a short status result.

For your second draft, keep the same configuration and history, but change the output to `data/draft-002.json`. Existing output files are never overwritten. Resetting history on every run removes the information needed to check for repeats.

If the key is already set as a server environment variable, you can use this alternative. It does not load `.env` automatically:

```sh
npm run generate -- --config config/local.json --history data/history.json --out data/draft-003.json
```

For command help, run `npm run generate -- --help`.

## 7. Understand the result and use multiple projects

| Result field | How to read it |
| --- | --- |
| `post` | Title, slug, excerpt, metadata, keywords, tags, introduction, definition, body paragraphs, and FAQ. |
| `reviewReasons` | Always includes `editorial-review`. Adds `high-risk-topic` when the selected pillar is flagged, and `blocked-phrase` when a configured phrase is found. |
| `targetKeyword` | A proposed target search query, not measured search volume or ranking data. |
| `pillarId`, `facetId` | The selected topic area and question angle. |
| `maxSimilarity`, `keywordSimilarity` | Similarity scores for this run, not success percentages or proof of uniqueness. They are `0` when there is no relevant history to compare. |
| `attempts` | The number of topic attempts used, not the total API request count or cost. |

Review the sources, claims, brand voice, and any links you need to add. Changing the draft status in the JSON does not publish anything to a website. The Markdown export does not carry every review reason, so keep the source JSON and inspect its `reviewReasons` too.

Use a different `projectId`, configuration, and history file for each project. For example, pair `config/project-a.json` with `data/project-a-history.json`, and use `config/project-b.json` with `data/project-b-history.json` for another project. The tool stops if the history's project identifier does not match.

History includes unpublished drafts. It accepts up to 10,000 records; the CLI will not start another generation once that limit is reached. Plan how to archive records and retain duplicate-check coverage instead of deleting history indiscriminately.

## 8. Export Markdown and connect a CMS

First run `npm run build`. Then create a file named `export-draft.mjs` in the project root with this code:

```js
import { readFile, writeFile } from 'node:fs/promises';
import { toMarkdown, toPayloadDraft } from './dist/src/adapters/index.js';

const draft = JSON.parse(await readFile('data/draft-001.json', 'utf8'));
await writeFile('data/draft-001.md', toMarkdown(draft), { flag: 'wx' });
const payloadDocument = toPayloadDraft(draft);
await writeFile('data/payload-draft-001.json', JSON.stringify(payloadDocument, null, 2), { flag: 'wx' });
```

Run `node export-draft.mjs` to create two new local files from the existing JSON. This makes no API requests. It fails rather than overwriting existing files. Backslashes before some punctuation in the Markdown are text-escaping characters.

`toMarkdown(draft)` returns Markdown text; it does not render HTML. `toPayloadDraft(draft)` returns a generic draft object; it does not connect to a Payload database. Map the fields to your own collection schema, review the content, and implement saving and publishing separately in your application.

In your own server code, use `generateContent`, `createGeminiProvider`, and the exported types through `./dist/src/index.js`. A library call does not write files or update history on its own; the CLI provides that behavior.

`createCronHandler(run, secret)` is an integration helper, not a server or scheduler. It requires `POST`, an exact `Authorization: Bearer ...` header, and a separate secret of at least 32 characters. Its concurrency protection works only within one process. Multiple workers or servers need durable locking and idempotency to prevent the same job from running twice.

## 9. Troubleshooting

On failure, the CLI prints `ok: false`, an `error` code, and a generic message. Never include `.env` or your actual key when sharing an error report.

| Code or symptom | What to check |
| --- | --- |
| `npm` / `node` not found | Check your Node installation and reopen the terminal. |
| `package.json` not found | Make sure the terminal is in the project root. |
| `MISSING_API_KEY` | Check the key field in `.env` and that the command includes `--env-file=.env`. |
| `INVALID_CONFIG` | Check JSON field names, identifier format, required fields, duplicate topic IDs, and the limits above. The three file paths must be distinct. |
| `INVALID_HISTORY` | Check that history belongs to this project, its records are valid, and it has not reached the 10,000-record limit. Do not work around it by emptying the file. |
| `INVALID_DRAFT` | The model output did not meet the required structure or field validation. Review the configuration and model; retrying can incur more API charges. |
| `INVALID_EMBEDDING` | Similarity vectors were missing or invalid. Check model access; the duplicate check did not complete successfully. |
| `NO_UNIQUE_TOPIC` | No suitable distinct topic was found within the attempt limit. Expand the topic areas or question angles rather than deleting history. |
| `PROVIDER_ERROR` | Check key permissions, quota, network access, and selected models. Raw provider responses are intentionally hidden because they may contain secrets. |
| `IO_ERROR` | Check file paths, JSON syntax, write permissions, an existing output file, or a history lock. A lower-level `EEXIST` error may appear as this generic CLI code. |

If `data/draft-001.json` already exists, choose a new `--out` path. If another run is using the same history, wait for it to finish. The lock filename is the history path plus `.lock`, such as `data/history.json.lock`.

**After an interrupted run:** first confirm that the relevant terminal or server job has actually stopped. The draft may have been written before history was updated. Back up and compare the draft and history; if a complete draft exists, safely reconcile its corresponding history entry before retrying. Do not count empty or partial output as a successful generation. Remove only that run's stale lock once you have confirmed no run is active and understand the state of the files. Do not delete all `.lock` files or the `data/` directory.

## 10. Before publishing your content

Read the draft and verify unsupported claims and sources. The tool does not provide research data or guarantee rankings or factual accuracy. Automatic publishing, scheduling, and production infrastructure setup are outside its scope.

Before sharing a configuration or error report, check it for keys and private data. If a key is exposed, revoke or rotate it with the provider; deleting the file alone is not enough. The [security policy](../SECURITY.md) and [contribution guide](../CONTRIBUTING.md) explain the next steps.
