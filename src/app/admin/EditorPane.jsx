'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PhotoPickerModal from './PhotoPickerModal';
import LinkModal from './LinkModal';

// The <a>…</a> the selection sits inside (or exactly covers), so the Link
// button edits that link rather than wrapping a second one around it.
function anchorAround(value, start, end) {
  const re = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
  let m;
  while ((m = re.exec(value))) {
    const aStart = m.index;
    const aEnd = aStart + m[0].length;
    if (aStart > end) break;
    if (aStart <= start && end <= aEnd) {
      const href = (m[0].match(/^<a\b[^>]*\bhref\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
      const text = m[0].replace(/^<a\b[^>]*>/i, '').replace(/<\/a>$/i, '');
      return { start: aStart, end: aEnd, href, text };
    }
  }
  return null;
}

// Width of the text column on the public page, per kind of content, measured
// on a desktop window (the site's layout stops growing at 1348px, so these
// hold for any screen from about 1440px up). Photos are a fixed 320px, so
// the column width is what decides how text wraps around them — the old
// side-by-side preview was about 480px and showed a different page.
const PUBLIC_COLUMN_PX = { stop: 679, trip: 801, page: 911, activity: 955 };

// Travelogue editor with Write and Preview tabs. Write is the markup textarea;
// Preview renders the draft through the same pipeline as the public page (via
// POST /api/admin/preview) at the public column's width, so photo placement
// can be checked without saving or leaving the page. The textarea stays
// mounted while hidden, so the caret and scroll position survive a round trip.
// The toolbar inserts markup at the cursor — including [img_assist] photo
// embeds via the picker.
export default function EditorPane({
  label = 'Travelogue',
  value,
  onChange,
  previewType = 'stop',
  description = '', // stop preview includes the description callout, matching the public page
  stopNid = null,
  tripNid = null,
  rows = 24,
}) {
  const [tab, setTab] = useState('write'); // write | preview
  const [html, setHtml] = useState('');
  const [previewState, setPreviewState] = useState('idle'); // idle | loading | error
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkEdit, setLinkEdit] = useState(null); // {start, end, text, href, editing} while the link dialog is open
  const textareaRef = useRef(null);
  const requestCounter = useRef(0);

  // Rendered only while the Preview tab is open: nobody is looking at it
  // otherwise, and opening the tab renders straight away.
  useEffect(() => {
    if (tab !== 'preview' || (!value && !description)) return undefined;
    const timer = setTimeout(async () => {
      const seq = ++requestCounter.current;
      setPreviewState('loading');
      try {
        const res = await fetch('/api/admin/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: previewType,
            travelogue: value,
            description,
            body: value,
            narrative: value,
          }),
        });
        if (seq !== requestCounter.current) return; // a newer keystroke superseded us
        if (!res.ok) {
          setPreviewState('error');
          return;
        }
        const data = await res.json();
        if (seq !== requestCounter.current) return;
        setHtml(data.html || '');
        setPreviewState('idle');
      } catch {
        if (seq === requestCounter.current) setPreviewState('error');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [tab, value, description, previewType]);

  // A hidden textarea forgets its scroll position (the caret survives), so it
  // is carried across by hand. Coming back from a long preview, the page is
  // brought back up to the editor rather than left scrolled past its end.
  const savedScroll = useRef(0);
  const containerRef = useRef(null);
  const showTab = (next) => {
    if (next === tab) return;
    if (next === 'preview') savedScroll.current = textareaRef.current?.scrollTop || 0;
    setTab(next);
    if (next === 'write') {
      setTimeout(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.scrollTop = savedScroll.current;
        containerRef.current?.scrollIntoView({ block: 'start' });
        el.focus({ preventScroll: true });
      }, 0);
    }
  };

  // Splice text into the current value at the selection, then restore focus
  // with the caret where editing naturally continues.
  const splice = useCallback(
    (before, after, placeholder) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end);
      const inner = selected || placeholder;
      const next = value.slice(0, start) + before + inner + after + value.slice(end);
      onChange(next);
      // setTimeout(0), not requestAnimationFrame: React has already committed
      // the new value (discrete-event flush), and rAF can stall in hidden or
      // throttled tabs while a macrotask always runs.
      setTimeout(() => {
        el.focus();
        if (selected) {
          el.setSelectionRange(start + before.length + inner.length + after.length, start + before.length + inner.length + after.length);
        } else {
          el.setSelectionRange(start + before.length, start + before.length + inner.length);
        }
      }, 0);
    },
    [value, onChange]
  );

  const insertAtCursor = useCallback(
    (text) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = value.slice(0, start) + text + value.slice(end);
      onChange(next);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    },
    [value, onChange]
  );

  // Opens the link dialog on whatever the link is about: an existing link the
  // caret is in, else the selected words, else nothing yet (typed in the dialog).
  const insertLink = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const existing = anchorAround(value, start, end);
    if (existing) setLinkEdit({ ...existing, editing: true });
    else setLinkEdit({ start, end, text: value.slice(start, end), href: '', editing: false });
  };

  // Puts `text` where the link dialog's range was and leaves the caret after it.
  const replaceLinkRange = (text) => {
    const { start, end } = linkEdit;
    setLinkEdit(null);
    onChange(value.slice(0, start) + text + value.slice(end));
    setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const toolButton = 'border border-gray-300 rounded px-2 py-1 text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50';
  const tabButton = (name) =>
    `px-3 py-1 text-xs font-semibold rounded ${
      tab === name ? 'bg-blue-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
    }`;

  return (
    <div ref={containerRef}>
      {/* Sticky so a long preview can be switched back to Write from anywhere. */}
      <div className="sticky top-0 z-10 bg-white flex items-center justify-between gap-3 py-1.5 mb-1">
        <div className="flex items-center gap-3">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <div className="flex items-center gap-1" role="tablist" aria-label={`${label} view`}>
            <button type="button" role="tab" aria-selected={tab === 'write'} onClick={() => showTab('write')} className={tabButton('write')}>
              Write
            </button>
            <button type="button" role="tab" aria-selected={tab === 'preview'} onClick={() => showTab('preview')} className={tabButton('preview')}>
              Preview
            </button>
          </div>
          <span className="text-xs text-gray-400">
            {tab === 'preview' && previewState === 'loading' && 'Rendering…'}
            {tab === 'preview' && previewState === 'error' && <span className="text-red-600">Preview failed</span>}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 ${tab === 'preview' ? 'invisible' : ''}`} role="toolbar" aria-label="Formatting">
          <button type="button" onClick={() => setPickerOpen(true)} className={`${toolButton} text-blue-700`} aria-label="Insert photo">
            📷 Insert Photo
          </button>
          <button type="button" onClick={() => splice('<strong>', '</strong>', 'bold text')} className={toolButton} aria-label="Bold">
            <strong>B</strong>
          </button>
          <button type="button" onClick={() => splice('<em>', '</em>', 'italic text')} className={`${toolButton} italic`} aria-label="Italic">
            I
          </button>
          <button type="button" onClick={insertLink} className={toolButton} aria-label="Insert link">
            Link
          </button>
          <button type="button" onClick={() => splice('<h2>', '</h2>', 'Heading')} className={toolButton} aria-label="Heading">
            H2
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm ${tab === 'write' ? '' : 'hidden'}`}
        aria-label={label}
      />

      {tab === 'preview' && (
        // The site's page background around a column exactly as wide as the
        // public one, with the public body's own classes, so text wraps around
        // the photos where it will on the live page.
        <div className="rounded-lg bg-[#eef3ec] border border-gray-200 px-4 py-6 overflow-x-auto">
          <div className="mx-auto bg-white/70 rounded-lg p-8 shadow-sm" style={{ width: `${PUBLIC_COLUMN_PX[previewType] || PUBLIC_COLUMN_PX.stop}px`, boxSizing: 'content-box' }}>
            {html && (value || description) ? (
              <div
                className="text-base leading-relaxed text-[#2e2c26] space-y-4 flow-root travelogue-interactive-body content-prose"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <div className="text-sm text-gray-400 italic">{previewState === 'loading' ? 'Rendering…' : 'Nothing to preview yet.'}</div>
            )}
          </div>
        </div>
      )}

      {linkEdit && (
        <LinkModal
          initialText={linkEdit.text}
          initialHref={linkEdit.href}
          editing={linkEdit.editing}
          onInsert={replaceLinkRange}
          onRemove={() => replaceLinkRange(linkEdit.text)}
          onClose={() => setLinkEdit(null)}
        />
      )}

      {pickerOpen && (
        <PhotoPickerModal
          stopNid={stopNid}
          tripNid={tripNid}
          onInsert={(tag) => {
            insertAtCursor(tag);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
