'use client';

import { useState } from 'react';

// Reorder with ▲/▼ buttons (keyboard-friendly, dependency-free), cover = the
// first image, remove-from-album leaves the photo's record and file intact.
// Changes stage locally; Save writes the whole images[] in one PATCH/commit.
export default function AlbumEditor({ tid, initialTitle, initialImages, slug }) {
  const [title, setTitle] = useState(initialTitle);
  const [images, setImages] = useState(initialImages);
  const [status, setStatus] = useState(null); // null|'saving'|'saved'|'error'
  const [notice, setNotice] = useState('');

  const dirty =
    title !== initialTitle ||
    images.length !== initialImages.length ||
    images.some((img, i) => img.image_nid !== initialImages[i]?.image_nid);

  const move = (idx, delta) => {
    setImages((prev) => {
      const next = [...prev];
      const j = idx + delta;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const makeCover = (idx) => {
    setImages((prev) => [prev[idx], ...prev.slice(0, idx), ...prev.slice(idx + 1)]);
  };

  const remove = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  async function save() {
    setStatus('saving');
    setNotice('');
    try {
      const res = await fetch(`/api/admin/albums/${tid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, images: images.map((i) => ({ image_nid: i.image_nid })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setNotice(data.error === 'Validation failed' ? Object.values(data.fields).join(' ') : data.error || 'Save failed.');
        return;
      }
      setStatus('saved');
      if (data.git?.status === 'commit_failed') setNotice('Saved to disk but NOT committed to git — investigate.');
      else if (data.git?.status === 'push_failed') setNotice('Saved; GitHub push failed (backup deferred).');
      // Hard reload so server truth (incl. initialImages) is re-established.
      window.location.reload();
    } catch {
      setStatus('error');
      setNotice('Save failed.');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mt-2 mb-4">
        <div className="flex-1 min-w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">Album title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || status === 'saving'}
          className="bg-blue-600 text-white rounded px-4 py-2 font-semibold disabled:opacity-40"
        >
          {status === 'saving' ? 'Saving…' : 'Save changes'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-1">Slug: <code>{slug}</code> · {images.length} photos · the first photo is the album cover.</p>
      {notice && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{notice}</p>}
      {dirty && status !== 'saving' && (
        <p className="text-sm text-amber-700 mb-3">Unsaved changes — click Save to write them.</p>
      )}

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img, idx) => (
          <li key={img.image_nid} className="bg-white rounded-lg shadow p-2">
            <div className="relative">
              <img src={`/api/admin/photos/thumb?f=${encodeURIComponent(img.filename)}`} alt={img.title || img.filename} loading="lazy" className="w-full h-28 object-cover rounded bg-gray-100" />
              {idx === 0 && (
                <span className="absolute top-1 left-1 rounded bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5">COVER</span>
              )}
            </div>
            <div className="text-xs text-gray-700 truncate mt-1" title={img.title}>{img.title || <span className="italic text-gray-400">untitled</span>}</div>
            <div className="flex items-center gap-1 mt-1">
              <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move earlier" className="border border-gray-200 rounded px-1.5 text-xs disabled:opacity-30">▲</button>
              <button type="button" onClick={() => move(idx, 1)} disabled={idx === images.length - 1} aria-label="Move later" className="border border-gray-200 rounded px-1.5 text-xs disabled:opacity-30">▼</button>
              {idx !== 0 && (
                <button type="button" onClick={() => makeCover(idx)} className="border border-gray-200 rounded px-1.5 text-[11px] text-blue-700">Make cover</button>
              )}
              <button
                type="button"
                onClick={() => remove(idx)}
                className="ml-auto border border-gray-200 rounded px-1.5 text-[11px] text-amber-700"
                title="Remove from this album only — the photo and its record are kept"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
