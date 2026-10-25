import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { ctx, req, signIn } from "./helpers";

beforeEach(() => resetRateLimits());

describe("auth", () => {
  it("rejects anonymous access to private routes with problem+json", async () => {
    const { GET } = await import("@/app/api/v1/me/route");
    const res = await GET(req("/api/v1/me"));
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toBe("application/problem+json");
    expect(await res.json()).toMatchObject({ status: 401, code: "unauthorized" });
  });

  it("issues an HttpOnly SameSite session cookie and a CSRF token", async () => {
    const { POST } = await import("@/app/api/v1/auth/dev-login/route");
    const res = await POST(req("/api/v1/auth/dev-login", { method: "POST", body: { email: "Cookie@Gmail.com" } }));
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect((await res.json()).user.email).toBe("cookie@gmail.com");
  });

  it("starts Google sign-in with PKCE, state and nonce in an encrypted cookie", async () => {
    const { GET } = await import("@/app/api/v1/auth/google/start/route");
    const res = await GET(req("/api/v1/auth/google/start?returnTo=//evil.example"));
    expect(res.status).toBe(302);
    const url = new URL(res.headers.get("location")!);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(url.searchParams.get("nonce")).toBeTruthy();
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^lumina_oauth=ey/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).not.toContain(url.searchParams.get("state")!); // sealed, not plaintext
  });

  it("rejects a callback whose state doesn't match", async () => {
    const start = await import("@/app/api/v1/auth/google/start/route");
    const s = await start.GET(req("/api/v1/auth/google/start"));
    const oauthCookie = s.headers.get("set-cookie")!.split(";")[0]!;
    const { GET } = await import("@/app/api/v1/auth/google/callback/route");
    const res = await GET(req("/api/v1/auth/google/callback?code=x&state=forged", { cookie: oauthCookie }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://app.test/login?error=invalid_state");
  });

  it("revokes the session on logout", async () => {
    const { cookie, csrf } = await signIn("logout@gmail.com");
    const { POST } = await import("@/app/api/v1/auth/logout/route");
    expect((await POST(req("/api/v1/auth/logout", { method: "POST", cookie, csrf }))).status).toBe(204);
    const { GET } = await import("@/app/api/v1/me/route");
    expect((await GET(req("/api/v1/me", { cookie }))).status).toBe(401);
  });
});

describe("request protections", () => {
  it("requires the CSRF token on mutations", async () => {
    const { cookie } = await signIn("csrf@gmail.com");
    const { POST } = await import("@/app/api/v1/mantras/route");
    const res = await POST(req("/api/v1/mantras", { method: "POST", cookie, body: {} }));
    expect(res.status).toBe(403);
  });

  it("blocks cross-origin mutations even with a valid token", async () => {
    const { cookie, csrf } = await signIn("origin@gmail.com");
    const { POST } = await import("@/app/api/v1/mantras/route");
    const res = await POST(
      req("/api/v1/mantras", { method: "POST", cookie, csrf, body: {}, headers: { origin: "https://evil.example" } }),
    );
    expect(res.status).toBe(403);
  });

  it("enforces JSON content type and body size", async () => {
    const { cookie, csrf } = await signIn("body@gmail.com");
    const { POST } = await import("@/app/api/v1/journal/route");
    const wrongType = await POST(
      req("/api/v1/journal", { method: "POST", cookie, csrf, body: "mood=x", headers: { "content-type": "text/plain" } }),
    );
    expect(wrongType.status).toBe(415);
    const huge = await POST(req("/api/v1/journal", { method: "POST", cookie, csrf, body: { body: "x".repeat(20_000) } }));
    expect(huge.status).toBe(413);
  });

  it("returns field-level validation errors", async () => {
    const { cookie, csrf } = await signIn("valid@gmail.com");
    const { POST } = await import("@/app/api/v1/mantras/route");
    const res = await POST(req("/api/v1/mantras", { method: "POST", cookie, csrf, body: { text: "hi", palette: "neon", extra: 1 } }));
    expect(res.status).toBe(422);
    const paths = (await res.json()).errors.map((e: { path: string }) => e.path);
    expect(paths).toEqual(expect.arrayContaining(["text", "palette"]));
  });

  it("rate-limits auth endpoints", async () => {
    const { GET } = await import("@/app/api/v1/auth/google/start/route");
    let last = 0;
    for (let i = 0; i < 21; i++) last = (await GET(req("/api/v1/auth/google/start"))).status;
    expect(last).toBe(429);
  });
});

describe("ownership", () => {
  it("hides other users' mantras and journal entries", async () => {
    const a = await signIn("owner-a@gmail.com");
    const b = await signIn("owner-b@gmail.com");
    const mantras = await import("@/app/api/v1/mantras/route");
    const created = await mantras.POST(
      req("/api/v1/mantras", {
        method: "POST",
        ...a,
        body: { text: "I am enough.", intent: "Calm", palette: "twilight", typography: "playfair", aura: "starlight" },
      }),
    );
    expect(created.status).toBe(201);
    const { id } = await created.json();

    const one = await import("@/app/api/v1/mantras/[id]/route");
    expect((await one.GET(req(`/api/v1/mantras/${id}`, b), ctx({ id }))).status).toBe(404);
    expect((await one.DELETE(req(`/api/v1/mantras/${id}`, { method: "DELETE", ...b }), ctx({ id }))).status).toBe(404);
    expect((await one.GET(req(`/api/v1/mantras/${id}`, a), ctx({ id }))).status).toBe(200);
    expect(await (await mantras.GET(req("/api/v1/mantras", b))).json()).toEqual([]);
  });

  it("deleting an account removes the user's data", async () => {
    const u = await signIn("leaving@gmail.com");
    const ripples = await import("@/app/api/v1/ripples/route");
    await ripples.POST(req("/api/v1/ripples", { method: "POST", ...u, body: { category: "local", body: "Helped at the food bank." } }));
    const me = await import("@/app/api/v1/me/route");
    expect((await me.DELETE(req("/api/v1/me", { method: "DELETE", ...u }))).status).toBe(204);
    const feed = await (await ripples.GET(req("/api/v1/ripples?limit=50"))).json();
    expect(feed.items.some((r: { author: { id: string } }) => r.author.id === u.userId)).toBe(false);
  });
});

describe("community", () => {
  it("allows one practice per day and updates stats", async () => {
    const u = await signIn("practice@gmail.com");
    const { POST } = await import("@/app/api/v1/practice/route");
    const today = new Date().toISOString().slice(0, 10);
    const first = await POST(req("/api/v1/practice", { method: "POST", ...u, body: { actionId: "silent-walk", localDate: today } }));
    expect(first.status).toBe(200);
    expect((await first.json()).streak).toBe(1);
    const again = await POST(req("/api/v1/practice", { method: "POST", ...u, body: { actionId: "silent-walk", localDate: today } }));
    expect(again.status).toBe(409);
  });

  it("paginates the ripple feed with a cursor and forbids self-lighting", async () => {
    const u = await signIn("feed@gmail.com");
    const other = await signIn("feed-friend@gmail.com");
    const ripples = await import("@/app/api/v1/ripples/route");
    const res = await ripples.POST(req("/api/v1/ripples", { method: "POST", ...u, body: { category: "kindness", body: "Carried groceries upstairs." } }));
    const { id } = await res.json();

    const page1 = await (await ripples.GET(req("/api/v1/ripples?limit=2"))).json();
    expect(page1.items).toHaveLength(2);
    const page2 = await (await ripples.GET(req(`/api/v1/ripples?limit=2&cursor=${page1.nextCursor}`))).json();
    expect(page2.items[0].id).not.toBe(page1.items[1].id);

    const light = await import("@/app/api/v1/ripples/[id]/light/route");
    expect((await light.PUT(req(`/api/v1/ripples/${id}/light`, { method: "PUT", ...u }), ctx({ id }))).status).toBe(403);
    const lit = await light.PUT(req(`/api/v1/ripples/${id}/light`, { method: "PUT", ...other }), ctx({ id }));
    expect(await lit.json()).toEqual({ lights: 1, litByMe: true });
  });
});

describe("OpenAPI", () => {
  it("documents every route with a unique operationId", async () => {
    const { openApiDocument } = await import("@/openapi/document");
    const doc = openApiDocument();
    expect(doc.openapi).toBe("3.1.0");
    const ops = Object.values(doc.paths ?? {}).flatMap((p) => Object.values(p as Record<string, { operationId: string }>));
    const ids = ops.map((o) => o.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(doc.paths ?? {})).toEqual(expect.arrayContaining(["/auth/google/start", "/mantras/{id}", "/ripples/{id}/light"]));
  });
});
