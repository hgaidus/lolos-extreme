'use client';

import { useState } from 'react';

const OTHER = '__other__';

// Author as a real dropdown rather than a text box with suggestions: a
// pre-filled <input list> only offers the names matching what is already
// typed, so with "Lolo" filled in it looked like there was nothing to choose.
// "Someone else…" keeps it open-ended — Tommy and Andrew have bylines but no
// accounts, and a new name has to be possible without a code change.
export default function AuthorSelect({ value, onChange, authors = [] }) {
  const [custom, setCustom] = useState(false);
  // While a new name is being typed it stays out of the list, or the select
  // would grow an option per keystroke.
  const names = Array.from(new Set([...authors, custom ? '' : value].filter(Boolean)));

  return (
    <>
      <select
        value={custom ? OTHER : value}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setCustom(true);
            onChange('');
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
        className="w-full border border-gray-300 rounded px-3 py-2"
      >
        {!value && !custom && <option value="">(no byline)</option>}
        {names.map((a) => <option key={a} value={a}>{a}</option>)}
        <option value={OTHER}>Someone else…</option>
      </select>
      {custom && (
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Author name"
          className="w-full border border-gray-300 rounded px-3 py-2 mt-2"
        />
      )}
    </>
  );
}
