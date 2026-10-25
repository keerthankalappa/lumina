import { env } from "@/env";
import { safeEqual, unseal } from "@/lib/crypto";
import { completeAuthorization, OAuthError, type OAuthTransaction } from "@/lib/google";
import { policies } from "@/lib/rate-limit";
import { route } from "@/lib/route";
import { createSession } from "@/lib/session";
import { upsertGoogleUser } from "@/services/users";
import { OAUTH_COOKIE, OAUTH_COOKIE_PATH } from "../oauth-cookie";

const clearOAuthCookie = `${OAUTH_COOKIE}=; Path=${OAUTH_COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=0`;

function redirectToApp(path: string, cookies: string[]) {
  const headers = new Headers({ Location: new URL(path, env().APP_ORIGIN).toString() });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}

export const GET = route({ rateLimit: policies.auth }, async ({ req, requestId }) => {
  const fail = (code: string) => redirectToApp(`/login?error=${encodeURIComponent(code)}`, [clearOAuthCookie]);
  const params = req.nextUrl.searchParams;

  if (params.get("error")) return fail(params.get("error") === "access_denied" ? "access_denied" : "google_error");
  const code = params.get("code");
  const state = params.get("state");
  const sealed = req.cookies.get(OAUTH_COOKIE)?.value;
  const tx = sealed ? await unseal<OAuthTransaction>(sealed) : null;
  if (!code || !state || !tx || !safeEqual(state, tx.state)) return fail("invalid_state");

  try {
    const profile = await completeAuthorization(code, tx);
    const { user, created } = await upsertGoogleUser(profile);
    const session = await createSession(user.id, req.headers.get("user-agent"));
    const target = created ? `/welcome?next=${encodeURIComponent(tx.returnTo)}` : tx.returnTo;
    return redirectToApp(target, [clearOAuthCookie, session.cookie]);
  } catch (err) {
    console.warn(JSON.stringify({ level: "warn", requestId, msg: "google sign-in failed", error: String(err) }));
    return fail(err instanceof OAuthError ? err.code : "sign_in_failed");
  }
});
