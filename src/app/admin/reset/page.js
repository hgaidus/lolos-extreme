'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PasswordField from '@/components/PasswordField';

const MIN_LENGTH = 12;

function ResetForm() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not set your password.');
        setSubmitting(false);
        return;
      }
      // The reset route signs us in, so go straight to the CMS. Hard
      // navigation for the same reason as the login page.
      window.location.assign('/admin');
    } catch (err) {
      setError('Could not set your password.');
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold mb-3 text-gray-800">Link not valid</h1>
        <p className="text-sm text-gray-700 mb-4">
          This page needs a reset link from your email.
        </p>
        <Link href="/admin/forgot" className="text-blue-600 hover:underline text-sm">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
      <h1 className="text-xl font-bold mb-2 text-gray-800">Set your password</h1>
      <p className="text-sm text-gray-600 mb-4">
        At least {MIN_LENGTH} characters. A memorable phrase beats a short
        complicated one.
      </p>

      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
        New password
      </label>
      <div className="mb-3">
        <PasswordField
          id="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          autoFocus
        />
      </div>

      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirm">
        Confirm password
      </label>
      <div className="mb-3">
        <PasswordField
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(''); }}
        />
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white rounded px-3 py-2 font-semibold disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Set password and sign in'}
      </button>
    </form>
  );
}

export default function AdminResetPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Suspense fallback={<div className="text-sm text-gray-600">Loading…</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
