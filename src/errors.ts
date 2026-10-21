export type ErrorCode = "INVALID_CONFIG" | "INVALID_HISTORY" | "INVALID_DRAFT" | "INVALID_EMBEDDING" | "PROVIDER_ERROR" | "MISSING_API_KEY" | "NO_UNIQUE_TOPIC" | "IO_ERROR";
const messages: Record<ErrorCode, string> = {
  INVALID_CONFIG: "Configuration is invalid.",
  INVALID_HISTORY: "History is invalid.",
  INVALID_DRAFT: "Generated content did not pass validation.",
  INVALID_EMBEDDING: "Duplicate check could not be completed.",
  PROVIDER_ERROR: "Content provider request failed.",
  MISSING_API_KEY: "GEMINI_API_KEY must be configured on the server.",
  NO_UNIQUE_TOPIC: "No unique topic was found within the attempt limit.",
  IO_ERROR: "Could not read or write the requested local file."
};
export class EngineError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode) { super(messages[code]); this.name = "EngineError"; this.code = code; }
}
export function safeError(error: unknown): EngineError {
  return error instanceof EngineError ? new EngineError(error.code) : new EngineError("PROVIDER_ERROR");
}
