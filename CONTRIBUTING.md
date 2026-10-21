# Contributing

Bug fixes, clear usage examples, and documentation improvements are welcome. Before starting a large change, [open an issue](https://github.com/tkaancakir/seo-content-engine/issues/new/choose) to describe the need and scope so contributors can avoid duplicating work. Opening an issue or pull request does not guarantee a response time, acceptance, or delivery date.

If you are new to GitHub, start with the [GitHub guide](docs/GITHUB.md). For setup and configuration, see the [usage guide](docs/USAGE.md). Report security vulnerabilities using the instructions in [SECURITY.md](SECURITY.md), rather than a public issue.

## Set up and make your change

1. Use **Fork** on GitHub to create a copy under your account.
2. Clone your fork to your computer. Replace `YOUR_USERNAME` below with your GitHub username:

   ```sh
   git clone https://github.com/YOUR_USERNAME/seo-content-engine.git
   cd seo-content-engine
   git switch -c docs/clarify-usage
   npm ci
   ```

3. Use Node.js 22.12 or later. Choose a branch name that describes your change, and keep each pull request focused on one clear need.
4. Update the relevant tests and documentation when behavior changes. Use a mock provider in tests; the default checks must not make network requests or call paid APIs.

Do not commit production keys, `.env` files, real client configurations, or content archives. Keep your own settings in `config/` and your data in `data/`, which are ignored by Git. Do not silently weaken the draft and human-review requirements or duplicate detection.

## Check your work and open a pull request

```sh
npm run check
npm run demo
git status --short
git diff
```

Review the file list and changes. Open and read new files too: `git diff` does not show the contents of untracked files. If you accidentally committed a secret, stop before pushing and follow the [security instructions](SECURITY.md).

Commit only the relevant files, push the branch to your fork, and use **Compare & pull request** on GitHub to open a pull request against the `main` branch of `tkaancakir/seo-content-engine`. Complete the template with the problem, changed behavior, validation results, and known limitations. If you could not run a check, leave its checkbox unchecked and explain why.

The maintainer reviews the files, behavior, and automated checks. If an Actions run fails, inspect the failed step: a test failure, dependency download failure, and runner failure need different fixes. Push any corrections to the same branch to update the pull request. A suitable change can be merged after review is complete and the required checks pass.

Contributions are provided under this repository's [MIT license](LICENSE).
