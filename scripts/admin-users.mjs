// Manage CMS accounts from the command line.
//
// Deliberately the only way to create an account: there is no public signup,
// because an open "register" form on a live CMS lets anyone in. Accounts are
// seeded here, and each person sets their own password through the emailed
// reset link — so no password is ever typed by one person on another's behalf,
// or read by whoever ran this script.
//
//   node scripts/admin-users.mjs list
//   node scripts/admin-users.mjs add <username> <email> [full name]
//   node scripts/admin-users.mjs link <username>     # print a reset URL
//   node scripts/admin-users.mjs email <username>    # send the reset email
//   node scripts/admin-users.mjs remove <username>
//
// On the server, run it from the app directory so ADMIN_USERS_FILE resolves:
//   cd ~/new.cross-country-trips.com/app && node scripts/admin-users.mjs list
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
process.env.ADMIN_USERS_FILE ||= path.resolve(here, '..', '..', 'auth', 'users.json');

const {
  readUsers, writeUsers, listUsers, createUser, findUser,
  createResetToken, RESET_TOKEN_TTL_MS, USERS_FILE,
} = await import('../src/lib/adminUsers.js');

const BASE_URL = process.env.SITE_BASE_URL || 'https://cross-country-trips.com';
const [, , cmd, ...args] = process.argv;

function usage() {
  console.log('usage: admin-users.mjs list | add <user> <email> [name] | link <user> | email <user> | remove <user>');
  console.log('store:', USERS_FILE);
}

switch (cmd) {
  case 'list': {
    const users = listUsers();
    console.log('store:', USERS_FILE);
    if (!users.length) {
      console.log('  (no accounts yet — the ADMIN_PASSWORD bootstrap is still active)');
      break;
    }
    for (const u of users) {
      console.log(`  ${u.username.padEnd(12)} ${String(u.email).padEnd(30)} ${u.hasPassword ? 'password set' : 'NO PASSWORD YET'}`);
    }
    break;
  }

  case 'add': {
    const [username, email, ...nameParts] = args;
    if (!username || !email) { usage(); process.exit(1); }
    createUser({ username, email, name: nameParts.join(' ') || username });
    console.log(`added ${username} <${email}> with no password.`);
    console.log('Next: send them a link with');
    console.log(`  node scripts/admin-users.mjs email ${username}`);
    break;
  }

  case 'link': {
    const [username] = args;
    const user = findUser(username);
    if (!user) { console.error(`no such user: ${username}`); process.exit(1); }
    const token = createResetToken(user.username);
    console.log(`${BASE_URL}/admin/reset?token=${encodeURIComponent(token)}`);
    console.log(`(valid once, expires in ${Math.round(RESET_TOKEN_TTL_MS / 60000)} minutes)`);
    break;
  }

  case 'email': {
    const [username] = args;
    const user = findUser(username);
    if (!user) { console.error(`no such user: ${username}`); process.exit(1); }
    if (!user.email) { console.error(`${username} has no email address`); process.exit(1); }
    const { sendMail, resetEmail } = await import('../src/lib/adminMailer.js');
    const token = createResetToken(user.username);
    const url = `${BASE_URL}/admin/reset?token=${encodeURIComponent(token)}`;
    const { subject, text } = resetEmail({
      name: user.name || user.username,
      url,
      ttlMinutes: Math.round(RESET_TOKEN_TTL_MS / 60000),
    });
    const res = await sendMail({ to: user.email, subject, text });
    console.log(res.ok ? `sent to ${user.email}` : `FAILED (${res.error}) — the link is:\n  ${url}`);
    break;
  }

  case 'remove': {
    const [username] = args;
    const store = readUsers();
    const before = store.users.length;
    store.users = store.users.filter(u => String(u.username).toLowerCase() !== String(username).toLowerCase());
    if (store.users.length === before) { console.error(`no such user: ${username}`); process.exit(1); }
    writeUsers(store);
    console.log(`removed ${username}. ${store.users.length} account(s) left.`);
    if (!store.users.length) console.log('WARNING: no accounts remain — the ADMIN_PASSWORD bootstrap is active again.');
    break;
  }

  default:
    usage();
}
