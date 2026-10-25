/**
 * Fixed-window, in-memory rate limiter. Good for a single instance; when running more than one
 * instance swap the store for Redis/Upstash behind the same `hit()` signature.
 */
type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();
let lastSweep = Date.now();

export type RateLimitPolicy = { name: string; limit: number; windowMs: number };

export const policies = {
  auth: { name: "auth", limit: 20, windowMs: 60_000 },
  read: { name: "read", limit: 300, windowMs: 60_000 },
  write: { name: "write", limit: 60, windowMs: 60_000 },
} satisfies Record<string, RateLimitPolicy>;

export type RateLimitResult = { allowed: boolean; limit: number; remaining: number; resetSeconds: number };

export function hit(policy: RateLimitPolicy, key: string, now = Date.now()): RateLimitResult {
  if (now - lastSweep > 60_000) {
    for (const [k, w] of store) if (w.resetAt <= now) store.delete(k);
    lastSweep = now;
  }
  const storeKey = `${policy.name}:${key}`;
  let w = store.get(storeKey);
  if (!w || w.resetAt <= now) {
    w = { count: 0, resetAt: now + policy.windowMs };
    store.set(storeKey, w);
  }
  w.count += 1;
  return {
    allowed: w.count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - w.count),
    resetSeconds: Math.ceil((w.resetAt - now) / 1000),
  };
}

export function resetRateLimits() {
  store.clear();
}
