import { NextResponse } from 'next/server';
import { createSessionToken, ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE_SECONDS } from '@/lib/adminAuth';
import { findUser, verifyPassword, readUsers } from '@/lib/adminUsers';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    // Throttled per IP. scrypt already makes each guess expensive, but a
    // ceiling on attempts is what stops someone grinding a weak password.
    const limit = rateLimit(request, 'login', { max: 10, windowMs: 10 * 60 * 1000 });
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in a few minutes.' },
        { status: 429 },
      );
    }

    const store = readUsers();

    // Bootstrap: before any account exists, fall back to the old single
    // ADMIN_PASSWORD so the site is never locked out mid-migration. The moment
    // one account exists this branch is dead, which closes the shared-password
    // path automatically rather than relying on anyone remembering to.
    if (store.users.length === 0) {
      const expected = process.env.ADMIN_PASSWORD;
      if (expected && password && password === expected) {
        const response = NextResponse.json({ ok: true, bootstrap: true });
        response.cookies.set(ADMIN_COOKIE_NAME, createSessionToken('admin'), {
          httpOnly: true, secure: true, sameSite: 'lax', path: '/',
          maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
        });
        return response;
      }
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const user = findUser(username);
    // Verify against the found record, or burn equivalent time against a dummy
    // so that "no such user" and "wrong password" are not distinguishable by
    // how long the response takes.
    const ok = user
      ? await verifyPassword(password, user)
      : await verifyPassword(password, { password: null });

    if (!ok) {
      return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, username: user.username });
    response.cookies.set(ADMIN_COOKIE_NAME, createSessionToken(user.username), {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
    });
    return response;
  } catch (err) {
    console.error('Error logging in:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
