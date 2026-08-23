import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

// User records live OUTSIDE both git repos, on purpose.
//
// The obvious home would be exported_content/data alongside everything else,
// but every CMS save commits and pushes that directory to
// hgaidus/lolos-extreme-content — so password hashes would replicate to GitHub,
// to the NAS, and to every clone on every machine. They also must not sit
// inside app/, because a deploy swaps that whole directory and would delete
// them. So: a sibling of app/, which nothing else touches.
//
//   ~/new.cross-country-trips.com/auth/users.json
//
// Same relocatable-by-env-var shape as DATA_DIR in lib/dataPaths.js.
export const USERS_FILE = path.normalize(
  process.env.ADMIN_USERS_FILE || path.join(process.cwd(), '..', 'auth', 'users.json')
);

// scrypt parameters. N is the memory/CPU cost — 2^15 takes roughly 100ms on
// this host, which is unnoticeable on a login and expensive in bulk. Stored per
// record so these can be raised later without invalidating existing passwords.
const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64 };

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function emptyStore() {
  return { version: 1, users: [] };
}

export function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.users)) return emptyStore();
    return parsed;
  } catch {
    // Missing or unreadable is a normal state before seeding, not an error.
    return emptyStore();
  }
}

export function writeUsers(store) {
  const dir = path.dirname(USERS_FILE);
  fs.mkdirSync(dir, { recursive: true });
  // Write-then-rename so a crash mid-write can't leave a truncated file that
  // would lock everyone out. Mode 0600: readable only by the app's own user.
  const tmp = `${USERS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, USERS_FILE);
  try {
    fs.chmodSync(USERS_FILE, 0o600);
  } catch {
    // Best effort — some filesystems refuse chmod.
  }
}

export function findUser(username) {
  if (!username || typeof username !== 'string') return null;
  const key = username.trim().toLowerCase();
  return readUsers().users.find(u => String(u.username).toLowerCase() === key) || null;
}

export function listUsers() {
  // Never hands back hashes or reset tokens.
  return readUsers().users.map(u => ({
    username: u.username,
    email: u.email,
    name: u.name || u.username,
    hasPassword: !!u.password,
  }));
}

function upsert(store, username, mutate) {
  const key = String(username).toLowerCase();
  const existing = store.users.find(u => String(u.username).toLowerCase() === key);
  const target = existing || { username: key, createdAt: Date.now() };
  mutate(target);
  target.updatedAt = Date.now();
  if (!existing) store.users.push(target);
  return target;
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, SCRYPT.keylen, {
    N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p,
    // scrypt needs memory roughly 128 * N * r bytes; Node's default cap is
    // lower than that at N=32768, so raise it or the call throws.
    maxmem: 256 * SCRYPT.N * SCRYPT.r,
  });
  return { salt, hash: derived.toString('hex'), ...SCRYPT };
}

export async function verifyPassword(password, record) {
  if (!password || !record || !record.password) return false;
  const p = record.password;
  try {
    const derived = await scrypt(password, p.salt, p.keylen ?? SCRYPT.keylen, {
      N: p.N ?? SCRYPT.N, r: p.r ?? SCRYPT.r, p: p.p ?? SCRYPT.p,
      maxmem: 256 * (p.N ?? SCRYPT.N) * (p.r ?? SCRYPT.r),
    });
    const expected = Buffer.from(p.hash, 'hex');
    if (expected.length !== derived.length) return false;
    return crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

export async function setPassword(username, password) {
  const store = readUsers();
  const password_ = await hashPassword(password);
  upsert(store, username, u => {
    u.password = password_;
    u.reset = null; // setting a password consumes any outstanding reset
  });
  writeUsers(store);
}

export function createUser({ username, email, name }) {
  const store = readUsers();
  upsert(store, username, u => {
    u.email = email;
    u.name = name || u.name || username;
    if (!('password' in u)) u.password = null;
  });
  writeUsers(store);
}

// Reset tokens: the raw token goes in the email and is never stored. Only its
// SHA-256 lives on disk, so a copy of users.json does not let anyone mint a
// session — same reasoning as storing password hashes rather than passwords.
export function createResetToken(username) {
  const raw = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const store = readUsers();
  upsert(store, username, u => {
    u.reset = { tokenHash, expires: Date.now() + RESET_TTL_MS };
  });
  writeUsers(store);
  return raw;
}

export function consumeResetToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const store = readUsers();
  const user = store.users.find(u => {
    if (!u.reset || !u.reset.tokenHash) return false;
    const a = Buffer.from(u.reset.tokenHash);
    const b = Buffer.from(tokenHash);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
  if (!user) return null;
  if (Date.now() > Number(user.reset.expires)) {
    // Expired: clear it so a stale link can't be retried indefinitely.
    user.reset = null;
    writeUsers(store);
    return null;
  }
  return user.username;
}

export function peekResetToken(rawToken) {
  // Validity check for rendering the "set your password" form, without
  // consuming anything — consumption happens on submit.
  return consumeResetToken(rawToken);
}

export const RESET_TOKEN_TTL_MS = RESET_TTL_MS;
