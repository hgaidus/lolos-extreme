'use client';

import { useState } from 'react';

export default function TripEditForm({ trip }) {
  const [title, setTitle] = useState(trip.title || '');
  const [year, setYear] = useState(trip.year || '');
  const [travelogue, setTravelogue] = useState(trip.travelogue || '');
  const [status, setStatus] = useState(null); // 'saving' | 'saved' | 'error'
  const [gitWarning, setGitWarning] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    setGitWarning('');
    try {
      const res = await fetch(`/api/admin/trips/${trip.nid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, year, travelogue }),
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const data = await res.json();
      if (data.git && !data.git.pushed) {
        setGitWarning('Saved, but not yet backed up to GitHub (push failed). The edit is safe on disk.');
      }
      setStatus('saved');
    } catch (err) {
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
        <input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-32 border border-gray-300 rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Travelogue</label>
        <textarea
          value={travelogue}
          onChange={(e) => setTravelogue(e.target.value)}
          rows={14}
          className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
        />
      </div>
      <div className="text-xs text-gray-400">
        Slug: <code>{trip.slug}</code> (not editable) &middot; nid {trip.nid}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="bg-blue-600 text-white rounded px-4 py-2 font-semibold disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && <span className="text-green-700 text-sm">Saved &amp; pushed to GitHub</span>}
        {status === 'error' && <span className="text-red-600 text-sm">Save failed</span>}
      </div>
      {gitWarning && <p className="text-amber-700 text-sm">{gitWarning}</p>}
    </form>
  );
}
