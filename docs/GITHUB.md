# Using GitHub with this project

**English** | [Türkçe](GITHUB.tr.md)

Repository: **[tkaancakir/seo-content-engine](https://github.com/tkaancakir/seo-content-engine)**.
GitHub is where this project's code, documentation, and changes are shared. Downloading the files does not run the engine; you still need to install and run it on your computer or server.

## Where should I look?

| Section | What it is used for in this project |
| --- | --- |
| **Code** | Browse files, select a branch, and download the code. `main` is the main branch. |
| **README** | Learn what the engine does, what it needs, and how to try it. It appears on the repository's home page. |
| **Issues** | Report a reproducible bug or suggest an improvement. |
| **Pull requests** | Propose code or documentation changes for review. A pull request is often called a **PR**. |
| **Actions** | View the results of automated checks run for changes. |
| **Releases** | Find versions the maintainer has explicitly published, along with release notes. |

See the [official GitHub glossary](https://docs.github.com/en/get-started/learning-about-github/github-glossary) for more terms. When this guide was written on October 21, 2026, there was no tagged release; check the [Releases page](https://github.com/tkaancakir/seo-content-engine/releases) for later releases.

## ZIP, clone, or fork?

| Your goal | Choose | What you get |
| --- | --- | --- |
| Download the code once to try it | **Code → Download ZIP** | A snapshot of the files. Extract the ZIP, then follow the setup steps. |
| Work locally and track changes | **Clone** | A local Git copy that can receive later updates. |
| Propose contributions from your own GitHub account | **Fork** | A linked copy under your GitHub account. Clone your fork as well if you want to work on your computer. |

These actions do not install or publish the application. [GitHub's explanation of downloading, cloning, and forking](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-files-from-github)

If Git is installed, download this repository with:

```sh
git clone https://github.com/tkaancakir/seo-content-engine.git
cd seo-content-engine
```

If you downloaded a ZIP, open a terminal in the extracted `seo-content-engine-main` folder. Then follow the [usage guide](USAGE.md):

```sh
npm ci
npm run demo
```

The demo runs offline and does not need an API key. To generate your own content, complete the configuration steps in the usage guide. Live provider calls are subject to your account's pricing and quotas.

## Where do my settings go?

`examples/config.json` is the shared example. Copy it to `config/local.json` and edit that copy. Store your own key in a local `.env` file or your server's secret store. Git ignores `.env`, `config/`, and `data/`.

Do not paste your key into GitHub's file editor, an issue, a PR description, or a screenshot. Review the file list and changes before sharing. Adding a file to `.gitignore` does not remove a previously shared secret from history. If a key is exposed, follow the [security instructions](../SECURITY.md).

## Report a bug or suggest a feature

1. Look through [Issues](https://github.com/tkaancakir/seo-content-engine/issues) for an existing report or request.
2. Select **New issue**, then choose the bug or feature form.
3. For a bug, describe the expected result, actual result, Node.js version, and short steps to reproduce it. Use `examples/config.json` and a mock provider where possible.
4. Share a small example with fictional data and the engine's generic error code, rather than real client content or raw logs. For a feature, explain the task it would make easier.

Opening an issue does not mean the work has been accepted or will be completed by a particular date. For security vulnerabilities, follow the reporting instructions in [SECURITY.md](../SECURITY.md) instead of the public form.

## Propose a change

The contribution flow is: **fork → separate branch → change → checks → PR**.

[CONTRIBUTING.md](../CONTRIBUTING.md) explains the commands and contribution guidelines. In your PR description, state what changed and how you verified it. Opening a PR does not change the original repository; the change enters `main` only if a maintainer reviews and merges it.

## How should a maintainer review contributions?

1. Check whether an issue includes an example that reproduces the problem. Ask for any missing information clearly and briefly. If a request is out of scope, explain why.
2. Read the code and documentation under **Files changed** in the PR. Check for API keys, client data, and unrelated files.
3. Review the behavior change and tests. Wait for **Checks / Actions** to finish and for the required checks to pass before merging.
4. If the change is suitable, use **Merge** to accept it. Keep the README and usage examples current when behavior changes for users.

If an Actions run is red, open it and inspect the failed step. A failed test, a dependency download failure, and a GitHub runner problem need different fixes. Determine the cause before concluding that the code is broken, then rerun the relevant check when appropriate. Passing checks do not replace code review.
