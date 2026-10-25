import { OpenAPIRegistry, OpenApiGeneratorV31, type RouteConfig } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import * as S from "./schemas";

const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "sessionCookie", {
  type: "apiKey",
  in: "cookie",
  name: "lumina_session",
  description:
    "Opaque, HttpOnly session cookie set after Google sign-in (`__Host-lumina_session` in production). " +
    "State-changing requests must also send `X-CSRF-Token` (from `GET /auth/session`) and come from an allowed Origin.",
});
registry.registerComponent("securitySchemes", "csrfToken", { type: "apiKey", in: "header", name: "X-CSRF-Token" });

const problem = (description: string) => ({
  description,
  content: { "application/problem+json": { schema: S.Problem } },
});
const ok = <T extends z.ZodType>(schema: T, description = "OK") => ({
  description,
  content: { "application/json": { schema } },
});
const jsonBody = <T extends z.ZodType>(schema: T) => ({
  required: true,
  content: { "application/json": { schema } },
});

const common = { 429: problem("Rate limit exceeded. See `Retry-After`."), 500: problem("Unexpected server error.") };
const authed = {
  ...common,
  401: problem("Not signed in."),
};
const mutation = {
  ...authed,
  403: problem("Cross-origin request or missing/invalid CSRF token."),
  415: problem("Body must be application/json."),
  422: problem("Validation failed."),
};
const SESSION = [{ sessionCookie: [] }];
const SESSION_CSRF = [{ sessionCookie: [], csrfToken: [] }];

/** e.g. `get /mantras/{id}` → `getMantrasById`, `put /ripples/{id}/light` → `putRipplesByIdLight`. */
function operationId(method: string, route: string) {
  const parts = route
    .split("/")
    .filter(Boolean)
    .map((seg) => (seg.startsWith("{") ? `By-${seg.slice(1, -1)}` : seg))
    .flatMap((seg) => seg.split(/[-.]/))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return method + parts.join("");
}

const path = (cfg: RouteConfig) => registry.registerPath({ operationId: operationId(cfg.method, cfg.path), ...cfg });

// ---------- System ----------
path({ method: "get", path: "/health", tags: ["System"], summary: "Liveness probe", responses: { 200: ok(S.Health) } });

// ---------- Auth ----------
path({
  method: "get",
  path: "/auth/providers",
  tags: ["Auth"],
  summary: "Which sign-in methods are enabled",
  responses: { 200: ok(S.AuthProviders), ...common },
});
path({
  method: "get",
  path: "/auth/google/start",
  tags: ["Auth"],
  summary: "Begin Google sign-in / registration",
  description:
    "Starts an OpenID Connect authorization-code flow with PKCE (S256), `state` and `nonce`, stored in an encrypted, " +
    "short-lived HttpOnly cookie. Redirects the browser to Google. First-time users are registered automatically.",
  request: { query: z.object({ returnTo: z.string().optional().meta({ description: "Relative app path to return to.", example: "/studio" }) }) },
  responses: { 302: { description: "Redirect to Google's consent screen." }, 503: problem("Google sign-in is not configured."), ...common },
});
path({
  method: "get",
  path: "/auth/google/callback",
  tags: ["Auth"],
  summary: "Google OAuth redirect URI",
  description:
    "Validates `state`, exchanges the code (with the PKCE verifier), verifies the ID token signature, issuer, audience, nonce " +
    "and `email_verified`, creates or links the account, sets the session cookie, then redirects to the web app. " +
    "On failure redirects to `/login?error=<code>`.",
  request: { query: z.object({ code: z.string().optional(), state: z.string().optional(), error: z.string().optional() }) },
  responses: { 302: { description: "Redirect back to the web app." } },
});
path({
  method: "post",
  path: "/auth/dev-login",
  tags: ["Auth"],
  summary: "Local development sign-in",
  description: "Only available when `DEV_LOGIN_ENABLED=1` and `NODE_ENV` is not production. Returns 404 otherwise.",
  request: { body: jsonBody(S.DevLoginBody) },
  responses: { 200: ok(S.SessionInfo), 404: problem("Disabled."), ...mutation },
});
path({
  method: "get",
  path: "/auth/session",
  tags: ["Auth"],
  summary: "Current session and CSRF token",
  security: SESSION,
  responses: { 200: ok(S.SessionInfo), ...authed },
});
path({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Sign out (revokes this session)",
  security: SESSION_CSRF,
  responses: { 204: { description: "Signed out." }, ...mutation },
});

