'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Searchable manager over the 7k-record photo registry. Rows edit in place;
// every save is one PATCH (and one git commit). The Orphans tab is the
// backfill workflow for the ~290 legacy photos that never got a stop.
export default function PhotoManager({ stopOptions, orphanCount }) {
  const [tab, setTab] = useState('all'); // 'all' | 'orphans'
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const debounceRef = useRef(null);

  const load = useCallback(async (tabNow, qNow) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (tabNow === 'orphans') params.set('orphans', '1');
      if (qNow) params.set('q', qNow);
      const res = await fetch(`/api/admin/photos?${params}`);
      const data = await res.json();
      setRows(data.results || []);
      setTotal(data.total || 0);
    } catch {
      setNotice('Failed to load photos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(tab, q), 350);
    return () => clearTimeout(debounceRef.current);
  }, [tab, q, load]);

  async function patchPhoto(imageNid, fields, rowUpdate) {
    setNotice('');
    try {
      const res = await fetch(`/api/admin/photos/${imageNid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error === 'Validation failed' ? Object.values(data.fields).join(' ') : data.error || 'Save failed.');
        return false;
      }
      setRows((prev) => prev.map((r) => (r.image_nid === imageNid ? { ...r, ...rowUpdate, references: data.references?.length ?? r.references } : r)));
      if (data.git?.status === 'commit_failed') setNotice('Saved to disk but NOT committed to git — investigate.');
      else if (data.git?.status === 'push_failed') setNotice('Saved; GitHub push failed (will ride along with the next successful save).');
      return true;
    } catch {
      setNotice('Save failed.');
      return false;
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex rounded overflow-hidden border border-gray-300">
          {[['all', 'All photos'], ['orphans', `No stop (${orphanCount})`]].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 text-sm font-semibold ${tab === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title or filename…"
          className="flex-1 min-w-52 border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
        <span className="text-xs text-gray-400">{loading ? 'Loading…' : `${rows.length} of ${total}`}</span>
      </div>

      {notice && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{notice}</p>}

      <datalist id="pm-stop-options">
        {stopOptions.map((s) => (
          <option key={s.nid} value={s.label} />
        ))}
      </datalist>

      <ul className="space-y-2">
        {rows.map((row) => (
          <PhotoRow key={row.image_nid} row={row} stopOptions={stopOptions} onPatch={patchPhoto} />
        ))}
        {!loading && rows.length === 0 && (
          <li className="text-sm text-gray-400 italic py-8 text-center">No photos match.</li>
        )}
      </ul>
    </div>
  );
}

function PhotoRow({ row, stopOptions, onPatch }) {
  const [title, setTitle] = useState(row.title || '');
  const [stopText, setStopText] = useState('');
  const [busy, setBusy] = useState(false);

  const dirtyTitle = title !== (row.title || '');

  async function saveTitle() {
    if (!dirtyTitle) return;
    setBusy(true);
    await onPatch(row.image_nid, { title }, { title });
    setBusy(false);
  }

  async function assignStop() {
    const match = stopOptions.find((s) => s.label === stopText);
    if (!match) return;
    setBusy(true);
    const ok = await onPatch(row.image_nid, { trip_stop_nid: match.nid }, { trip_stop_nid: match.nid, stopTitle: match.label });
    if (ok) setStopText('');
    setBusy(false);
  }

  async function togglePublished() {
    setBusy(true);
    await onPatch(row.image_nid, { published: !row.published }, { published: !row.published });
    setBusy(false);
  }

  return (
    <li className={`bg-white rounded-lg shadow p-3 flex flex-wrap items-center gap-3 ${row.published ? '' : 'opacity-70'}`}>
      <img
        src={`/api/admin/photos/thumb?f=${encodeURIComponent(row.filename)}`}
        alt={row.title || row.filename}
        loading="lazy"
        className="h-16 w-24 object-cover rounded bg-gray-100 shrink-0"
      />
      <div className="flex-1 min-w-56 space-y-1">
        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            className={`flex-1 border rounded px-2 py-1 text-sm ${dirtyTitle ? 'border-blue-400' : 'border-gray-200'}`}
            aria-label="Photo title"
          />
          {!row.published && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">Unpublished</span>
          )}
        </div>
        <div className="text-xs text-gray-400 break-all">{row.filename}</div>
        <div className="text-xs">
          {row.stopTitle ? (
            <span className="text-gray-600">Stop: <span className="font-medium">{row.stopTitle}</span></span>
          ) : (
            <span className="text-amber-700 font-semibold">No stop assigned</span>
          )}
          {typeof row.references === 'number' && row.references > 0 && (
            <span className="ml-2 text-gray-500">· embedded in {row.references} narrative{row.references > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            list="pm-stop-options"
            value={stopText}
            onChange={(e) => setStopText(e.target.value)}
            placeholder="Assign to stop (type to search)…"
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs"
            aria-label="Assign stop"
          />
          <button
            type="button"
            onClick={assignStop}
            disabled={busy || !stopOptions.some((s) => s.label === stopText)}
            className="text-xs font-semibold text-blue-700 disabled:opacity-40"
          >
            Assign
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={togglePublished}
        disabled={busy}
        className={`shrink-0 rounded px-3 py-1.5 text-xs font-semibold border ${
          row.published
            ? 'border-amber-300 text-amber-800 hover:bg-amber-50'
            : 'border-green-300 text-green-800 hover:bg-green-50'
        } disabled:opacity-40`}
        title={row.published ? 'Hide from galleries and albums (narrative embeds keep showing it)' : 'Restore to galleries and albums'}
      >
        {row.published ? 'Unpublish' : 'Publish'}
      </button>
    </li>
  );
}
