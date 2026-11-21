import "server-only";
import { headers } from "next/headers";

// Simple in-memory fixed-window limiter. Good for a single server;
// swap for Redis if you ever run more than one app container per environment.
const buckets = new Map<string, { count: number; reset: number }>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

// Automated end-to-end test runs place many orders from one IP; CI sets this to skip limits.
const disabled = () => process.env.RATE_LIMIT_DISABLED === "1";

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (disabled()) return true;
  const id = `${key}:${await clientIp()}`;
  const now = Date.now();
  const b = buckets.get(id);
  if (!b || b.reset < now) {
    buckets.set(id, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return true;
  }
  b.count++;
  return b.count <= limit;
}

/** For logins: only failed attempts count, so the owner logging in often is never locked out. */
export async function tooManyFailures(key: string, limit: number): Promise<boolean> {
  if (disabled()) return false;
  const b = buckets.get(`${key}:${await clientIp()}`);
  return !!b && b.reset >= Date.now() && b.count >= limit;
}

export async function recordFailure(key: string, windowMs: number) {
  if (disabled()) return;
  await rateLimit(key, Number.MAX_SAFE_INTEGER, windowMs);
}
