/**
 * Error raised when the Campaign Monitor API returns a non-2xx response.
 * Campaign Monitor error bodies look like: { "Code": 122, "Message": "..." }
 */
export class CMError extends Error {
  readonly httpStatus: number;
  readonly code?: number;

  constructor(httpStatus: number, message: string, code?: number) {
    super(message);
    this.name = "CMError";
    this.httpStatus = httpStatus;
    this.code = code;
  }

  /** Human-readable, single-line summary suitable for a tool error result. */
  toSummary(): string {
    const parts = [`HTTP ${this.httpStatus}`];
    if (this.code !== undefined) parts.push(`CM code ${this.code}`);
    parts.push(this.message);
    return parts.join(" — ");
  }
}

/** Parse a Campaign Monitor error response body into a CMError. */
export function toCMError(httpStatus: number, body: unknown): CMError {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    const message =
      typeof b.Message === "string" ? b.Message : JSON.stringify(body);
    const code = typeof b.Code === "number" ? b.Code : undefined;
    return new CMError(httpStatus, message, code);
  }
  return new CMError(httpStatus, String(body ?? "Unknown error"));
}