// ---------- Account ----------
path({ method: "get", path: "/me", tags: ["Account"], summary: "Get my profile", security: SESSION, responses: { 200: ok(S.User), ...authed } });
path({
  method: "patch",
  path: "/me",
  tags: ["Account"],
  summary: "Update my profile & audio preferences",
  security: SESSION_CSRF,
  request: { body: jsonBody(S.UpdateProfileBody) },
  responses: { 200: ok(S.User), ...mutation },
});
path({
  method: "delete",
  path: "/me",
  tags: ["Account"],
  summary: "Permanently delete my account and all my data",
  security: SESSION_CSRF,
  responses: { 204: { description: "Account deleted; session cookie cleared." }, ...mutation },
});
path({ method: "get", path: "/me/stats", tags: ["Account"], summary: "Streak, karma and badges", security: SESSION, responses: { 200: ok(S.UserStats), ...authed } });

// ---------- Content ----------
path({
  method: "get",
  path: "/daily",
  tags: ["Content"],
  summary: "Today's focal mantra and real-world action",
  request: { query: S.DailyQuery },
  responses: { 200: ok(S.Daily), ...common },
});
path({ method: "get", path: "/decks", tags: ["Content"], summary: "Browse & search wisdom decks", request: { query: S.DeckListQuery }, responses: { 200: ok(S.DeckList), ...common } });
path({
  method: "get",
  path: "/decks/{slug}",
  tags: ["Content"],
  summary: "A deck with its affirmation cards",
  request: { params: S.SlugParam },
  responses: { 200: ok(S.Deck), 404: problem("Deck not found."), ...common },
});

// ---------- Bookmarks ----------
path({ method: "get", path: "/bookmarks", tags: ["Bookmarks"], summary: "List my bookmarks", security: SESSION, responses: { 200: ok(z.array(S.Bookmark)), ...authed } });
path({
  method: "post",
  path: "/bookmarks",
  tags: ["Bookmarks"],
  summary: "Bookmark a deck or affirmation (idempotent)",
  security: SESSION_CSRF,
  request: { body: jsonBody(S.BookmarkBody) },
  responses: { 204: { description: "Bookmarked." }, 404: problem("Target not found."), ...mutation },
});
path({
  method: "delete",
  path: "/bookmarks/{targetType}/{targetId}",
  tags: ["Bookmarks"],
  summary: "Remove a bookmark",
  security: SESSION_CSRF,
  request: { params: z.object({ targetType: z.enum(["deck", "affirmation"]), targetId: S.Uuid }) },
  responses: { 204: { description: "Removed." }, ...mutation },
});

// ---------- Mantras ----------
path({ method: "get", path: "/mantras", tags: ["Studio"], summary: "My crafted mantras", security: SESSION, responses: { 200: ok(z.array(S.Mantra)), ...authed } });
path({
  method: "post",
  path: "/mantras",
  tags: ["Studio"],
  summary: "Save a mantra card",
  security: SESSION_CSRF,
  request: { body: jsonBody(S.MantraBody) },
  responses: { 201: ok(S.Mantra, "Created"), ...mutation },
});
path({
  method: "get",
  path: "/mantras/{id}",
  tags: ["Studio"],
  summary: "Get one of my mantras",
  security: SESSION,
  request: { params: S.IdParam },
  responses: { 200: ok(S.Mantra), 404: problem("Not found."), ...authed },
});
path({
  method: "patch",
  path: "/mantras/{id}",
  tags: ["Studio"],
  summary: "Edit a mantra",
  security: SESSION_CSRF,
  request: { params: S.IdParam, body: jsonBody(S.MantraPatch) },
  responses: { 200: ok(S.Mantra), 404: problem("Not found."), ...mutation },
});
path({
  method: "delete",
  path: "/mantras/{id}",
  tags: ["Studio"],
  summary: "Delete a mantra",
  security: SESSION_CSRF,
  request: { params: S.IdParam },
  responses: { 204: { description: "Deleted." }, 404: problem("Not found."), ...mutation },
});

