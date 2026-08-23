import { NextResponse } from 'next/server';
import { listUsers, findUser, createUser, createResetToken, RESET_TOKEN_TTL_MS } from '@/lib/adminUsers';
import { USERNAME_RE } from '@/lib/adminAuth';
import { sendMail, resetEmail } from '@/lib/adminMailer';

const BASE_URL = process.env.SITE_BASE_URL || 'https://cross-country-trips.com';

// Everything here is already behind the admin session check in proxy.js, so
// these routes assume an authenticated caller. With two trusted accounts that
// is the right level: anyone who can edit the site can also manage who else
// can. If that ever stops being true this needs a role of some kind.

export async function GET() {
  return NextResponse.json({ users: listUsers() });
}

export async function POST(request) {
  try {
    const { username, email, name } = await request.json();

    const uname = String(username || '').trim().toLowerCase();
    if (!USERNAME_RE.test(uname)) {
      return NextResponse.json(
        { error: 'Username must be 2-31 characters: lowercase letters, numbers, hyphen or underscore, starting with a letter or number.' },
        { status: 400 },
      );
    }
    if (findUser(uname)) {
      return NextResponse.json({ error: 'That username already exists.' }, { status: 409 });
    }

    const mail = String(email || '').trim();
    // Deliberately loose. Anything stricter rejects addresses that are
    // perfectly valid, and the real test is whether the reset email arrives.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const display = String(name || '').trim() || uname;
    createUser({ username: uname, email: mail, name: display });

    // Send the set-password link straight away — an account with no password
    // and no invitation is just a row in a file.
    const token = createResetToken(uname);
    const url = `${BASE_URL}/admin/reset?token=${encodeURIComponent(token)}`;
    const { subject, text } = resetEmail({
      name: display, url, ttlMinutes: Math.round(RESET_TOKEN_TTL_MS / 60000),
    });
    const sent = await sendMail({ to: mail, subject, text });

    return NextResponse.json({
      ok: true,
      users: listUsers(),
      mailed: sent.ok,
      // If mail failed, hand the link back so the account is still usable —
      // the admin can pass it on another way rather than being stuck.
      link: sent.ok ? undefined : url,
    });
  } catch (err) {
    console.error('Error creating user:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
