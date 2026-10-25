import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { env } from "@/env";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const newId = () => crypto.randomUUID();

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function sealKey(): Uint8Array {
  return createHash("sha256").update(`lumina-seal:${env().SESSION_SECRET}`).digest();
}

/** Encrypt + authenticate a small payload (JWE, dir/A256GCM) for short-lived cookies. */
export async function seal(payload: Record<string, unknown>, ttlSeconds: number): Promise<string> {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .encrypt(sealKey());
}

export async function unseal<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtDecrypt(token, sealKey());
    return payload as T;
  } catch {
    return null;
  }
}
