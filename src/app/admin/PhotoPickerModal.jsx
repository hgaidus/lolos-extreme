'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Photo picker for the editor: choose an existing photo (this stop's first,
// falling back to the whole trip, with free search across everything) or
// upload a new one inline — then emit an [img_assist] tag at the cursor.
// Caption text is scrubbed of the shortcode's own delimiters (| and ]) so a
// caption can never break the tag it rides in.
const scrubCaption = (s) => s.replace(/\|/g, '/').replace(/\]/g, ')');

// Two modes, because the same "find or upload a photo" problem shows up in two
// places and the upload path (name collisions, near-duplicate detection, git
// commits) is far too much logic to duplicate:
//
//   default   — pick ONE photo, give it a caption and alignment, and emit an
//               [img_assist] tag through onInsert. Used by the travelogue editor.
//   onAddMany — pick SEVERAL photos and hand the raw records back. Used by the
//               album editor, where caption and alignment are meaningless
//               because the album lays photos out itself.
export default function PhotoPickerModal({ stopNid, tripNid, onInsert, onAddMany, onClose }) {
  const multi = typeof onAddMany === 'function';

  const [tab, setTab] = useState('existing'); // 'existing' | 'upload'
  const [photos, setPhotos] = useState([]);
  const [scope, setScope] = useState(''); // human-readable note on what's listed
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [chosen, setChosen] = useState([]); // multi mode: the accumulating set
  const [justUploaded, setJustUploaded] = useState(''); // confirmation after an upload
  const [caption, setCaption] = useState('');
  const [align, setAlign] = useState('right'); // the site's img_assist default

  // Upload tab state
  const [file, setFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadState, setUploadState] = useState('idle'); // idle | busy | error
  const [uploadNotice, setUploadNotice] = useState('');
  const [conflict, setConflict] = useState(null); // {kind:'file_exists',suggestion} | {kind:'possible_duplicate',matches}

  const dialogRef = useRef(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const load = useCallback(
    async (qNow) => {
      setLoading(true);
      try {
        // Free search spans everything; without a query, prefer this stop's
        // photos, then the trip's.
        const attempts = qNow
          ? [[{ q: qNow, limit: '60' }, `Search results for “${qNow}”`]]
          : [
              stopNid && [{ stop: String(stopNid), limit: '60' }, 'Photos from this stop'],
              tripNid && [{ trip: String(tripNid), limit: '60' }, 'Photos from this trip'],
              // No stop or trip to narrow by (the album picker): open on the
              // most recent uploads rather than an empty grid.
              !stopNid && !tripNid && [{ sort: 'recent', limit: '60' }, 'Most recent photos — search to find others'],
            ].filter(Boolean);
        let shown = false;
        for (const [params, label] of attempts) {
          const res = await fetch(`/api/admin/photos?${new URLSearchParams(params)}`);
          const data = await res.json();
          const results = data.results || [];
          // Show the first non-empty scope; if every scope is empty, show the
          // last one's (empty) result rather than stale photos.
          setPhotos(results);
          setScope(label);
          if (results.length > 0) {
            shown = true;
            break;
          }
        }
        if (attempts.length === 0 || (!shown && attempts.length > 0 && !qNow)) {
          if (attempts.length === 0) setPhotos([]);
          setScope('Type to search all photos');
        }
      } catch {
        setPhotos([]);
        setScope('Failed to load photos.');
      } finally {
        setLoading(false);
      }
    },
    [stopNid, tripNid]
  );

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(q.trim()), q ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [q, load]);

  // Multi mode keeps a running set that survives re-searching, so you can
  // gather photos from several different searches before adding them. Single
  // mode keeps its original behaviour exactly.
  function pick(photo) {
    if (multi) {
      setChosen((prev) =>
        prev.some((p) => String(p.image_nid) === String(photo.image_nid))
          ? prev.filter((p) => String(p.image_nid) !== String(photo.image_nid))
          : [...prev, photo]
      );
      return;
    }
    setSelected(photo);
    setCaption(photo.title || '');
  }

  const isChosen = (photo) => chosen.some((p) => String(p.image_nid) === String(photo.image_nid));

  function insertSelected() {
    if (!selected) return;
    const cap = scrubCaption(caption.trim() || selected.title || '');
    onInsert(`[img_assist|nid=${selected.image_nid}|title=${cap}|align=${align}]`);
  }

  async function doUpload(fileToSend, allowSimilar = false) {
    if (!fileToSend || !uploadTitle.trim()) {
      setUploadNotice('Choose a file and give it a title.');
      return;
    }
    setUploadState('busy');
    setUploadNotice('');
    setConflict(null);
    try {
      const form = new FormData();
      form.append('file', fileToSend);
      form.append('title', uploadTitle.trim());
      if (stopNid) form.append('trip_stop_nid', String(stopNid));
      if (allowSimilar) form.append('allowSimilar', 'yes');
      const res = await fetch('/api/admin/photos', { method: 'POST', body: form });
      const data = await res.json();
      if (res.status === 409 && data.error === 'file_exists') {
        setConflict({ kind: 'file_exists', suggestion: data.suggestion, message: data.message });
        setUploadState('idle');
        return;
      }
      if (res.status === 409 && data.error === 'possible_duplicate') {
        setConflict({ kind: 'possible_duplicate', matches: data.matches || [], message: data.message });
        setUploadState('idle');
        return;
      }
      if (!res.ok) {
        setUploadNotice(data.error || 'Upload failed.');
        setUploadState('error');
        return;
      }
      // Uploaded — flip straight to the insert panel with the new photo selected.
      pick({ image_nid: data.photo.image_nid, filename: data.photo.filename, title: data.photo.title });
      setTab('existing');
      setUploadState('idle');
      setFile(null);
      setConflict(null);
      if (multi) {
        // The grid still holds the list fetched before this upload, so without
        // a reload the photo you just added is nowhere on screen and the only
        // evidence it worked is a number in the footer — which reads exactly
        // like nothing happened. Re-running the search puts it at the top (it
        // has the highest image_nid) and shows it ticked.
        setJustUploaded(data.photo.title || data.photo.filename);
        setUploadTitle('');
        load(q.trim());
      }
      if (data.git?.status === 'commit_failed' || data.gitUploads?.status === 'commit_failed') {
        setUploadNotice('Uploaded but NOT committed to git — investigate before further edits.');
      }
    } catch {
      setUploadNotice('Upload failed.');
      setUploadState('error');
    }
  }

  // Retry a name collision under the server's suggested free name.
  function uploadRenamed() {
    if (!file || !conflict?.suggestion) return;
    doUpload(new File([file], conflict.suggestion, { type: file.type }));
  }

  const tabButton = (key, label) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`px-3 py-1.5 text-sm font-semibold ${tab === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={multi ? 'Add photos to album' : 'Insert photo'} className="bg-gray-50 rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex rounded overflow-hidden border border-gray-300">
            {tabButton('existing', 'Existing photo')}
            {tabButton('upload', 'Upload new')}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'existing' && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setJustUploaded(''); }}
                  placeholder="Search all photos by title or filename…"
                  className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
                <span className="text-xs text-gray-400 shrink-0">{loading ? 'Loading…' : scope}</span>
              </div>

              {justUploaded && (
                <p className="mb-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  Uploaded <strong>{justUploaded}</strong>{' '}— it&apos;s ticked below and counted in
                  your selection. Click <strong>Add to album</strong> to finish, or upload another.
                </p>
              )}
              <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((p) => (
                  <li key={p.image_nid}>
                    <button
                      type="button"
                      onClick={() => pick(p)}
                      aria-pressed={multi ? isChosen(p) : undefined}
                      className={`w-full text-left rounded-lg p-1 border-2 ${
                        (multi ? isChosen(p) : selected?.image_nid === p.image_nid)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={`/api/admin/photos/thumb?f=${encodeURIComponent(p.filename)}`}
                          alt={p.title || p.filename}
                          loading="lazy"
                          className="w-full h-20 object-cover rounded bg-gray-100"
                        />
                        {multi && isChosen(p) && (
                          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                            ✓
                          </span>
                        )}
                      </div>
                      <span className="block text-[11px] text-gray-600 truncate mt-0.5">{p.title || <em className="text-gray-400">untitled</em>}</span>
                    </button>
                  </li>
                ))}
                {!loading && photos.length === 0 && (
                  <li className="col-span-full text-sm text-gray-400 italic py-6 text-center">No photos found — try a search, or upload a new one.</li>
                )}
              </ul>
            </div>
          )}

          {tab === 'upload' && (
            <div className="space-y-3 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image file</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    setConflict(null);
                    if (f && !uploadTitle) {
                      setUploadTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim());
                    }
                  }}
                  className="block w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              {stopNid ? (
                <p className="text-xs text-gray-500">Will be assigned to this stop and added to the trip's album.</p>
              ) : multi ? (
                <p className="text-xs text-gray-500">
                  Uploads straight into your selection — click Add below to put it in this album. It
                  won&apos;t be tied to a trip stop; you can assign that later under Photos.
                </p>
              ) : (
                <p className="text-xs text-amber-700">No stop context — the photo will upload without a stop (assign later in Photos).</p>
              )}

              {conflict?.kind === 'file_exists' && (
                <div className="text-sm bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  <p className="text-amber-800">{conflict.message}</p>
                  <button type="button" onClick={uploadRenamed} className="mt-1 font-semibold text-blue-700 hover:underline">
                    Upload as {conflict.suggestion}
                  </button>
                </div>
              )}
              {conflict?.kind === 'possible_duplicate' && (
                <div className="text-sm bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  <p className="text-amber-800 mb-2">{conflict.message}</p>
                  <ul className="flex gap-2 mb-2">
                    {conflict.matches.slice(0, 4).map((m) => (
                      <li key={m.image_nid} className="w-20">
                        <img src={`/api/admin/photos/thumb?f=${encodeURIComponent(m.filename)}`} alt={m.title || m.filename} className="w-20 h-14 object-cover rounded bg-gray-100" />
                        <span className="block text-[10px] text-gray-600 truncate">{m.title}</span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => doUpload(file, true)} className="font-semibold text-blue-700 hover:underline">
                    It's a different picture — upload anyway
                  </button>
                </div>
              )}
              {uploadNotice && <p className="text-sm text-red-700">{uploadNotice}</p>}

              <button
                type="button"
                onClick={() => doUpload(file)}
                disabled={uploadState === 'busy' || !file || !uploadTitle.trim()}
                className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                {uploadState === 'busy' ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          )}
        </div>

        {multi && chosen.length > 0 && (
          <div className="border-t border-gray-200 bg-white rounded-b-lg px-4 py-3 flex flex-wrap items-center gap-3">
            <ul className="flex flex-wrap gap-1 flex-1 min-w-48">
              {chosen.slice(0, 8).map((p) => (
                <li key={p.image_nid}>
                  <img
                    src={`/api/admin/photos/thumb?f=${encodeURIComponent(p.filename)}`}
                    alt={p.title || p.filename}
                    className="h-10 w-14 object-cover rounded bg-gray-100"
                  />
                </li>
              ))}
              {chosen.length > 8 && (
                <li className="self-center text-xs text-gray-500">+{chosen.length - 8} more</li>
              )}
            </ul>
            <span className="text-sm text-gray-600 shrink-0">
              {chosen.length} selected
            </span>
            <button
              type="button"
              onClick={() => setChosen([])}
              className="text-sm text-gray-500 hover:text-gray-800 hover:underline shrink-0"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => onAddMany(chosen)}
              className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-semibold shrink-0"
            >
              Add {chosen.length} to album
            </button>
          </div>
        )}

        {!multi && selected && tab === 'existing' && (
          <div className="border-t border-gray-200 bg-white rounded-b-lg px-4 py-3 flex flex-wrap items-end gap-3">
            <img src={`/api/admin/photos/thumb?f=${encodeURIComponent(selected.filename)}`} alt="" className="h-12 w-16 object-cover rounded bg-gray-100 shrink-0" />
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Caption</label>
              <input value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>
            <fieldset className="shrink-0">
              <legend className="text-xs font-medium text-gray-600 mb-0.5">Align</legend>
              <div className="flex gap-2">
                {['left', 'center', 'right'].map((a) => (
                  <label key={a} className="flex items-center gap-1 text-sm text-gray-700">
                    <input type="radio" name="pp-align" value={a} checked={align === a} onChange={() => setAlign(a)} />
                    {a}
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="button" onClick={insertSelected} className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-semibold shrink-0">
              Insert
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
