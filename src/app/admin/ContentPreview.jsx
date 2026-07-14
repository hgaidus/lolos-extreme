'use client';

import { useState } from 'react';

// Live preview of a draft travelogue/description, rendered through the same
// Drupal-content pipeline the public page uses (POST /api/admin/preview).
// On-demand: fetches when opened and on explicit Refresh, so typing stays snappy.
export default function ContentPreview({ type = 'stop', travelogue = '', description = '' }) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | error

  async function fetchPreview() {
    setState('loading');
    try {
      const res = await fetch('/api/admin/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, travelogue, description }),
      });
      if (!res.ok) {
        setState('error');
        return;
      }
      const data = await res.json();
      setHtml(data.html || '');
      setState('idle');
    } catch {
      setState('error');
    }
  }

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    fetchPreview();
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          {open ? 'Hide preview' : 'Show preview'}
        </button>
        {open && (
          <button
            type="button"
            onClick={fetchPreview}
            disabled={state === 'loading'}
            className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            {state === 'loading' ? 'Rendering…' : '↻ Refresh'}
          </button>
        )}
        {state === 'error' && <span className="text-red-600 text-sm">Preview failed</span>}
      </div>

      {open && (
        <div className="mt-2 border border-gray-200 rounded-lg bg-white p-5 max-h-[28rem] overflow-y-auto">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-3">
            Preview — how this renders on the site
          </div>
          {html ? (
            <div
              className="text-base leading-relaxed text-[#2e2c26] space-y-4 flow-root travelogue-interactive-body"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div className="text-sm text-gray-400 italic">
              {state === 'loading' ? 'Rendering…' : 'Nothing to preview yet.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
