import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './dataPaths.js';
import { readDataset } from './adminStore.js';
import { isPublished } from './publishState.js';
import { makeVersioned, getDataVersion } from './dataVersion.js';

// Pins for the trip stops map, read from the stops themselves.
//
// The map used to be drawn from locations.geojson, a frozen export of Drupal's
// location table. Every stop in it carries the same coordinates on its own
// record (808 of 809, to the last digit), so the file was a second copy that
// nothing kept up to date: a stop added through the CMS could never appear on
// the map, and there was no field to give it a position anyway.
//
// A stop's own lat/lng is now the only source. The geojson is still read for
// pins that have NO stop record — one today, a Badlands campsite — so nothing
// that was on the map drops off it.
function legacyOrphans(stopNids) {
  try {
    const geojson = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'locations.geojson'), 'utf-8'));
    return geojson.features
      .filter((f) => !stopNids.has(String(f.properties.nid)))
      .map((f) => ({
        nid: f.properties.nid,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        url: f.properties.url || '/',
        title: f.properties.title || `Campsite Location #${f.properties.lid}`,
        travelogue: 'Historical RV stop location logged via GPS.',
      }));
  } catch {
    return [];
  }
}

export function hasCoordinates(stop) {
  return Number.isFinite(stop?.lat) && Number.isFinite(stop?.lng);
}

const cache = makeVersioned(() => {
  const stops = readDataset('stops');
  const pins = stops
    .filter((s) => hasCoordinates(s) && isPublished(s))
    .map((s) => ({
      nid: s.nid,
      lat: s.lat,
      lng: s.lng,
      url: `/${s.slug || ''}`,
      title: s.title,
      travelogue: s.travelogue ? s.travelogue.substring(0, 140) + '...' : 'Historical RV stop location logged via GPS.',
    }));
  return [...pins, ...legacyOrphans(new Set(stops.map((s) => String(s.nid))))];
}, getDataVersion);

export function getMapLocations() {
  return cache.get();
}

// Where to open the location picker for a stop that has no position yet: the
// trip's most recent stop that does have one. You are usually within a day's
// drive of it, which beats starting from a map of the whole world.
export function nearbyCoordinates(tripNid, exceptStopNid) {
  const siblings = readDataset('stops')
    .filter((s) => String(s.parent_trip_nid) === String(tripNid)
      && String(s.nid) !== String(exceptStopNid)
      && hasCoordinates(s))
    .sort((a, b) => (Number(b.arrival_date) || 0) - (Number(a.arrival_date) || 0));
  return siblings.length ? { lat: siblings[0].lat, lng: siblings[0].lng } : null;
}
