'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminForgotPage() {
  const [identifier, setIdentifier] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Enter your username or email address.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch (err) {
      setError('Something went wrong.');
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
          <h1 className="text-xl font-bold mb-3 text-gray-800">Check your email</h1>
          <p className="text-sm text-gray-700 mb-2">
            If that account exists, a reset link is on its way. It works once and
            expires in an hour.
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Nothing has changed yet — your current password still works until you
            set a new one.
          </p>
          <Link href="/admin/login" className="text-blue-600 hover:underline text-sm">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold mb-2 text-gray-800">Reset your password</h1>
        <p className="text-sm text-gray-600 mb-4">
          We&apos;ll email you a link to set a new one.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="identifier">
          Username or email
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
          autoFocus
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded px-3 py-2 font-semibold disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Email me a link'}
        </button>

        <p className="text-sm text-gray-600 mt-4 text-center">
          <Link href="/admin/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </form>
    </div>
  );
}
