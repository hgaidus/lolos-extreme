'use client';

import { useState } from 'react';
import EditorPane from '../../../EditorPane';

// The stop's "What we did" sidebar entries, editable in place below the stop
// form. Expand a row to edit it; activities are never deletable — unpublish
// hides one from the sidebar, the /activities/<type> cards, and the counts.
// New activities are born published: they're one-card annotations on a page
// that's already live, and add-and-see is the natural flow.
export default function ActivitiesSection({ stopNid, tripNid, initialActivities, activityTypes }) {
  const [activities, setActivities] = useState(initialActivities);
  const [openNid, setOpenNid] = useState(null); // nid | 'new' | null
  const [notice, setNotice] = useState('');

  function applyResult(saved) {
    setActivities((prev) => {
      const exists = prev.some((a) => a.nid === saved.nid);
      const row = {
        nid: saved.nid,
        title: saved.title,
        narrative: saved.narrative || '',
        activity_type: saved.activity_type || '',
        rating: saved.rating || '',
        published: saved.published !== false,
      };
      return exists ? prev.map((a) => (a.nid === saved.nid ? row : a)) : [...prev, row];
    });
  }

  function gitNotice(git) {
    if (git?.status === 'commit_failed') {
      setNotice('Saved to disk but NOT committed to git — investigate before further edits.');
    } else if (git?.status === 'push_failed') {
      setNotice('Saved; GitHub push failed (backup rides along with the next successful save).');
    } else {
      setNotice('');
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-800">What we did — activities</h2>
        <button
          type="button"
          onClick={() => setOpenNid(openNid === 'new' ? null : 'new')}
          className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm font-semibold"
        >
          {openNid === 'new' ? 'Cancel' : '+ Add activity'}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        {activities.length} activit{activities.length === 1 ? 'y' : 'ies'} on this stop. Click one to edit it.
      </p>
      {notice && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{notice}</p>
      )}

      {openNid === 'new' && (
        <div className="bg-white rounded-lg shadow p-4 mb-3">
          <ActivityEditor
            key="new"
            stopNid={stopNid}
            tripNid={tripNid}
            activityTypes={activityTypes}
            onSaved={(saved, git) => {
              applyResult(saved);
              gitNotice(git);
              setOpenNid(null);
            }}
          />
        </div>
      )}

      <ul className="space-y-2">
        {activities.map((a) => (
          <li key={a.nid} className="bg-white rounded-lg shadow">
            <button
              type="button"
              onClick={() => setOpenNid(openNid === a.nid ? null : a.nid)}
              className="w-full text-left px-4 py-3 flex items-center gap-3"
              aria-expanded={openNid === a.nid}
            >
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#c1593a] shrink-0">
                {a.activity_type}
              </span>
              <span className="flex-1 font-medium text-gray-800 truncate">{a.title}</span>
              {a.rating && a.rating !== '_original' && (
                <span className="text-amber-500 text-sm shrink-0">{a.rating}</span>
              )}
              {!a.published && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800 shrink-0">
                  Unpublished
                </span>
              )}
              <span className="text-gray-400 text-sm shrink-0">{openNid === a.nid ? '▲' : '▼'}</span>
            </button>
            {openNid === a.nid && (
              <div className="border-t border-gray-100 p-4">
                <ActivityEditor
                  key={a.nid}
                  stopNid={stopNid}
                  tripNid={tripNid}
                  activity={a}
                  activityTypes={activityTypes}
                  onSaved={(saved, git) => {
                    applyResult(saved);
                    gitNotice(git);
                  }}
                />
              </div>
            )}
          </li>
        ))}
        {activities.length === 0 && openNid !== 'new' && (
          <li className="text-sm text-gray-400 italic py-4">No activities yet — add the first one.</li>
        )}
      </ul>
    </section>
  );
}

function ActivityEditor({ stopNid, tripNid, activity, activityTypes, onSaved }) {
  const isNew = !activity;
  const [title, setTitle] = useState(activity?.title || '');
  const [type, setType] = useState(activity?.activity_type || '');
  const [rating, setRating] = useState(activity?.rating || '');
  const [narrative, setNarrative] = useState(activity?.narrative || '');
  const [status, setStatus] = useState(null); // null | 'saving' | 'saved' | 'invalid' | 'error'
  const [fieldErrors, setFieldErrors] = useState({});

  // The legacy '_original' value stays selectable only on records that
  // already carry it, so a save never silently rewrites it.
  const ratingOptions = ['', '*', '**', '***', '****', '*****'];
  if (activity?.rating === '_original') ratingOptions.push('_original');

  async function save(overrides = {}) {
    setStatus('saving');
    setFieldErrors({});
    try {
      const url = isNew ? `/api/admin/stops/${stopNid}/activities` : `/api/admin/activities/${activity.nid}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          activity_type: type.trim(),
          rating,
          narrative,
          ...overrides,
        }),
      });
      const data = await res.json();
      if (res.status === 400) {
        setFieldErrors(data.fields || {});
        setStatus('invalid');
        return;
      }
      if (!res.ok) {
        setStatus('error');
        return;
      }
      setStatus('saved');
      onSaved(data.activity, data.git);
    } catch {
      setStatus('error');
    }
  }

  const fieldError = (name) =>
    fieldErrors[name] ? <p className="text-red-600 text-xs mt-1">{fieldErrors[name]}</p> : null;

  const published = activity ? activity.published : true;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
          {fieldError('title')}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <input
            list="activity-type-options"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="e.g. Hike (free text allowed)"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
          {fieldError('activity_type')}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {ratingOptions.map((r) => (
              <option key={r || 'none'} value={r}>{r === '' ? '(no rating)' : r}</option>
            ))}
          </select>
        </div>
      </div>

      <EditorPane
        label="Narrative"
        value={narrative}
        onChange={setNarrative}
        previewType="activity"
        stopNid={stopNid}
        tripNid={tripNid}
        rows={8}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => save()}
          disabled={status === 'saving'}
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving…' : isNew ? 'Add Activity' : 'Save'}
        </button>
        {!isNew && (
          <button
            type="button"
            onClick={() => save({ published: !published })}
            disabled={status === 'saving'}
            className={`rounded px-3 py-2 text-sm font-semibold border ${
              published
                ? 'border-amber-300 text-amber-800 hover:bg-amber-50'
                : 'border-green-300 text-green-800 hover:bg-green-50'
            } disabled:opacity-50`}
            title={published ? 'Hide from the sidebar, the activity listings, and the counts' : 'Restore everywhere'}
          >
            {published ? 'Unpublish' : 'Publish'}
          </button>
        )}
        {status === 'saved' && <span className="text-green-700 text-sm">Saved &amp; pushed to GitHub</span>}
        {status === 'error' && <span className="text-red-600 text-sm">Save failed</span>}
        {status === 'invalid' && <span className="text-red-600 text-sm">Not saved — fix the highlighted fields.</span>}
      </div>

      <datalist id="activity-type-options">
        {activityTypes.map((t) => <option key={t} value={t} />)}
      </datalist>
    </div>
  );
}
