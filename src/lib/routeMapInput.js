import fs from 'fs';
import path from 'path';
import { getTrip, getStopsForTrip } from './adminData';
import { toSiteDateInput, SITE_TIME_ZONE } from './siteDates';
import { UPLOADS_DIR } from './dataPaths';
import { photoFileExists } from './photoExists';

// What the overview-map generator needs to know about a trip, read fresh from
// the data files. Used twice: to render the trip edit page, and again by the
// API each time "Generate from stops" is pressed — a stop edited in another
// tab, or by the other person, since this page was opened has to count.
//
// Itinerary order is the same rule the public trip page uses, so the number
// drawn beside a stop is the row number readers see. Only what the map needs
// is returned; the travelogues stay on the server.
export function getRouteMapInput(tripNid) {
  const trip = getTrip(tripNid);
  if (!trip) return null;
  const when = (s) => Number(s.arrival_date) || Number(s.created) || 0;
  const stops = getStopsForTrip(tripNid).sort((a, b) => when(a) - when(b));
  return {
    trip: { nid: trip.nid, slug: trip.slug, map_image: trip.map_image || '' },
    stops: stops.map((s) => ({
      nid: s.nid, title: s.title, lat: s.lat, lng: s.lng, arrived_by: s.arrived_by, published: s.published,
    })),
    startDay: trip.start_date || (stops.length ? toSiteDateInput(when(stops[0])) : ''),
    previousMaps: previousMaps(trip),
  };
}

const MAPS_URL = '/photos/uploads/maps/';

// Generated maps are named <trip-slug>-route-YYYYMMDD-HHMM.<ext>, stamped in UTC.
function describe(url) {
  // Seconds are optional: the first maps saved were stamped to the minute.
  const m = url.match(/-route-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(?:\d{2})?\.[a-z]+$/i);
  if (m) {
    const made = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
    const day = made.toLocaleString('en-US', {
      timeZone: SITE_TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    return `Generated ${day}`;
  }
  // Anything under uploads/ was put there through the CMS; anything else is
  // one of the hand-made maps that came across from the old site.
  return url.startsWith('/photos/uploads/') ? 'Uploaded map' : 'Original map';
}

function stillThere(url) {
  if (url.startsWith(MAPS_URL)) return fs.existsSync(path.join(UPLOADS_DIR, 'maps', url.slice(MAPS_URL.length)));
  return photoFileExists(decodeURIComponent(url.replace(/^\/photos\//, '')));
}

/**
 * Every map this trip has had other than the one it shows now, newest first,
 * so any of them can be put back.
 *
 * Two sources, because either alone has a hole. The trip record keeps
 * `map_history` — each map it was switched away from — which is the only
 * record of the ORIGINAL hand-made map, since that file's name says nothing
 * about which trip it belongs to. And the maps folder is scanned for this
 * trip's generated files, which catches any saved before the history existed.
 * Nothing is ever deleted from either, so the list only grows.
 */
function previousMaps(trip) {
  const current = trip.map_image || '';
  const history = Array.isArray(trip.map_history) ? trip.map_history : [];
  let generated = [];
  try {
    generated = fs.readdirSync(path.join(UPLOADS_DIR, 'maps'))
      .filter((f) => f.startsWith(`${trip.slug}-route-`))
      .sort()
      .reverse()
      .map((f) => `${MAPS_URL}${f}`);
  } catch {
    // No maps folder yet: nothing has been generated or uploaded.
  }
  const seen = new Set([current]);
  const out = [];
  for (const url of [...history, ...generated]) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    if (stillThere(url)) out.push({ url, label: describe(url) });
  }
  return out;
}
