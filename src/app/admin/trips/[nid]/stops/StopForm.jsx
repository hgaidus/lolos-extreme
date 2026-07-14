'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function toDateInputValue(unixSeconds) {
  if (!unixSeconds) return '';
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

function fromDateInputValue(dateStr) {
  if (!dateStr) return 0;
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000);
}

// mode: 'edit' (PATCH /api/admin/stops/:nid) or 'create' (POST /api/admin/trips/:tripNid/stops)
export default function StopForm({ mode, tripNid, stop, categories, states, authors }) {
  const router = useRouter();
  const [title, setTitle] = useState(stop?.title || '');
  const [description, setDescription] = useState(stop?.description || '');
  const [travelogue, setTravelogue] = useState(stop?.travelogue || '');
  const [miles, setMiles] = useState(stop?.miles ?? 0);
  const [hours, setHours] = useState(stop?.hours ?? 0);
  const [nights, setNights] = useState(stop?.nights ?? 0);
  const [arrivalDate, setArrivalDate] = useState(toDateInputValue(stop?.arrival_date));
  const [author, setAuthor] = useState(stop?.author || '');
  const [state, setState] = useState(stop?.state || '');
  const [category, setCategory] = useState(stop?.category || categories[0]);
  const [status, setStatus] = useState(null);
  const [gitWarning, setGitWarning] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    setGitWarning('');

    const fields = {
      title, description, travelogue,
      miles: Number(miles), hours: Number(hours), nights: Number(nights),
      arrival_date: fromDateInputValue(arrivalDate),
      author, state, category,
    };

    try {
      const url = mode === 'create' ? `/api/admin/trips/${tripNid}/stops` : `/api/admin/stops/${stop.nid}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const data = await res.json();
      if (data.git && !data.git.pushed) {
        setGitWarning('Saved, but not yet backed up to GitHub (push failed). The edit is safe on disk.');
      }
      if (mode === 'create') {
        router.push(`/admin/trips/${tripNid}/stops/${data.stop.nid}`);
        router.refresh();
      } else {
        setStatus('saved');
      }
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Short description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Travelogue</label>
        <textarea
          value={travelogue}
          onChange={(e) => setTravelogue(e.target.value)}
          rows={10}
          className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Miles</label>
          <input
            type="number" step="any" value={miles}
            onChange={(e) => setMiles(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
          <input
            type="number" step="any" value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nights</label>
          <input
            type="number" step="any" value={nights}
            onChange={(e) => setNights(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Arrival date</label>
          <input
            type="date" value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
          <input
            list="author-options" value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <datalist id="author-options">
            {authors.map((a) => <option key={a} value={a} />)}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State / Province / Country</label>
          <input
            list="state-options" value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <datalist id="state-options">
            {states.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {stop && (
        <div className="text-xs text-gray-400">
          Slug: <code>{stop.slug}</code> (not editable) &middot; nid {stop.nid}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="bg-blue-600 text-white rounded px-4 py-2 font-semibold disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving…' : mode === 'create' ? 'Create Stop' : 'Save'}
        </button>
        {status === 'saved' && <span className="text-green-700 text-sm">Saved &amp; pushed to GitHub</span>}
        {status === 'error' && <span className="text-red-600 text-sm">Save failed</span>}
      </div>
      {gitWarning && <p className="text-amber-700 text-sm">{gitWarning}</p>}
    </form>
  );
}
