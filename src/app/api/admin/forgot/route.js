import { NextResponse } from 'next/server';
import { findUser, createResetToken, RESET_TOKEN_TTL_MS } from '@/lib/adminUsers';
import { sendMail, resetEmail } from '@/lib/adminMailer';
import { rateLimit } from '@/lib/rateLimit';

const BASE_URL = process.env.SITE_BASE_URL || 'https://cross-country-trips.com';

export async function POST(request) {
  try {
    const { identifier } = await request.json();

    // Tighter than the login limit: sending mail costs something, and an
    // unthrottled reset endpoint is a way to flood someone's inbox.
    const limit = rateLimit(request, 'forgot', { max: 5, windowMs: 30 * 60 * 1000 });
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many reset requests. Try again later.' },
        { status: 429 },
      );
    }

    const id = String(identifier || '').trim().toLowerCase();

    // Accept either the username or the email address, since after a few months
    // nobody remembers which they registered.
    let user = findUser(id);
    if (!user && id.includes('@')) {
      const { readUsers } = await import('@/lib/adminUsers');
      user = readUsers().users.find(u => String(u.email || '').toLowerCase() === id) || null;
    }

    if (user && user.email) {
      const token = createResetToken(user.username);
      const url = `${BASE_URL}/admin/reset?token=${encodeURIComponent(token)}`;
      const { subject, text } = resetEmail({
        name: user.name || user.username,
        url,
        ttlMinutes: Math.round(RESET_TOKEN_TTL_MS / 60000),
      });
      const sent = await sendMail({ to: user.email, subject, text });
      if (!sent.ok) {
        // Log for us, but do not tell the caller — see below.
        console.error('[forgot] reset mail failed for', user.username, sent.error);
      }
    }

    // Always the same answer, whether or not the account exists. Otherwise this
    // endpoint becomes a way to enumerate who has CMS access.
    return NextResponse.json({
      ok: true,
      message: 'If that account exists, a reset link is on its way.',
    });
  } catch (err) {
    console.error('Error handling reset request:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
