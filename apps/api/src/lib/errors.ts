import { z } from "zod";

/** Error carrying an RFC 9457 problem description. Thrown from handlers, rendered by `route()`. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: { errors?: Array<{ path: string; message: string }>; headers?: Record<string, string> },
  ) {
    super(message);
  }

  static badRequest = (msg = "The request is invalid.") => new ApiError(400, "bad_request", msg);
  static unauthorized = (msg = "Sign in to continue.") => new ApiError(401, "unauthorized", msg);
  static forbidden = (msg = "You are not allowed to do that.") => new ApiError(403, "forbidden", msg);
  static notFound = (what = "Resource") => new ApiError(404, "not_found", `${what} not found.`);
  static conflict = (msg: string) => new ApiError(409, "conflict", msg);

  static fromZod(err: z.ZodError) {
    return new ApiError(422, "validation_failed", "One or more fields are invalid.", {
      errors: err.issues.map((i) => ({ path: i.path.join(".") || "(root)", message: i.message })),
    });
  }
}

const TITLES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  413: "Payload Too Large",
  415: "Unsupported Media Type",
  422: "Unprocessable Content",
  429: "Too Many Requests",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

export function problemResponse(err: ApiError, instance: string, requestId: string): Response {
  const body = {
    type: `https://lumina.app/problems/${err.code}`,
    title: TITLES[err.status] ?? "Error",
    status: err.status,
    detail: err.message,
    instance,
    code: err.code,
    requestId,
    ...(err.details?.errors ? { errors: err.details.errors } : {}),
  };
  return new Response(JSON.stringify(body), {
    status: err.status,
    headers: { "Content-Type": "application/problem+json", ...err.details?.headers },
  });
}
