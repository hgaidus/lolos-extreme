'use client';

import { useState } from 'react';

export default function UsersManager({ initialUsers, currentUser }) {
  const [users, setUsers] = useState(initialUsers);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [manualLink, setManualLink] = useState('');

  function reportMail(data, who) {
    if (data.mailed) {
      setNotice(`Set-password link emailed to ${who}. It works once and expires in an hour.`);
      setManualLink('');
    } else {
      // Mail failed — surface the link rather than leaving a dead account.
      setNotice(`Could not send the email to ${who}. Pass this link on directly:`);
      setManualLink(data.link || '');
    }
  }

  async function addUser(e) {
    e.preventDefault();
    setError(''); setNotice(''); setManualLink('');
    if (!username.trim() || !email.trim()) {
      setError('Username and email are both required.');
      return;
    }
    setBusy('add');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Could not create the account.'); return; }
      setUsers(data.users);
      setUsername(''); setEmail(''); setName('');
      reportMail(data, email);
    } catch {
      setError('Could not create the account.');
    } finally {
      setBusy('');
    }
  }

  async function sendLink(u) {
    setError(''); setNotice(''); setManualLink('');
    setBusy(`link:${u.username}`);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.username)}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Could not send the link.'); return; }
      reportMail(data, u.email);
    } catch {
      setError('Could not send the link.');
    } finally {
      setBusy('');
    }
  }

  async function removeUser(u) {
    setError(''); setNotice(''); setManualLink('');
    if (!confirm(`Remove the account "${u.username}"? They will lose access immediately.`)) return;
    setBusy(`del:${u.username}`);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.username)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Could not remove the account.'); return; }
      setUsers(data.users);
      setNotice(`Removed ${u.username}.`);
    } catch {
      setError('Could not remove the account.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow divide-y divide-gray-200 mb-6">
        {users.map((u) => (
          <div key={u.username} className="flex items-center justify-between px-4 py-3 gap-4">
            <div className="min-w-0">
              <div className="font-medium text-gray-800">
                {u.name}
                <span className="text-gray-500 font-normal"> — {u.username}</span>
                {u.username === currentUser && (
                  <span className="ml-2 text-xs bg-gray-200 text-gray-700 rounded px-1.5 py-0.5">you</span>
                )}
              </div>
              <div className="text-sm text-gray-500 truncate">{u.email}</div>
              {!u.hasPassword && (
                <div className="text-xs text-amber-700 mt-0.5">
                  No password set yet — they need a link before they can sign in.
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => sendLink(u)}
                disabled={busy !== ''}
                className="text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
              >
                {busy === `link:${u.username}` ? 'Sending…' : u.hasPassword ? 'Send reset link' : 'Send set-password link'}
              </button>
              <button
                onClick={() => removeUser(u)}
                disabled={busy !== '' || u.username === currentUser || users.length <= 1}
                title={u.username === currentUser ? 'You cannot remove your own account' : users.length <= 1 ? 'This is the only account' : ''}
                className="text-sm border border-red-300 text-red-700 rounded px-3 py-1.5 hover:bg-red-50 disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {notice && <p className="text-green-700 text-sm mb-2">{notice}</p>}
      {manualLink && (
        <p className="text-xs font-mono break-all bg-gray-100 border border-gray-300 rounded p-2 mb-4">
          {manualLink}
        </p>
      )}

      <form onSubmit={addUser} className="bg-white rounded-lg shadow p-4">
        <h2 className="font-bold text-gray-800 mb-1">Add an account</h2>
        <p className="text-sm text-gray-600 mb-3">
          They set their own password from a link we email — you never type it
          for them.
        </p>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="tommy"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tommy"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">Used in bylines.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="name@example.com"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy !== ''}
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy === 'add' ? 'Creating…' : 'Create account and email a link'}
        </button>
      </form>
    </div>
  );
}
