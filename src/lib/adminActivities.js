// Explicit .js extensions for plain-node script compat (same as adminStore).
import { readDataset, writeDataset, allocateNid } from './adminStore.js';

// Activities are the "What we did" sidebar entries on a stop. The export
// shape mirrors Drupal's: parent_stop duplicates the narrative (a legacy
// body-mirror, kept in sync on every write), desc is Drupal cruft preserved
// as-is on existing records and '' on new ones.
//
// No deletes: activities carry the same nullable published flag as
// everything else (absence = live, false = draft, republish removes the
// field). Unpublished activities leave the stop sidebar, the
// /activities/<type> cards, and the index counts.

export const RATING_OPTIONS = ['', '*', '**', '***', '****', '*****'];

export function getActivitiesForStop(stopNid) {
  return readDataset('activities').filter(
    (a) => String(a.parent_stop_nid) === String(stopNid)
  );
}

export function getActivity(nid) {
  return readDataset('activities').find((a) => String(a.nid) === String(nid)) || null;
}

/** All 47 legacy type strings (plus any new ones), for the editor's datalist.
 *  Free text is allowed — a brand-new type simply becomes a new
 *  /activities/<type> listing page. */
export function getDistinctActivityTypes() {
  const activities = readDataset('activities');
  return Array.from(new Set(activities.map((a) => a.activity_type).filter(Boolean))).sort();
}

function applyPublished(record, published) {
  if (published === false) record.published = false;
  else if (published === true) delete record.published;
}

// New activities are born PUBLISHED (unlike trips/stops/pages): they're
// one-card annotations on content that's already live, and the natural flow
// is add-and-see. The toggle is right there for the draft case.
export function createActivity(stopNid, fields) {
  const activities = readDataset('activities');
  const nid = allocateNid();
  const narrative = fields.narrative || '';

  const newActivity = {
    nid,
    parent_stop: narrative,
    desc: '',
    parent_stop_nid: String(stopNid),
    title: fields.title,
    narrative,
    activity_type: fields.activity_type,
    rating: fields.rating || '',
  };
  applyPublished(newActivity, fields.published);

  activities.push(newActivity);
  writeDataset('activities', activities);
  return newActivity;
}

export function updateActivity(nid, fields) {
  const activities = readDataset('activities');
  const idx = activities.findIndex((a) => String(a.nid) === String(nid));
  if (idx === -1) throw new Error(`Activity nid ${nid} not found`);

  const { published, ...rest } = fields;
  const updated = { ...activities[idx], ...rest };
  applyPublished(updated, published);
  // Keep the legacy body-mirror in sync whenever the narrative changes.
  if ('narrative' in rest) updated.parent_stop = updated.narrative;
  activities[idx] = updated;

  writeDataset('activities', activities);
  return updated;
}