// ---------- Journal ----------
path({ method: "get", path: "/journal", tags: ["Journal"], summary: "My recent reflections", security: SESSION, responses: { 200: ok(z.array(S.JournalEntry)), ...authed } });
path({
  method: "post",
  path: "/journal",
  tags: ["Journal"],
  summary: "Write a private reflection",
  security: SESSION_CSRF,
  request: { body: jsonBody(S.JournalBody) },
  responses: { 201: ok(S.JournalEntry, "Created"), ...mutation },
});
path({
  method: "delete",
  path: "/journal/{id}",
  tags: ["Journal"],
  summary: "Delete a reflection",
  security: SESSION_CSRF,
  request: { params: S.IdParam },
  responses: { 204: { description: "Deleted." }, 404: problem("Not found."), ...mutation },
});
path({
  method: "get",
  path: "/journal/insights",
  tags: ["Journal"],
  summary: "30-day emotional resonance",
  security: SESSION,
  responses: { 200: ok(S.JournalInsights), ...authed },
});

// ---------- Practice & community ----------
path({
  method: "post",
  path: "/practice",
  tags: ["Community"],
  summary: "Mark today's action as practised",
  security: SESSION_CSRF,
  request: { body: jsonBody(S.PracticeBody) },
  responses: { 200: ok(S.UserStats), 404: problem("Unknown action."), 409: problem("Already practised today."), ...mutation },
});
path({ method: "get", path: "/community/stats", tags: ["Community"], summary: "Collective momentum", responses: { 200: ok(S.CommunityStats), ...common } });
path({
  method: "get",
  path: "/ripples",
  tags: ["Community"],
  summary: "Community ripple feed (cursor-paginated)",
  request: { query: S.RippleListQuery },
  responses: { 200: ok(S.RippleList), 400: problem("Invalid cursor."), ...common },
});
path({
  method: "post",
  path: "/ripples",
  tags: ["Community"],
  summary: "Share a ripple action",
  security: SESSION_CSRF,
  request: { body: jsonBody(S.RippleBody) },
  responses: { 201: ok(S.Ripple, "Created"), ...mutation },
});
path({
  method: "delete",
  path: "/ripples/{id}",
  tags: ["Community"],
  summary: "Delete one of my ripples",
  security: SESSION_CSRF,
  request: { params: S.IdParam },
  responses: { 204: { description: "Deleted." }, 404: problem("Not found."), ...mutation },
});
for (const method of ["put", "delete"] as const) {
  path({
    method,
    path: "/ripples/{id}/light",
    tags: ["Community"],
    summary: method === "put" ? "Send light to someone else's ripple (idempotent)" : "Withdraw my light",
    security: SESSION_CSRF,
    request: { params: S.IdParam },
    responses: { 200: ok(S.LightResult), 404: problem("Not found."), ...mutation },
  });
}

let cached: ReturnType<OpenApiGeneratorV31["generateDocument"]> | undefined;

export function openApiDocument() {
  cached ??= new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Lumina API",
      version: "1.0.0",
      description:
        "Backend for Lumina — visual & audio affirmations that turn mindset into real-world impact.\n\n" +
        "**Authentication:** Google OpenID Connect. Browsers start at `GET /auth/google/start`; the API sets an HttpOnly session cookie. " +
        "**CSRF:** every unsafe request needs `X-CSRF-Token` and an allowed `Origin`. " +
        "**Errors:** RFC 9457 `application/problem+json`. **Rate limits:** `RateLimit-*` response headers.",
      license: { name: "MIT", identifier: "MIT" },
    },
    servers: [{ url: "/api/v1", description: "This deployment" }],
    tags: [
      { name: "Auth", description: "Google sign-in, sessions" },
      { name: "Account", description: "Profile, preferences, deletion" },
      { name: "Content", description: "Daily mantra and wisdom decks" },
      { name: "Bookmarks" },
      { name: "Studio", description: "Personal visual mantras" },
      { name: "Journal", description: "Private reflections" },
      { name: "Community", description: "Practice, ripples and collective stats" },
      { name: "System" },
    ],
  });
  return cached;
}
