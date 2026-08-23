'use client';

import { useId, useState } from 'react';

// A password input with a show/hide toggle.
//
// The toggle exists because a hidden field gives you no way to tell a typo
// from a password-manager autofill that filled in the wrong entry — you just
// get "incorrect" with nothing to inspect. Being able to look is the whole
// point, so it starts hidden and never persists the revealed state.
//
// The toggle is a <button type="button"> so it cannot submit the form, and it
// carries aria-pressed so a screen reader announces the current state rather
// than just a label that silently changes meaning.
export default function PasswordField({
  id,
  name,
  value,
  onChange,
  autoComplete = 'current-password',
  autoFocus = false,
  className = '',
  ...rest
}) {
  const [revealed, setRevealed] = useState(false);
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="relative">
      <input
        id={inputId}
        name={name}
        type={revealed ? 'text' : 'password'}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        value={value}
        onChange={onChange}
        // Right padding keeps the text from running under the toggle.
        className={`w-full border border-gray-300 rounded px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        aria-pressed={revealed}
        aria-controls={inputId}
        aria-label={revealed ? 'Hide password' : 'Show password'}
        title={revealed ? 'Hide password' : 'Show password'}
        // Inset from the border and vertically centred against the input's own
        // box, so it sits still whether or not an error message is present.
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {revealed ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
