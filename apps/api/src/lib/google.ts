import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "@/env";
import { randomToken } from "./crypto";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export type OAuthTransaction = { state: string; nonce: string; verifier: string; returnTo: string };

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
};

export class OAuthError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

/** Only same-app relative paths are accepted, so the login flow can't be used as an open redirect. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || value.length > 512) return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (/[\r\n]/.test(value)) return "/";
  return value;
}

export function beginAuthorization(returnTo: string): { url: string; tx: OAuthTransaction } {
  const { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } = env();
  const tx: OAuthTransaction = {
    state: randomToken(24),
    nonce: randomToken(24),
    verifier: randomToken(48),
    returnTo: safeReturnTo(returnTo),
  };
  const challenge = createHash("sha256").update(tx.verifier).digest("base64url");
  const url = new URL(AUTH_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state: tx.state,
    nonce: tx.nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
    access_type: "online",
  }).toString();
  return { url: url.toString(), tx };
}

/** Exchanges the authorization code (with PKCE verifier) and verifies the returned ID token. */
export async function completeAuthorization(code: string, tx: OAuthTransaction): Promise<GoogleProfile> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, ALLOWED_EMAIL_DOMAINS } = env();
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
      code_verifier: tx.verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new OAuthError("token_exchange_failed", `Google token endpoint returned ${res.status}`);
  const tokens = (await res.json()) as { id_token?: string };
  if (!tokens.id_token) throw new OAuthError("token_exchange_failed", "No ID token in Google response");

  let claims;
  try {
    ({ payload: claims } = await jwtVerify(tokens.id_token, JWKS, {
      issuer: ISSUERS,
      audience: GOOGLE_CLIENT_ID,
      algorithms: ["RS256"],
      clockTolerance: 30,
    }));
  } catch {
    throw new OAuthError("invalid_id_token", "ID token failed verification");
  }
  if (claims.nonce !== tx.nonce) throw new OAuthError("invalid_id_token", "Nonce mismatch");

  const email = typeof claims.email === "string" ? claims.email.toLowerCase() : "";
  if (!email || claims.email_verified !== true) throw new OAuthError("email_unverified", "Google account email is not verified");
  if (ALLOWED_EMAIL_DOMAINS.length && !ALLOWED_EMAIL_DOMAINS.includes(email.split("@")[1] ?? "")) {
    throw new OAuthError("email_domain_not_allowed", "This email domain is not allowed");
  }
  return {
    sub: String(claims.sub),
    email,
    emailVerified: true,
    name: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 80) : email.split("@")[0]!,
    picture: typeof claims.picture === "string" && claims.picture.startsWith("https://") ? claims.picture : null,
  };
}
