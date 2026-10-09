'use client';

import { useState } from 'react';
import { REGION_OPTIONS } from '@/lib/regionOptions';
import AuthorSelect from '../../AuthorSelect';

// New trips are created as DRAFTS: invisible to the public until published
// from the trip editor, but slotted into the nav menu and trip index by year
// the moment they go live. The optional overview map uploads to the
// uploads repo (kind=map) before the trip record is created.
export default function NewTripForm({ authors, defaultAuthor = '' }) {
  const [title, setTitle] = useState('');
  // Plain YYYY-MM-DD strings, exactly what <input type="date"> produces. The
  // trip's year is taken from the start date on the server.
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // No pre-selected region: a default is a silent choice, and a trip filed
  // under the wrong one lands in the wrong menu.
  const [region, setRegion] = useState('');
  const [menuLabel, setMenuLabel] = useState('');
  const [menuHover, setMenuHover] = useState('');
  // Whoever is signed in, not a hardcoded name.
  const [author, setAuthor] = useState(defaultAuthor);
  const [mapFile, setMapFile] = useState(null);
  const [status, setStatus] = useState(null); // null | 'saving' | 'error' | 'invalid'
  const [notice, setNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    setNotice('');
    setFieldErrors({});

    try {
      // Optional map first, so its URL can ride on the trip record.
      let mapImage;
      if (mapFile) {
        const form = new FormData();
        form.append('file', mapFile);
        form.append('kind', 'map');
        const mapRes = await fetch('/api/admin/photos', { method: 'POST', body: form });
        const mapData = await mapRes.json();
        if (!mapRes.ok) {
          setStatus('error');
          setNotice(
            mapData.error === 'file_exists'
              ? `${mapData.message} Rename the file (e.g. ${mapData.suggestion}) and try again.`
              : mapData.error || 'Map upload failed.'
          );
          return;
        }
        mapImage = mapData.url;
      }

      const res = await fetch('/api/admin/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          start_date: startDate,
          end_date: endDate || undefined,
          region,
          menu_label: menuLabel.trim(),
          menu_hover: menuHover.trim() || undefined,
          author: author.trim() || undefined,
          map_image: mapImage,
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
        setNotice('Create failed.');
        return;
      }
      const data = await res.json();
      if (data.git?.status === 'commit_failed') {
        setNotice('Created on disk but NOT committed to git — investigate before further edits.');
      }
      window.location.assign(`/admin/trips/${data.trip.nid}`);
    } catch {
      setStatus('error');
      setNotice('Create failed.');
    }
  }

  const fieldError = (name) =>
    fieldErrors[name] ? <p className="text-red-600 text-xs mt-1">{fieldErrors[name]}</p> : null;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 max-w-2xl">
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
        The new trip starts as a <strong>draft</strong> — only you can see it. Add its travelogue
        and stops, then publish it from the trip editor when it's ready.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='e.g. "2026 Yellowstone in Winter"'
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        {fieldError('title')}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trip dates</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label="Trip start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              aria-label="Trip end date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">The start year decides where the trip slots into the menu and index. Leave the end blank while the trip is under way.</p>
          {fieldError('start_date')}
          {fieldError('end_date')}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trip type</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="" disabled>Choose one…</option>
            {REGION_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {fieldError('region')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Menu label</label>
          <input
            value={menuLabel}
            onChange={(e) => setMenuLabel(e.target.value)}
            placeholder='e.g. "Yellowstone Winter"'
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
          <AuthorSelect value={author} onChange={setAuthor} authors={authors} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Overview map (optional)</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp"
            onChange={(e) => setMapFile(e.target.files?.[0] || null)}
            className="block w-full text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">The route map shown at the top of the trip page. Can be added later.</p>
        </div>
      </div>

      {notice && (
        <p className="text-red-700 text-sm font-semibold bg-red-50 border border-red-200 rounded px-3 py-2">{notice}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="bg-blue-600 text-white rounded px-4 py-2 font-semibold disabled:opacity-50"
        >
          {status === 'saving' ? 'Creating…' : 'Create Draft Trip'}
        </button>
        {status === 'invalid' && <span className="text-red-600 text-sm">Not created — fix the highlighted fields.</span>}
      </div>
    </form>
  );
}
