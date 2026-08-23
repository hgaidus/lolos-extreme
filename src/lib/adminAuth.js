import crypto from 'crypto';

const COOKIE_NAME = 'admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Deliberately no filesystem imports in this module: proxy.js validates a
// session on every single request to the site, and pulling the user store in
// there would read from disk on each one. Anything that needs user records
// (password checks, resets) lives in lib/adminUsers.js and is imported only by
// the API routes that need it.

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set');
  return secret;
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

// Usernames are constrained to this so they can be embedded in the token
// payload with "." as a separator without ambiguity.
export const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{1,30}$/;

// Token format: "<expiryMs>.<username>.<hmac>"
//
// The older single-user format was "<expiryMs>.<hmac>" with no username. That
// form is no longer accepted: it cannot say WHO is logged in, and once accounts
// exist an unattributed session is exactly the thing this change removes. The
// only cost is that anyone holding a pre-upgrade cookie logs in again.
export function createSessionToken(username) {
  const name = String(username || '').toLowerCase();
  if (!USERNAME_RE.test(name)) throw new Error('Invalid username for session');
  const exp = String(Date.now() + SESSION_TTL_MS);
  const payload = `${exp}.${name}`;
  return `${payload}.${sign(payload)}`;
}

function parse(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [exp, username, sig] = parts;
  if (!exp || !username || !sig) return null;
  if (!/^\d+$/.test(exp)) return null;
  if (!USERNAME_RE.test(username)) return null;
  if (Date.now() > Number(exp)) return null;

  const expected = sign(`${exp}.${username}`);
  if (expected.length !== sig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  return { exp: Number(exp), username };
}

export function isValidSessionToken(token) {
  try {
    return parse(token) !== null;
  } catch {
    // getSecret() throws when the env var is missing. Treat that as "not
    // authenticated" rather than letting a 500 escape from the proxy on every
    // request to the site.
    return false;
  }
}

export function getSessionUsername(token) {
  try {
    return parse(token)?.username ?? null;
  } catch {
    return null;
  }
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
