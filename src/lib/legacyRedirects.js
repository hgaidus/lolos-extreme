import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './dataPaths.js';
import { getDataVersion, makeVersioned } from './dataVersion.js';
import { isPublished } from './publishState.js';

// Drupal gave every photo and activity its own page; here they live on their
// stop instead, so those addresses 404. legacyAliases.json is the old site's own
// alias table (old slug -> nid), which is exact where matching on titles is not:
// many photos share a title.
//
// The table stops at the nid on purpose. Where a nid leads now is worked out
// from the live data, so a renamed stop or an unpublished record is honoured
// within the usual ~2s, without regenerating anything.

const readData = (file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));

const targets = makeVersioned(() => {
  const trips = new Map(readData('trips.json').map((t) => [String(t.nid), t]));
  const stops = new Map();
  for (const stop of readData('stops.json')) {
    // A public stop in a draft trip is still not something to send visitors to.
    const trip = trips.get(String(stop.parent_trip_nid));
    if (stop.slug && isPublished(stop) && isPublished(trip)) {
      stops.set(String(stop.nid), `/${encodeURI(stop.slug)}`);
    }
  }

  const albumOf = new Map();
  for (const album of readData('albums.json')) {
    if (!isPublished(album)) continue;
    for (const image of album.images || []) {
      const nid = String(image.image_nid);
      if (!albumOf.has(nid)) albumOf.set(nid, `/${encodeURI(album.slug)}`);
    }
  }

  const photos = new Map();
  for (const photo of readData('photo_titles.json')) {
    if (!isPublished(photo)) continue;
    const nid = String(photo.image_nid);
    const target = stops.get(String(photo.trip_stop_nid)) || albumOf.get(nid);
    if (target) photos.set(nid, target);
  }

  const activities = new Map();
  for (const activity of readData('activities.json')) {
    const target = isPublished(activity) && stops.get(String(activity.parent_stop_nid));
    if (target) activities.set(String(activity.nid), target);
  }

  return { photos, activities };
}, getDataVersion);

function decoded(slug) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/**
 * Where an old /photos/<slug> or /activities/<slug> page lives now, or null.
 * Only for the not-found path: the table is about 350 KB, so it is imported here
 * rather than at the top of the file, and ordinary requests never load it.
 */
export async function legacyTarget(section, slug) {
  const { default: aliases } = await import('./legacyAliases.json');
  // Page params can arrive still percent-encoded; route handler params do not.
  const nid = aliases[section][decoded(String(slug)).toLowerCase()];
  return (nid && targets.get()[section].get(nid)) || null;
}
