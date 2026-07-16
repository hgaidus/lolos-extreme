'use client';

import { useState } from 'react';

// New pages are born as drafts; write the body in the full editor after
// creation. Type is permanent (it sets the slug convention).
export default function NewPageForm() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('page');
  const [status, setStatus] = useState(null);
  const [notice, setNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    setNotice('');
    setFieldErrors({});
    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), type }),
      });
      if (res.status === 400) {
        const data = await res.json();
        setFieldErrors(data.fields || {});
        setStatus('invalid');
        return;
      }
      if (!res.ok) {
        setStatus('error');
        setNotice('Create failed.');
        return;
      }
      const data = await res.json();
      window.location.assign(`/admin/pages/${data.page.nid}`);
    } catch {
      setStatus('error');
      setNotice('Create failed.');
    }
  }

  const fieldError = (name) =>
    fieldErrors[name] ? <p className="text-red-600 text-xs mt-1">{fieldErrors[name]}</p> : null;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 max-w-xl">
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
        The new page starts as a <strong>draft</strong> — you'll land in its editor to write the
        body, and publish when it's ready.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        {fieldError('title')}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="page">Page</option>
          <option value="story">Story</option>
          <option value="tips">Tips</option>
        </select>
        {type === 'tips' && (
          <p className="text-xs text-amber-700 mt-1">
            Heads up: tips pages are kept in the data but are not currently shown anywhere on the
            public site.
          </p>
        )}
        {fieldError('type')}
      </div>
      {notice && <p className="text-red-700 text-sm">{notice}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="bg-blue-600 text-white rounded px-4 py-2 font-semibold disabled:opacity-50"
        >
          {status === 'saving' ? 'Creating…' : 'Create Draft Page'}
        </button>
        {status === 'invalid' && <span className="text-red-600 text-sm">Not created — fix the highlighted fields.</span>}
      </div>
    </form>
  );
}
