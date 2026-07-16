// Explicit .js extensions so plain node scripts (backfill, checks) can import
// this module too — same compat note as adminStore.js.
import { readDataset } from './adminStore.js';
import { isPublished } from './publishState.js';
import { makeVersioned, getDataVersion } from './dataVersion.js';

// Server-only derivation of everything src/data/menuTrips.js, tripIndex.js,
// and tripMaps.js used to hardcode, now read from the trip records themselves
// (backfilled by scripts/backfill-trip-meta.mjs, asserted byte-equal).
// Ordering is explicit data: menu_order / index_order are spaced by 10 and
// assigned at creation time (computeInsertOrders), so rendering is a plain
// sort and never re-guesses the hand-curated sequence.

export const REGIONS = ['crossCountry', 'eastCoast', 'westCoast', 'international'];

const cache = makeVersioned(() => {
  const trips = readDataset('trips').filter((t) => isPublished(t));
  const bySlug = new Map(trips.map((t) => [t.slug, t]));

  const menus = { crossCountry: [], eastCoast: [], westCoast: [], international: [] };
  for (const t of trips) {
    if (t.region === undefined || t.menu_order === undefined) continue;
    menus[t.region]?.push(t);
  }
  for (const region of Object.keys(menus)) {
    menus[region] = menus[region]
      .sort((a, b) => a.menu_order - b.menu_order)
      .map((t) => {
        const item = { title: t.menu_label, href: `/${t.slug}` };
        if (t.menu_hover) item.hover = t.menu_hover;
        return item;
      });
  }

  return { trips, bySlug, menus };
}, getDataVersion);

/** Nav dropdown groups — same shape menuTrips.js exported: {title, href, hover?}[] per region. */
export function getMenuGroups() {
  return cache.get().menus;
}

// New trips may not have a hand-written index_desc yet — fall back to the
// trip's published stop titles, the same style the hand-curated entries use.
const stopTitlesCache = makeVersioned(() => {
  const byTrip = new Map();
  for (const s of readDataset('stops')) {
    if (!isPublished(s)) continue;
    const key = String(s.parent_trip_nid);
    if (!byTrip.has(key)) byTrip.set(key, []);
    byTrip.get(key).push(s.title);
  }
  return byTrip;
}, getDataVersion);

/** Trip-index groups — same shape tripIndex.js exported: {href, title, desc}[] per region. */
export function getTripIndexGroups() {
  const { trips } = cache.get();
  const groups = { crossCountry: [], eastCoast: [], westCoast: [], international: [] };
  for (const t of trips) {
    if (t.index_order === undefined) continue;
    groups[t.index_group || t.region]?.push(t);
  }
  const stopTitles = stopTitlesCache.get();
  for (const g of Object.keys(groups)) {
    groups[g] = groups[g]
      .sort((a, b) => a.index_order - b.index_order)
      .map((t) => ({
        href: `/${t.slug}`,
        title: t.index_title || t.title,
        desc: t.index_desc ?? (stopTitles.get(String(t.nid)) || []).join(', '),
      }));
  }
  return groups;
}

/** Region key for a trip slug; unknown slugs keep today's crossCountry fallback. */
export function getRegionBySlug(slug) {
  const trip = cache.get().bySlug.get((slug || '').replace(/^\//, ''));
  return trip?.region || 'crossCountry';
}

export function getTripAuthor(trip) {
  return trip?.author || 'Lolo';
}

export function getTripMapImage(trip) {
  return trip?.map_image ?? null;
}

// "YYYY ..." title convention is the fallback for the handful of legacy
// records whose year field was abused as free text.
export function parseTripYear(trip) {
  const y = Number(trip?.year);
  if (Number.isFinite(y) && y > 1900 && y < 2100) return y;
  const m = String(trip?.title || '').match(/\b(19|20)\d\d\b/);
  return m ? Number(m[0]) : 0;
}

/**
 * Where a NEW trip of `year` slots into a region: menus run newest-first,
 * the index oldest-first. Returns explicit {menu_order, index_order} midway
 * between the neighbors (orders are spaced by 10, so midpoints stay integral
 * for a long time; ties append after the same year's existing trips).
 */
export function computeInsertOrders(region, year) {
  const all = readDataset('trips'); // drafts included — a draft still owns its slot
  const inRegion = all
    .filter((t) => t.region === region && t.menu_order !== undefined)
    .sort((a, b) => a.menu_order - b.menu_order);
  const inIndex = all
    .filter((t) => (t.index_group || t.region) === region && t.index_order !== undefined)
    .sort((a, b) => a.index_order - b.index_order);

  const between = (before, after) => {
    if (before === null && after === null) return 0;
    if (before === null) return after - 10;
    if (after === null) return before + 10;
    return Math.floor((before + after) / 2);
  };

  // Menu: newest first — insert before the first strictly-older trip.
  let mi = inRegion.findIndex((t) => parseTripYear(t) < year);
  if (mi === -1) mi = inRegion.length;
  const menu_order = between(
    mi > 0 ? inRegion[mi - 1].menu_order : null,
    mi < inRegion.length ? inRegion[mi].menu_order : null
  );

  // Index: oldest first — insert after the last trip of the same or older year.
  let ii = inIndex.findIndex((t) => parseTripYear(t) > year);
  if (ii === -1) ii = inIndex.length;
  const index_order = between(
    ii > 0 ? inIndex[ii - 1].index_order : null,
    ii < inIndex.length ? inIndex[ii].index_order : null
  );

  return { menu_order, index_order };
}
