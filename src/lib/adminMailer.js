import { spawn } from 'child_process';

// Mail goes out through the host's own sendmail binary rather than an SMTP
// library. Verified present at /usr/sbin/sendmail on this server, with
// localhost:25/587/465 open, and the domain's SPF already authorises
// InMotion's relay (v=spf1 +a +mx include:relay.mailchannels.net ~all) — which
// is what keeps this out of Gmail's spam folder.
//
// That means no nodemailer dependency in the auth path, no SMTP credentials to
// store, and one less secret to leak. The cost is that it only works on a host
// with a local MTA; in development there is none, so we fall back to logging
// the message and reporting failure honestly rather than pretending to send.
const SENDMAIL = process.env.SENDMAIL_PATH || '/usr/sbin/sendmail';

export const MAIL_FROM =
  process.env.ADMIN_MAIL_FROM ||
  'Cross Country Trips <no-reply@cross-country-trips.com>';

function headerSafe(value) {
  // Strips CR/LF so a crafted name or address cannot inject extra headers.
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

export async function sendMail({ to, subject, text }) {
  const message = [
    `From: ${headerSafe(MAIL_FROM)}`,
    `To: ${headerSafe(to)}`,
    `Subject: ${headerSafe(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Auto-Submitted: auto-generated',
    '',
    String(text).replace(/\r?\n/g, '\r\n'),
    '',
  ].join('\r\n');

  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(SENDMAIL, ['-t', '-i'], { stdio: ['pipe', 'ignore', 'pipe'] });
    } catch (err) {
      console.error('[mail] could not start sendmail:', err.message);
      console.error('[mail] message that would have been sent:\n' + message);
      resolve({ ok: false, error: 'no-sendmail' });
      return;
    }

    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });

    child.on('error', (err) => {
      console.error('[mail] sendmail failed:', err.message);
      console.error('[mail] message that would have been sent:\n' + message);
      resolve({ ok: false, error: 'spawn-failed' });
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true });
      } else {
        console.error(`[mail] sendmail exited ${code}: ${stderr.trim()}`);
        resolve({ ok: false, error: `exit-${code}` });
      }
    });

    child.stdin.end(message);
  });
}

export function resetEmail({ name, url, ttlMinutes }) {
  return {
    subject: 'Set your password for the Cross Country Trips CMS',
    text: [
      `Hello ${name},`,
      '',
      'Use the link below to set a new password for the site admin:',
      '',
      url,
      '',
      `The link works once and expires in ${ttlMinutes} minutes.`,
      '',
      "If you did not ask for this, you can ignore this email — nothing has",
      'changed and the existing password still works.',
      '',
      '— cross-country-trips.com',
    ].join('\n'),
  };
}
