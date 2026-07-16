'use client';

import { useState } from 'react';
import EditorPane from '../../EditorPane';

export default function TripEditForm({ trip }) {
  const [title, setTitle] = useState(trip.title || '');
  const [year, setYear] = useState(trip.year || '');
  const [menuLabel, setMenuLabel] = useState(trip.menu_label || '');
  const [menuHover, setMenuHover] = useState(trip.menu_hover || '');
  const [travelogue, setTravelogue] = useState(trip.travelogue || '');
  const [published, setPublished] = useState(trip.published !== false);
  const [status, setStatus] = useState(null); // 'saving' | 'saved' | 'error' | 'invalid'
  const [gitWarning, setGitWarning] = useState('');
  const [gitError, setGitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    setGitWarning('');
    setGitError('');
    setFieldErrors({});
    try {
      const res = await fetch(`/api/admin/trips/${trip.nid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, year, travelogue, published,
          // Menu fields only ride along when the trip has them (all trips do
          // post-backfill, but stay safe for any hand-made record).
          ...(menuLabel ? { menu_label: menuLabel, menu_hover: menuHover || title } : {}),
        }),
      });
      if (res.status === 400) {
        const data = await res.json();
        setFieldErrors(data.fields || {});
        setStatus('invalid');
        return;
      }
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const data = await res.json();
      const gitStatus = data.git?.status;
      if (gitStatus === 'commit_failed') {
        setGitError('Saved to disk but NOT committed to git — the change is unversioned. Stop and investigate before further edits.');
      } else if (gitStatus === 'push_failed') {
        setGitWarning('Saved, but not yet backed up to GitHub (push failed). The edit is safe on disk.');
      }
      setStatus('saved');
    } catch (err) {
      setStatus('error');
    }
  }

  const fieldError = (name) =>
    fieldErrors[name] ? <p className="text-red-600 text-xs mt-1">{fieldErrors[name]}</p> : null;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        {fieldError('title')}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
        <input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-32 border border-gray-300 rounded px-3 py-2"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Menu label</label>
          <input
            value={menuLabel}
            onChange={(e) => setMenuLabel(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <p className={`text-xs mt-1 ${menuLabel.length > 22 ? 'text-amber-700' : 'text-gray-400'}`}>
            Shown in the nav dropdown — {menuLabel.length}/22 characters is comfortable.
          </p>
          {fieldError('menu_label')}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Menu hover text</label>
          <input
            value={menuHover}
            onChange={(e) => setMenuHover(e.target.value)}
            placeholder={title || 'Defaults to the title'}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
      </div>
      <EditorPane
        label="Travelogue"
        value={travelogue}
        onChange={setTravelogue}
        previewType="trip"
        tripNid={trip.nid}
        rows={20}
      />
      <div className="flex items-start gap-2 border-t border-gray-100 pt-4">
        <input
          id="trip-published"
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <label htmlFor="trip-published" className="text-sm text-gray-700">
          <span className="font-medium">Published</span> — visible to the public.
          {!published && (
            <span className="block text-xs text-amber-700 mt-0.5">
              Draft: only you (logged in) can view this trip at its URL; it stays out of
              region listings, search, and the sitemap until published. (Its stops keep
              their own individual flags.)
            </span>
          )}
        </label>
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
        {status === 'invalid' && <span className="text-red-600 text-sm">Not saved — fix the highlighted fields.</span>}
      </div>
      {gitWarning && <p className="text-amber-700 text-sm">{gitWarning}</p>}
      {gitError && (
        <p className="text-red-700 text-sm font-semibold bg-red-50 border border-red-200 rounded px-3 py-2">
          {gitError}
        </p>
      )}
    </form>
  );
}
