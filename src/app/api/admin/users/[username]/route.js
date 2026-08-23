import { NextResponse } from 'next/server';
import {
  readUsers, writeUsers, listUsers, findUser,
  createResetToken, RESET_TOKEN_TTL_MS,
} from '@/lib/adminUsers';
import { sendMail, resetEmail } from '@/lib/adminMailer';
import { ADMIN_COOKIE_NAME, getSessionUsername } from '@/lib/adminAuth';

const BASE_URL = process.env.SITE_BASE_URL || 'https://cross-country-trips.com';

// POST = send this person a set-password link.
export async function POST(request, { params }) {
  try {
    const { username } = await params;
    const user = findUser(username);
    if (!user) return NextResponse.json({ error: 'No such account.' }, { status: 404 });
    if (!user.email) return NextResponse.json({ error: 'That account has no email address.' }, { status: 400 });

    const token = createResetToken(user.username);
    const url = `${BASE_URL}/admin/reset?token=${encodeURIComponent(token)}`;
    const { subject, text } = resetEmail({
      name: user.name || user.username,
      url,
      ttlMinutes: Math.round(RESET_TOKEN_TTL_MS / 60000),
    });
    const sent = await sendMail({ to: user.email, subject, text });

    return NextResponse.json({
      ok: true,
      mailed: sent.ok,
      link: sent.ok ? undefined : url,
    });
  } catch (err) {
    console.error('Error sending reset:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { username } = await params;
    const target = String(username || '').toLowerCase();

    const store = readUsers();
    const exists = store.users.some(u => String(u.username).toLowerCase() === target);
    if (!exists) return NextResponse.json({ error: 'No such account.' }, { status: 404 });

    // Two guards, both about not painting yourself into a corner.
    //
    // Removing your own account mid-session leaves you holding a valid cookie
    // for a user that no longer exists — confusing at best.
    const me = getSessionUsername(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (me && me === target) {
      return NextResponse.json(
        { error: 'You cannot remove the account you are signed in as.' },
        { status: 400 },
      );
    }
    // Removing the last account silently re-enables the ADMIN_PASSWORD
    // bootstrap, which is the shared-password arrangement this replaced.
    if (store.users.length <= 1) {
      return NextResponse.json(
        { error: 'This is the only account. Removing it would fall back to the old shared password.' },
        { status: 400 },
      );
    }

    store.users = store.users.filter(u => String(u.username).toLowerCase() !== target);
    writeUsers(store);
    return NextResponse.json({ ok: true, users: listUsers() });
  } catch (err) {
    console.error('Error removing user:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
