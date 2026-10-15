'use client';

import { useState, useEffect, useRef } from 'react';

// Link dialog for the editor: the words to show, and where they go. The
// destination is found by typing a title ("picking up lola"), a nid ("12181"),
// or an address; a trip, stop or page is written as href="internal:node/N" —
// the same form as the Drupal-era links already in the content, resolved to the
// real address whenever the page is shown — and anything else as typed.
//
// Opened on an existing link (caret inside it, or it selected), it edits that
// link in place, and can take the link off and leave the words.

const KIND_LABEL = { trip: 'Trip', stop: 'Stop', page: 'Page' };
const isWebAddress = (s) => /^(https?:\/\/|mailto:)\S+$/i.test(s) && !/^https?:\/\/(www\.)?cross-country-trips\.com(\/|$)/i.test(s);
const isSitePath = (s) => /^\/\S*$/.test(s) || /^https?:\/\/(www\.)?cross-country-trips\.com(\/|$)/i.test(s);
const webTarget = (s) => (isWebAddress(s) ? { kind: 'address', href: s } : null);
// Quotes would end the href attribute early; nothing else needs escaping there.
const safeHref = (s) => s.replace(/"/g, '%22');

/** Where an existing href points, as something the destination box can search for. */
function destinationFromHref(href) {
  const m = String(href || '').match(/^(?:internal:|entity:)?\/?node\/(\d+)$/i);
  if (m) return m[1];
  return String(href || '').replace(/^internal:\/?/i, '/');
}

export default function LinkModal({ initialText = '', initialHref = '', editing = false, onInsert, onRemove, onClose }) {
  const [text, setText] = useState(initialText);
  // An empty link whose words are an address (typing the address as the text
  // is the easy mistake to make) starts with that address as the destination.
  const [dest, setDest] = useState(() =>
    initialHref ? destinationFromHref(initialHref) : isSitePath(initialText.trim()) || isWebAddress(initialText.trim()) ? initialText.trim() : ''
  );
  const [results, setResults] = useState([]);
  const [chosen, setChosen] = useState(() => webTarget(dest.trim())); // a target {nid,kind,title,…} | {kind:'address', href}
  const [state, setState] = useState('idle'); // idle | loading | error
  const textRef = useRef(null);
  const destRef = useRef(null);
  const seq = useRef(0);

  useEffect(() => {
    // Start where the work is: the words if there are none yet, else where they go.
    (initialText.trim() ? destRef : textRef).current?.focus();
  }, [initialText]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Typing a new destination drops the old choice and matches at once; a web
  // address needs no lookup and is chosen as it stands.
  function changeDest(next) {
    setDest(next);
    setResults([]);
    setChosen(webTarget(next.trim()));
  }

  // Look the destination up (debounced) unless it is empty or a web address.
  useEffect(() => {
    const q = dest.trim();
    if (!q || isWebAddress(q)) return undefined;
    const timer = setTimeout(async () => {
      const mine = ++seq.current;
      setState('loading');
      try {
        const res = await fetch(`/api/admin/link-targets?${new URLSearchParams({ q })}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (mine !== seq.current) return;
        setResults(data.results || []);
        if (data.exact) setChosen(data.exact);
        // An address on this site that is not a trip, stop or page (the
        // albums index, a category) is still a fine link, kept as typed.
        else if (isSitePath(q)) setChosen({ kind: 'address', href: q.replace(/^https?:\/\/(www\.)?cross-country-trips\.com/i, '') || '/' });
        setState('idle');
      } catch {
        if (mine === seq.current) setState('error');
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [dest]);

  function choose(target) {
    setChosen(target);
    if (!text.trim()) setText(target.title);
  }

  const hrefFor = (c) => (c.kind === 'address' ? safeHref(c.href) : `internal:node/${c.nid}`);
  const canInsert = Boolean(chosen && text.trim());

  function submit() {
    if (canInsert) onInsert(`<a href="${hrefFor(chosen)}">${text.trim()}</a>`);
  }

  // This dialog is rendered inside the edit page's <form>, so it must not be a
  // form itself, and Enter in its boxes must not reach the page's form — that
  // would save the page. Enter inserts the link instead.
  const onEnter = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    submit();
  };

  const field = 'w-full border border-gray-300 rounded px-3 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={editing ? 'Edit link' : 'Insert link'} className="bg-gray-50 rounded-lg shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-800">{editing ? 'Edit link' : 'Insert link'}</div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label htmlFor="link-text" className="block text-sm font-medium text-gray-700 mb-1">Text to show</label>
            <input id="link-text" ref={textRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onEnter} className={field} placeholder="e.g. Lola's first trip home" />
          </div>

          <div>
            <label htmlFor="link-dest" className="block text-sm font-medium text-gray-700 mb-1">Link to</label>
            <input
              id="link-dest"
              ref={destRef}
              value={dest}
              onChange={(e) => changeDest(e.target.value)}
              onKeyDown={onEnter}
              className={field}
              placeholder="A trip, stop or page title, a nid, or a web address"
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 mt-1">
              Type part of a title (&ldquo;picking up lola&rdquo;, &ldquo;lola tucson&rdquo;), a nid (12181), or paste an address.
            </p>
          </div>

          {chosen && (
            <div className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">
              {chosen.kind === 'address' ? (
                <>Links to <span className="font-mono break-all">{chosen.href}</span></>
              ) : (
                <>
                  Links to {KIND_LABEL[chosen.kind].toLowerCase()} <strong>{chosen.title}</strong>
                  {chosen.context && <> on {chosen.context}</>} <span className="text-green-700">(nid {chosen.nid}, {chosen.path})</span>
                  {!chosen.published && (
                    <div className="mt-1 text-amber-800">This is a draft: readers following the link will find nothing until it is published.</div>
                  )}
                </>
              )}
            </div>
          )}

          {state === 'error' && <p className="text-sm text-red-600">The search failed. Try again.</p>}

          {results.length > 0 && (
            <ul className="border border-gray-200 rounded bg-white divide-y divide-gray-100 max-h-64 overflow-y-auto" aria-label="Matches">
              {results.map((t) => {
                const isChosen = chosen && chosen.kind !== 'address' && chosen.nid === t.nid;
                return (
                  <li key={t.nid}>
                    <button
                      type="button"
                      onClick={() => choose(t)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${isChosen ? 'bg-blue-50' : ''}`}
                      aria-pressed={isChosen}
                    >
                      <span className="inline-block w-10 text-xs uppercase tracking-wide text-gray-400">{KIND_LABEL[t.kind]}</span>
                      <span className="text-gray-800">{t.title}</span>
                      {t.context && <span className="text-gray-500"> — {t.context}</span>}
                      {!t.published && <span className="ml-1 text-xs text-amber-700">(draft)</span>}
                      <span className="ml-1 text-xs text-gray-400">nid {t.nid}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {state === 'idle' && dest.trim() && !chosen && results.length === 0 && (
            <p className="text-sm text-gray-500">Nothing matches &ldquo;{dest.trim()}&rdquo;.</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-200">
          <div>
            {editing && (
              <button type="button" onClick={onRemove} className="text-sm text-red-700 hover:underline">
                Remove link, keep the text
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={!canInsert} className="rounded px-3 py-1.5 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
              {editing ? 'Update link' : 'Insert link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
