import { NextResponse } from 'next/server';
import { consumeResetToken, setPassword, findUser } from '@/lib/adminUsers';
import { createSessionToken, ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE_SECONDS } from '@/lib/adminAuth';
import { rateLimit } from '@/lib/rateLimit';

const MIN_LENGTH = 12;

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    const limit = rateLimit(request, 'reset', { max: 10, windowMs: 30 * 60 * 1000 });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    // A single minimum-length rule rather than a character-class policy.
    // Length is what actually resists guessing, and composition rules mostly
    // push people toward Password1! — which is worse than a long passphrase.
    if (typeof password !== 'string' || password.length < MIN_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_LENGTH} characters.` },
        { status: 400 },
      );
    }

    // Consumes the token: valid exactly once, and already expired-and-cleared
    // if it aged out.
    const username = consumeResetToken(token);
    if (!username) {
      return NextResponse.json(
        { error: 'That link has expired or has already been used. Request a new one.' },
        { status: 400 },
      );
    }

    await setPassword(username, password);

    // Log them straight in — they have just proven control of the mailbox and
    // chosen a password, so a second login form here would be ceremony.
    const user = findUser(username);
    const response = NextResponse.json({ ok: true, username });
    response.cookies.set(ADMIN_COOKIE_NAME, createSessionToken(user.username), {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
    });
    return response;
  } catch (err) {
    console.error('Error resetting password:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
