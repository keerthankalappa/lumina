import { NextRequest } from "next/server";

export const APP = "http://app.test";

type Init = { method?: string; body?: unknown; headers?: Record<string, string>; cookie?: string; csrf?: string };

export function req(path: string, init: Init = {}) {
  const headers: Record<string, string> = { ...init.headers };
  if (init.body !== undefined) headers["content-type"] ??= "application/json";
  if (init.cookie) headers.cookie = init.cookie;
  if (init.csrf) headers["x-csrf-token"] = init.csrf;
  if (init.method && init.method !== "GET") headers.origin ??= APP;
  return new NextRequest(`${APP}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
}

export const ctx = <P extends Record<string, string>>(params: P) => ({ params: Promise.resolve(params) });

/** Signs in through the dev-login route and returns cookie + CSRF token. */
export async function signIn(email: string) {
  const { POST } = await import("@/app/api/v1/auth/dev-login/route");
  const res = await POST(req("/api/v1/auth/dev-login", { method: "POST", body: { email } }));
  const cookie = res.headers.get("set-cookie")!.split(";")[0]!;
  const { csrfToken, user } = (await res.json()) as { csrfToken: string; user: { id: string } };
  return { cookie, csrf: csrfToken, userId: user.id };
}
