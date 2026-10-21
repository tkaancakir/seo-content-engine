# Security policy

## Protect credentials and private data

- Keep API keys in server environment variables or a secret manager. Never commit `.env` files, local project configuration, or generated customer content. Secret fields in `.env.example` must remain empty; model names may contain example values.
- Do not put Gemini keys in browser code, URLs, screenshots, or error reports. Do not log raw provider errors, request headers, or environment variables.
- Review the brand context and historical content before sending them to a provider. Use synthetic examples when reporting a problem or contributing tests.
- Keep draft generation separate from permission to publish. This engine produces drafts for human review and does not publish content.

## Integration responsibilities

Model output is untrusted data. The engine applies schema validation and editorial checks, but these do not establish factual accuracy. Integrations that render HTML must apply appropriate HTML sanitization and URL restrictions.

The HTTP helper's concurrency guard works within one process. The hosting application is responsible for durable idempotency, access controls, usage quotas, and rate limits across multiple workers or servers.

## If a credential is exposed

Revoke or rotate it with the provider first. Deleting a file or adding it to `.gitignore` does not remove the credential from existing commits or other copies. Coordinate history cleanup with affected collaborators when needed. See [GitHub's guide to removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## Report a vulnerability

Do not include real credentials, customer data, or actionable exploit details in a public issue. If private vulnerability reporting is enabled for this repository, use that channel. Otherwise, ask the maintainer for a private reporting channel without disclosing sensitive details publicly.

Local checks and tests do not provide a complete security guarantee. Review your own integration and deployment before using real credentials or customer data.
