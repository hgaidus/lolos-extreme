'use client';

// The line beside a Save button, worded from what actually happened.
//
// Every form used to print "Saved & pushed to GitHub" as soon as the request
// came back OK — including when the push had failed (right next to the warning
// saying so) and when nothing had changed at all. The server already reports
// which of four things happened (gitCommitAndPush in adminData.js); this says
// that and nothing more.
const WORDING = {
  pushed: { tone: 'text-green-700', text: 'Saved and backed up to GitHub' },
  nothing_to_commit: { tone: 'text-gray-600', text: 'No changes to save' },
  // The two failure cases keep their fuller explanation in the warning each
  // form already shows underneath; this just must not contradict it.
  push_failed: { tone: 'text-amber-700', text: 'Saved on the server — not yet backed up' },
  commit_failed: { tone: 'text-red-700', text: 'Written to disk only — not recorded' },
};
// A reply with no git status is still a successful save; claim no more than that.
const UNKNOWN = { tone: 'text-gray-600', text: 'Saved' };

export default function SavedNote({ gitStatus, viewHref }) {
  const { tone, text } = WORDING[gitStatus] || UNKNOWN;
  return (
    <span className={`${tone} text-sm`}>
      {text}
      {viewHref && (
        <>
          {' — '}
          <a href={viewHref} className="text-blue-700 underline">View the page</a>
        </>
      )}
    </span>
  );
}
