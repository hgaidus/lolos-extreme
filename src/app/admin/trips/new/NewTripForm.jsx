'use client';

import { useState } from 'react';

const REGION_OPTIONS = [
  { value: 'crossCountry', label: 'Cross Country' },
  { value: 'westCoast', label: 'West Coast' },
  { value: 'eastCoast', label: 'East Coast' },
  { value: 'international', label: 'International' },
];

// New trips are created as DRAFTS: invisible to the public until published
// from the trip editor, but slotted into the nav menu and trip index by year
// the moment they go live. The optional overview map uploads to the
// uploads repo (kind=map) before the trip record is created.
export default function NewTripForm({ authors }) {
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [yearTouched, setYearTouched] = useState(false);
  const [region, setRegion] = useState('westCoast');
  const [menuLabel, setMenuLabel] = useState('');
  const [menuHover, setMenuHover] = useState('');
  const [author, setAuthor] = useState('Lolo');
  const [mapFile, setMapFile] = useState(null);
  const [status, setStatus] = useState(null); // null | 'saving' | 'error' | 'invalid'
  const [notice, setNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  function onTitleChange(v) {
    setTitle(v);
    if (!yearTouched) {
      const m = v.match(/\b(19|20)\d\d\b/);
      if (m) setYear(m[0]);
    }
  }

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
          year,
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
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder='e.g. "2026 Yellowstone in Winter"'
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        {fieldError('title')}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <input
            value={year}
            onChange={(e) => { setYear(e.target.value); setYearTouched(true); }}
            className="w-32 border border-gray-300 rounded px-3 py-2"
          />
          <p className="text-xs text-gray-400 mt-1">Decides where the trip slots into the menu and index.</p>
          {fieldError('year')}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
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
          <input
            list="new-trip-authors"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <datalist id="new-trip-authors">
            {authors.map((a) => <option key={a} value={a} />)}
          </datalist>
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
