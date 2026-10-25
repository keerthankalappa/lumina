import createClient, { type Middleware } from "openapi-fetch";
import type { components, paths } from "./schema";

export type Schemas = components["schemas"];

/** RFC 9457 problem returned by the API, raised as an Error for React Query. */
export class ApiProblem extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Array<{ path: string; message: string }> = [],
  ) {
    super(message);
  }
}

let csrfToken: string | null = null;
export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

const csrf: Middleware = {
  onRequest({ request }) {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && csrfToken) {
      request.headers.set("X-CSRF-Token", csrfToken);
    }
    return request;
  },
};

export const api = createClient<paths>({ baseUrl: "/api/v1", credentials: "same-origin" });
api.use(csrf);

type Result<T> = { data?: T; error?: unknown; response: Response };

/** Unwraps an openapi-fetch result, throwing `ApiProblem` on any non-2xx. */
export async function unwrap<T>(promise: Promise<Result<T>>): Promise<T> {
  const { data, error, response } = await promise;
  if (!response.ok) {
    const p = (error ?? {}) as Partial<Schemas["Problem"]>;
    throw new ApiProblem(response.status, p.code ?? "error", p.detail ?? `Request failed (${response.status})`, p.errors ?? []);
  }
  return data as T;
}

export const googleSignInUrl = (returnTo = "/") => `/api/v1/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;

/** The user's calendar date, which is what streaks and journal days are keyed on. */
export function localDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
