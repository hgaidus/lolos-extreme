// Small in-memory throttle for the auth endpoints.
//
// Deliberately modest in its claims: Passenger may run several workers, and
// each holds its own counter, so the real ceiling is (max x workers). That is
// still the difference between an attacker getting ~10 guesses per window and
// getting unlimited ones, which is the point. Anything stronger would need
// shared state, and this site has no database to put it in.
//
// Memory is bounded by pruning expired buckets on every call.
const buckets = new Map();

function clientKey(request) {
  // Behind nginx the client address arrives forwarded; take the leftmost entry,
  // which is the original client. Same reasoning as X-Forwarded-Proto in
  // proxy.js — intermediate proxies append, so the last one is nearest to us.
  const fwd = request.headers.get('x-forwarded-for') || '';
  const first = fwd.split(',')[0].trim();
  return first || request.headers.get('x-real-ip') || 'unknown';
}

export function rateLimit(request, scope, { max = 10, windowMs = 600000 } = {}) {
  const now = Date.now();
  const key = `${scope}:${clientKey(request)}`;

  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  return { ok: true, remaining: max - bucket.count };
}
