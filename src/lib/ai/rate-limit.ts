/**
 * Per-user sliding-window limiter for AI endpoints.
 *
 * In-memory on purpose: the Gemini free tier is the real constraint (30 req/min)
 * and this keeps one impatient user from burning the shared quota. It is
 * per-instance, so a horizontally scaled deployment would move this to Redis /
 * Vercel KV — noted in the README as a known limitation rather than hidden.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;

const buckets = new Map<string, number[]>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((ts) => now - ts < WINDOW_MS);

  if (hits.length >= MAX_REQUESTS) {
    buckets.set(key, hits);
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - hits[0]!) };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Opportunistic cleanup so the map cannot grow unbounded on a long-lived instance.
  if (buckets.size > 500) {
    for (const [bucketKey, timestamps] of buckets) {
      if (timestamps.every((ts) => now - ts >= WINDOW_MS)) buckets.delete(bucketKey);
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}

/** Test helper: reset limiter state between cases. */
export function resetRateLimits() {
  buckets.clear();
}
