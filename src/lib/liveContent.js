import { readDataset } from './adminStore.js';
import { isPublished } from './publishState.js';
import { makeVersioned, getDataVersion } from './dataVersion.js';

// Whether a stop or activity is visible to the public, which takes more than
// its own `published` flag: an unpublished trip hides its stops, and a hidden
// stop hides its activities. Without this a trip still being written leaked
// through any stop that happened to be marked published — its page, the
// sitemap, search, the map and the activity listings all showed it while the
// trip page itself 404'd (found 2026-11-12 on a trip Lolo was drafting).
//
// Every public surface that lists or links to stops or activities asks here
// instead of calling isPublished() on the record alone. The admin still sees
// drafts at their real URL, with the banner ([...slug]/page.js).

const draftTripNids = makeVersioned(
  () => new Set(readDataset('trips').filter((t) => !isPublished(t)).map((t) => String(t.nid))),
  getDataVersion
);

const hiddenStopNids = makeVersioned(() => {
  const draftTrips = draftTripNids.get();
  return new Set(
    readDataset('stops')
      .filter((s) => !isPublished(s) || draftTrips.has(String(s.parent_trip_nid)))
      .map((s) => String(s.nid))
  );
}, getDataVersion);

export function isTripOfStopPublished(stop) {
  return !draftTripNids.get().has(String(stop?.parent_trip_nid));
}

export function isStopLive(stop) {
  return !!stop && isPublished(stop) && isTripOfStopPublished(stop);
}

export function isActivityLive(activity) {
  return !!activity && isPublished(activity) && !hiddenStopNids.get().has(String(activity.parent_stop_nid));
}
