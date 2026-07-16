'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PhotoPickerModal from './PhotoPickerModal';

// Split-pane travelogue editor: markup textarea on the left, a live rendered
// preview on the right (same pipeline as the public page, via
// POST /api/admin/preview). The preview debounces 700ms behind typing and a
// request counter makes the latest response always win. The toolbar inserts
// markup at the cursor — including [img_assist] photo embeds via the picker.
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
  const [html, setHtml] = useState('');
  const [previewState, setPreviewState] = useState('idle'); // idle | loading | error
  const [pickerOpen, setPickerOpen] = useState(false);
  const textareaRef = useRef(null);
  const requestCounter = useRef(0);

  useEffect(() => {
    if (!value && !description) {
      setHtml('');
      return undefined;
    }
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
    }, 700);
    return () => clearTimeout(timer);
  }, [value, description, previewType]);

  // Splice text into the current value at the selection, then restore focus
  // with the caret where editing naturally continues.
  const splice = useCallback(
    (before, after, placeholder, selectOffset = null) => {
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
        if (selectOffset !== null) {
          // Put the caret at a fixed offset inside the inserted markup
          // (used to land inside href="" so the URL can be typed straight away).
          el.setSelectionRange(start + selectOffset, start + selectOffset);
        } else if (selected) {
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

  const insertLink = () => {
    const el = textareaRef.current;
    if (!el) return;
    const hasSelection = el.selectionStart !== el.selectionEnd;
    if (hasSelection) {
      // Wrap the selection as the link text and land the caret inside href=""
      splice('<a href="">', '</a>', '', '<a href="'.length);
    } else {
      splice('<a href="">', '</a>', 'link text', '<a href="'.length);
    }
  };

  const toolButton = 'border border-gray-300 rounded px-2 py-1 text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-1.5" role="toolbar" aria-label="Formatting">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
          aria-label={label}
        />
        <div className="border border-gray-200 rounded-lg bg-white p-5 overflow-y-auto lg:self-start" style={{ maxHeight: `${rows * 1.6 + 2}rem` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wide text-gray-400">Live preview</span>
            <span className="text-xs text-gray-400">
              {previewState === 'loading' && 'Rendering…'}
              {previewState === 'error' && <span className="text-red-600">Preview failed</span>}
            </span>
          </div>
          {html ? (
            <div
              className="text-base leading-relaxed text-[#2e2c26] space-y-4 flow-root travelogue-interactive-body"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div className="text-sm text-gray-400 italic">Nothing to preview yet — start typing.</div>
          )}
        </div>
      </div>

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
