import { env } from "@/env";
import { seal } from "@/lib/crypto";
import { ApiError } from "@/lib/errors";
import { beginAuthorization } from "@/lib/google";
import { policies } from "@/lib/rate-limit";
import { route } from "@/lib/route";
import { OAUTH_COOKIE, OAUTH_COOKIE_PATH, OAUTH_TTL_SECONDS } from "../oauth-cookie";

export const GET = route({ rateLimit: policies.auth }, async ({ req }) => {
  if (!env().googleConfigured) throw new ApiError(503, "google_not_configured", "Google sign-in is not configured on this server.");
  const { url, tx } = beginAuthorization(req.nextUrl.searchParams.get("returnTo") ?? "/");
  const sealed = await seal(tx, OAUTH_TTL_SECONDS);
  const cookie = [
    `${OAUTH_COOKIE}=${sealed}`,
    `Path=${OAUTH_COOKIE_PATH}`,
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${OAUTH_TTL_SECONDS}`,
    ...(env().isProd ? ["Secure"] : []),
  ].join("; ");
  return new Response(null, { status: 302, headers: { Location: url, "Set-Cookie": cookie } });
});
