import type { NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { safeEqual } from "./crypto";
import { ApiError, problemResponse } from "./errors";
import { hit, policies, type RateLimitPolicy } from "./rate-limit";
import { resolveSession, sessionCookieName, type AuthContext } from "./session";

const MAX_BODY_BYTES = 16 * 1024;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type RouteOptions<B extends z.ZodType | undefined, Q extends z.ZodType | undefined> = {
  /** "required" rejects anonymous callers; "optional" resolves the session when present. */
  auth?: "required" | "optional";
  rateLimit?: RateLimitPolicy;
  body?: B;
  query?: Q;
};

type HandlerContext<P, B, Q, A> = {
  req: NextRequest;
  params: P;
  auth: A;
  body: B extends z.ZodType ? z.infer<B> : undefined;
  query: Q extends z.ZodType ? z.infer<Q> : undefined;
  requestId: string;
  ip: string | null;
};

type NextRouteContext = { params: Promise<Record<string, string | string[]>> };

export function clientIp(req: Request): string | null {
  if (!env().TRUST_PROXY) return null;
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
}

/** Reject cross-site state-changing requests (defence in depth on top of SameSite + CSRF token). */
function assertSameSite(req: Request) {
  const origin = req.headers.get("origin");
  if (origin) {
    if (!env().allowedOrigins.includes(origin)) throw ApiError.forbidden("Cross-origin request blocked.");
    return;
  }
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw ApiError.forbidden("Cross-site request blocked.");
}

async function readJson(req: Request): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Send the request body as application/json.");
  }
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new ApiError(413, "payload_too_large", "Request body is too large.");
  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new ApiError(413, "payload_too_large", "Request body is too large.");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw ApiError.badRequest("Request body is not valid JSON.");
  }
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json; charset=utf-8", ...init.headers },
  });
}

export const noContent = () => new Response(null, { status: 204 });

type Handler<P, B, Q, A> = (ctx: HandlerContext<P, B, Q, A>) => Promise<Response | unknown>;
type NextHandler = (req: NextRequest, context?: NextRouteContext) => Promise<Response>;

/**
 * Wraps a Next.js route handler with: request id, session resolution, origin + CSRF checks for
 * unsafe methods, rate limiting, Zod validation of query/body, and RFC 9457 error rendering.
 */
export function route<P = Record<string, never>, B extends z.ZodType | undefined = undefined, Q extends z.ZodType | undefined = undefined>(
  options: RouteOptions<B, Q> & { auth: "required" },
  handler: Handler<P, B, Q, AuthContext>,
): NextHandler;
export function route<P = Record<string, never>, B extends z.ZodType | undefined = undefined, Q extends z.ZodType | undefined = undefined>(
  options: RouteOptions<B, Q>,
  handler: Handler<P, B, Q, AuthContext | null>,
): NextHandler;
export function route<P, B extends z.ZodType | undefined, Q extends z.ZodType | undefined>(
  options: RouteOptions<B, Q>,
  handler: Handler<P, B, Q, never>,
): NextHandler {
  return async (req: NextRequest, context?: NextRouteContext): Promise<Response> => {
    const requestId = req.headers.get("x-request-id")?.slice(0, 64) || crypto.randomUUID();
    const instance = new URL(req.url).pathname;
    const headers = new Headers({ "X-Request-Id": requestId, "Cache-Control": "no-store" });

    let res: Response;
    try {
      const unsafe = !SAFE_METHODS.has(req.method);
      if (unsafe) assertSameSite(req);

      const auth = options.auth ? await resolveSession(req.cookies.get(sessionCookieName())?.value) : null;
      if (options.auth === "required" && !auth) throw ApiError.unauthorized();
      if (unsafe && auth) {
        const sent = req.headers.get("x-csrf-token") ?? "";
        if (!safeEqual(sent, auth.csrfToken)) throw ApiError.forbidden("Missing or invalid CSRF token.");
      }

      const ip = clientIp(req);
      const policy = options.rateLimit ?? (unsafe ? policies.write : policies.read);
      const rl = hit(policy, auth?.user.id ?? ip ?? "anonymous");
      headers.set("RateLimit-Limit", String(rl.limit));
      headers.set("RateLimit-Remaining", String(rl.remaining));
      headers.set("RateLimit-Reset", String(rl.resetSeconds));
      if (!rl.allowed) {
        throw new ApiError(429, "rate_limited", "Too many requests. Please slow down.", {
          headers: { "Retry-After": String(rl.resetSeconds) },
        });
      }

      let query: unknown;
      if (options.query) {
        const parsed = options.query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
        if (!parsed.success) throw ApiError.fromZod(parsed.error);
        query = parsed.data;
      }
      let body: unknown;
      if (options.body) {
        const parsed = options.body.safeParse(await readJson(req));
        if (!parsed.success) throw ApiError.fromZod(parsed.error);
        body = parsed.data;
      }

      const params = (context ? await context.params : {}) as P;
      const result = await handler({ req, params, auth: auth as never, body: body as never, query: query as never, requestId, ip });
      res = result instanceof Response ? result : json(result);
    } catch (err) {
      if (err instanceof ApiError) {
        res = problemResponse(err, instance, requestId);
      } else {
        console.error(JSON.stringify({ level: "error", requestId, path: instance, error: String(err), stack: (err as Error)?.stack }));
        res = problemResponse(new ApiError(500, "internal_error", "Something went wrong on our side."), instance, requestId);
      }
    }
    headers.forEach((value, key) => {
      if (!res.headers.has(key)) res.headers.set(key, value);
    });
    return res;
  };
}
