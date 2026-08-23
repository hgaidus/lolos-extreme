'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Login failed');
        setSubmitting(false);
        return;
      }
      // Hard navigation (not router.push) — forces a fresh full-page load of
      // /admin carrying the just-set cookie. Soft navigation + the statically
      // prerendered login page raced unreliably in the standalone prod build.
      window.location.assign('/admin');
    } catch (err) {
      setError('Login failed');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4 text-gray-800">Admin Login</h1>

        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded px-3 py-2 font-semibold disabled:opacity-50"
        >
          {submitting ? 'Logging in…' : 'Log In'}
        </button>

        <p className="text-sm text-gray-600 mt-4 text-center">
          <Link href="/admin/forgot" className="text-blue-600 hover:underline">
            Forgot your password?
          </Link>
        </p>
      </form>
    </div>
  );
}
