import { NextResponse } from 'next/server';
import { checkPassword, createSessionToken, ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE_SECONDS } from '@/lib/adminAuth';

export async function POST(request) {
  try {
    const { password } = await request.json();
    if (!checkPassword(password)) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, createSessionToken(), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
    });
    return response;
  } catch (err) {
    console.error('Error logging in:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
