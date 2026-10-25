# Lumina — Visual & Audio Affirmations

An editorial wellness app built from the *Lumina Editorial Wellness* designs: daily spoken affirmations over generative
soundscapes, a wisdom gallery of themed decks, a studio for crafting printable mantra cards, a private mood journal,
and a community "ripple" feed that turns mindset into real-world action.

```
lumina/
├── apps/web   React 19 + Vite + Tailwind v4 + React Router + TanStack Query   (frontend, :5173)
└── apps/api   Next.js 16 route handlers + Drizzle ORM + SQLite/libSQL + Zod   (backend,  :4000)
```

## Features

| Screen | What it does |
| --- | --- |
| **Daily Sanctuary** | Rotating daily mantra narrated aloud (Web Speech API) over an ambient soundscape, live waveform, 4‑4‑4 breathing pacer, a daily real‑world action to mark as practised, private mood check‑in, live community moments. |
| **Sound Sanctuary player** | Full player: card-by-card progression, speed, prev/next, voice/ambient mixer, five soundscapes, sleep timer (5/15/30 min or end of session). |
| **Wisdom Gallery** | Searchable (⌘K), filterable decks with generative cover art, deck detail, play any card, bookmark, download any card as a wallpaper PNG. |
| **Mindset Studio** | Compose a mantra, pick palette / typography / aura, live preview, save/edit/delete, export a print‑ready 1600×2000 PNG, hear it spoken; 30‑day mood rhythm, mood distribution, journal history. |
| **Ripple & Impact** | Community stats, monthly collective challenge, cursor-paginated feed with category filters, post/delete ripples, send "light", personal footprint and badges. |
| **Account** | Google sign‑in/registration, onboarding (soundscape + narration pace), preferences, sign out, permanent account deletion. |

All audio is synthesised in the browser (Web Audio + Web Speech), so there are no media files to host or license and nothing is recorded.

## Quick start

Requires Node.js ≥ 20.11.

```bash
npm install
cp apps/api/.env.example apps/api/.env.local     # then edit — see below
npm run db:migrate && npm run db:seed
npm run dev                                      # API on :4000, web on :5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the Next.js app, so the browser sees a single origin.

* Interactive API reference (Swagger UI): http://localhost:5173/api/docs
* OpenAPI 3.1 document: http://localhost:5173/api/openapi.json (also committed at `apps/api/openapi.json`)

### Sign in with Google (Gmail)

1. In [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials), configure the OAuth consent screen (scopes: `openid`, `email`, `profile`).
2. Create an **OAuth client ID → Web application**.
3. Add the authorized redirect URI: `http://localhost:5173/api/v1/auth/google/callback` (plus your production URL, e.g. `https://lumina.example.com/api/v1/auth/google/callback`).
4. Put the client ID and secret into `apps/api/.env.local`:
   ```
   GOOGLE_CLIENT_ID=…apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=…
   GOOGLE_REDIRECT_URI=http://localhost:5173/api/v1/auth/google/callback
   ```
5. Optional: `ALLOWED_EMAIL_DOMAINS=gmail.com,googlemail.com` to restrict registration to Gmail accounts.

A visitor's first Google sign‑in **creates their account** and lands them on the `/welcome` onboarding; later sign‑ins log them in.

For local work without Google credentials, set `DEV_LOGIN_ENABLED=1` to show an email-only development sign‑in. The server refuses to enable it when `NODE_ENV=production`.

## Security

| Area | Implementation |
| --- | --- |
| Authentication | Google OpenID Connect, authorization‑code flow with **PKCE (S256)**, `state` and `nonce`. The transaction lives in an **encrypted (JWE A256GCM)**, HttpOnly, 10‑minute cookie scoped to the callback path. The ID token is verified against Google's JWKS (signature, `iss`, `aud`, expiry, `nonce`); `email_verified` is required. |
| Sessions | 256‑bit random opaque token in an `HttpOnly; SameSite=Lax` cookie (`__Host-` prefixed + `Secure` in production). Only its **SHA‑256 hash** is stored. 30‑day sliding expiry; logout and account deletion revoke server‑side. |
| CSRF | Per‑session token required as `X-CSRF-Token` on every unsafe method (constant‑time compare), **plus** an Origin / `Sec-Fetch-Site` allow‑list check. |
| Input | Every query/body is validated by strict Zod schemas (unknown keys rejected, lengths bounded, control characters stripped). Bodies must be `application/json`, max 16 KB. Path ids must be UUIDs. |
| Authorization | Every owned resource is scoped by `user_id`. Resources owned by other users return 404, so ids can't be probed. You can't "light" your own ripple. |
| Abuse | Fixed‑window rate limits (auth 20/min, writes 60/min, reads 300/min) with `RateLimit-*` and `Retry-After` headers. The store is in-memory; swap in Redis when running more than one instance. Practice dates must be within ±1 day of UTC (no back‑filling streaks). |
| Headers | API: `default-src 'none'` CSP, HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, COOP/CORP, no `X-Powered-By`. Web: strict CSP (`script-src 'self'`) injected into the production build, plus headers for `vite preview`. Swagger UI is self‑hosted, with no third‑party scripts. |
| Errors | RFC 9457 `application/problem+json` with a `requestId`. Stack traces are logged server‑side (structured JSON), never returned. |
| Redirects | `returnTo`/`next` accept only same‑app relative paths (blocks open redirects, `//host`, `/\host` and CRLF). |
| Privacy | Minimal Google scopes. Journal is private. Full account deletion cascades all data. Production dependencies pass `npm audit` with 0 vulnerabilities. |

## API

Base path `/api/v1`. The spec is generated from the same Zod schemas the handlers use to validate requests, so the spec and the validation can't drift apart.

```
GET    /health                       GET    /daily
GET    /auth/providers               GET    /decks?q=&category=
GET    /auth/google/start            GET    /decks/{slug}
GET    /auth/google/callback         GET|POST /bookmarks   DELETE /bookmarks/{type}/{id}
POST   /auth/dev-login (dev only)    GET|POST /mantras     GET|PATCH|DELETE /mantras/{id}
GET    /auth/session                 GET|POST /journal     DELETE /journal/{id}
POST   /auth/logout                  GET    /journal/insights
GET|PATCH|DELETE /me                 POST   /practice
GET    /me/stats                     GET|POST /ripples     DELETE /ripples/{id}
GET    /community/stats              PUT|DELETE /ripples/{id}/light
```

Regenerate the spec and the typed frontend client after changing schemas:

```bash
npm run openapi                              # writes apps/api/openapi.json
npm run gen:api-types --workspace apps/web   # writes apps/web/src/api/schema.d.ts
```

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | API + web in watch mode |
| `npm test` | API test suite (Vitest): auth flow, CSRF/origin, validation, rate limits, ownership, pagination, OpenAPI |
| `npm run typecheck` | TypeScript across both apps |
| `npm run build` | Production builds |
| `npm run db:generate -w apps/api` | New Drizzle migration after editing `src/db/schema.ts` |

## Production notes

* Serve the web `dist/` and the API **under one origin** (a reverse proxy routing `/api/*` to Next.js) so cookies stay first‑party. Set `APP_ORIGIN`, `GOOGLE_REDIRECT_URI` and `NODE_ENV=production`, and `TRUST_PROXY=1` if the proxy sets `X-Forwarded-For`.
* Send the web CSP from `apps/web/vite.config.ts` as a real HTTP header too (`frame-ancestors` only works as a header).
* SQLite is fine for a single node. For managed hosting, point `DATABASE_URL` at Turso/libSQL (`libsql://…` + `DATABASE_AUTH_TOKEN`).
