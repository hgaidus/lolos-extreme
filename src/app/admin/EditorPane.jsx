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

// Pixel offset of a character from the top of a textarea's content. Wrapped
// lines rule out counting newlines (a travelogue paragraph is one long line),
// so the text before it is laid out in an invisible copy of the textarea.
function caretTop(el, index) {
  const cs = getComputedStyle(el);
  const mirror = document.createElement('div');
  for (const p of ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'tabSize']) {
    mirror.style[p] = cs[p];
  }
  Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', top: '0', left: '-9999px', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', borderStyle: 'solid' });
  mirror.textContent = el.value.slice(0, index);
  const marker = document.createElement('span');
  marker.textContent = '​';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const top = marker.offsetTop;
  mirror.remove();
  return top;
}

// Undo history limits. A long travelogue is ~35 KB, so 200 steps stays a few MB.
const HISTORY_LIMIT = 200;
// Keystrokes closer together than this undo as one step.
const TYPING_RUN_MS = 1000;
// Edits that count as typing; anything else (cut, paste, drop) is its own step.
const TYPING_INPUT = /^(insertText|insertLineBreak|insertParagraph|deleteContentBackward|deleteContentForward|deleteWordBackward|deleteWordForward)$/;

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

  // Undo history, kept here rather than left to the browser. The browser's own
  // undo misses every change the editor makes itself (photo picker, link
  // dialog, B/I/H2), and it can't be reached from the Preview tab — which is
  // where a misplaced photo is noticed. Every change to the text goes through
  // commit(), which records what the text and selection were just before it.
  // A run of typing within a second counts as one step; a cut, paste, drop or
  // editor insert is always its own step. Undo puts the selection back too,
  // so undoing a cut re-selects the text that was cut.
  const past = useRef([]); // [{ value, start, end }], oldest first
  const future = useRef([]);
  const lastTypingAt = useRef(0);
  const beforeEdit = useRef(null); // { start, end, inputType } from the textarea's beforeinput
  // How many steps each way, for the Undo/Redo buttons (refs can't drive a render).
  const [historySize, setHistorySize] = useState({ undo: 0, redo: 0 });
  const syncHistorySize = () => setHistorySize({ undo: past.current.length, redo: future.current.length });

  const commit = useCallback(
    (next, sel, { typing = false } = {}) => {
      if (next === value) return;
      const now = Date.now();
      if (!(typing && now - lastTypingAt.current < TYPING_RUN_MS)) {
        past.current.push({ value, start: sel.start, end: sel.end });
        if (past.current.length > HISTORY_LIMIT) past.current.shift();
      }
      lastTypingAt.current = typing ? now : 0;
      future.current = [];
      syncHistorySize();
      onChange(next);
    },
    [value, onChange]
  );

  // Moves one step from `from` to `to` (undo: past→future; redo: the reverse).
  const step = useCallback(
    (from, to) => {
      const snap = from.current.pop();
      if (!snap) return;
      const el = textareaRef.current;
      to.current.push({ value, start: el?.selectionStart ?? 0, end: el?.selectionEnd ?? 0 });
      lastTypingAt.current = 0;
      syncHistorySize();
      onChange(snap.value);
      setTimeout(() => {
        if (!el) return;
        // From the Preview tab the textarea is hidden; the selection is still
        // set, so it is waiting there on the way back to Write.
        if (tab === 'write') el.focus();
        el.setSelectionRange(snap.start, snap.end);
      }, 0);
    },
    [value, onChange, tab]
  );
  const undo = useCallback(() => step(past, future), [step]);
  const redo = useCallback(() => step(future, past), [step]);

  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y (Cmd on a Mac). Returns true if handled.
  const historyKey = useCallback(
    (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return false;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) undo();
      else if ((k === 'z' && e.shiftKey) || k === 'y') redo();
      else return false;
      e.preventDefault();
      return true;
    },
    [undo, redo]
  );

  // The browser's Edit menu and right-click Undo arrive as beforeinput with a
  // history inputType; route those to this history as well. Every other
  // beforeinput notes the selection the edit is about to replace.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return undefined;
    const onBeforeInput = (e) => {
      if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
        e.preventDefault();
        if (e.inputType === 'historyUndo') undo();
        else redo();
        return;
      }
      beforeEdit.current = { start: el.selectionStart, end: el.selectionEnd, inputType: e.inputType };
    };
    el.addEventListener('beforeinput', onBeforeInput);
    return () => el.removeEventListener('beforeinput', onBeforeInput);
  }, [undo, redo]);

  // On the Preview tab, Ctrl+Z works from anywhere on the page, unless the
  // focus is in another field, which keeps its own undo.
  useEffect(() => {
    if (tab !== 'preview') return undefined;
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      historyKey(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, historyKey]);

  const onTextareaChange = (e) => {
    const el = e.target;
    const before = beforeEdit.current || { start: el.selectionStart, end: el.selectionEnd, inputType: '' };
    beforeEdit.current = null;
    commit(el.value, before, { typing: TYPING_INPUT.test(before.inputType) });
  };

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
      commit(next, { start, end });
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
    [value, commit]
  );

  const insertAtCursor = useCallback(
    (text) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = value.slice(0, start) + text + value.slice(end);
      commit(next, { start, end });
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    },
    [value, commit]
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
    commit(value.slice(0, start) + text + value.slice(end), { start, end });
    setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  // Clicking a photo in the preview opens Write with that photo's
  // [img_assist] tag selected, ready to cut and paste somewhere better.
  // Figures carry data-embed=N for the Nth tag in this text (adminPreview.js).
  // Links in the preview are inert: following one would leave the editor and
  // throw away unsaved work.
  const onPreviewClick = (e) => {
    if (e.target.closest('a')) e.preventDefault();
    const fig = e.target.closest('figure[data-embed]');
    if (!fig) return;
    const n = Number(fig.dataset.embed);
    const tags = [...value.matchAll(/\[img_assist\|[^\]]*\]/gi)];
    const tag = tags[n];
    if (!tag) return;
    setTab('write');
    setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      containerRef.current?.scrollIntoView({ block: 'start' });
      el.focus({ preventScroll: true });
      el.setSelectionRange(tag.index, tag.index + tag[0].length);
      el.scrollTop = Math.max(0, caretTop(el, tag.index) - el.clientHeight / 3);
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
          {/* Shown on both tabs: Preview is where a misplaced photo shows up. */}
          <div className="flex items-center gap-1">
            <button type="button" onClick={undo} disabled={!historySize.undo} className={`${toolButton} disabled:opacity-40 disabled:cursor-default`} title="Undo (Ctrl+Z)" aria-label="Undo">
              ↶ Undo
            </button>
            <button type="button" onClick={redo} disabled={!historySize.redo} className={`${toolButton} disabled:opacity-40 disabled:cursor-default`} title="Redo (Ctrl+Y)" aria-label="Redo">
              ↷ Redo
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
        onChange={onTextareaChange}
        onKeyDown={historyKey}
        rows={rows}
        className={`w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm ${tab === 'write' ? '' : 'hidden'}`}
        aria-label={label}
      />

      {tab === 'preview' && (
        // The site's page background around a column exactly as wide as the
        // public one, with the public body's own classes, so text wraps around
        // the photos where it will on the live page.
        <div className="rounded-lg bg-[#eef3ec] border border-gray-200 px-4 pt-3 pb-6 overflow-x-auto">
          <p className="text-xs text-gray-500 text-center mb-3">Click a photo to find its tag in the text.</p>
          <div className="mx-auto bg-white/70 rounded-lg p-8 shadow-sm" style={{ width: `${PUBLIC_COLUMN_PX[previewType] || PUBLIC_COLUMN_PX.stop}px`, boxSizing: 'content-box' }}>
            {html && (value || description) ? (
              <div
                onClick={onPreviewClick}
                className="text-base leading-relaxed text-[#2e2c26] space-y-4 flow-root travelogue-interactive-body content-prose [&_figure[data-embed]]:cursor-pointer [&_figure[data-embed]:hover]:ring-4 [&_figure[data-embed]:hover]:ring-blue-500"
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
