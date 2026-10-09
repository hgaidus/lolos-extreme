#!/usr/bin/env node
// One-off content fix, 2026-10-09: positions for 31 stops that had none,
// reviewed and approved by Herb as a list.
//
// Where they came from:
//   - place-name lookups on OpenStreetMap (the named place, not necessarily
//     where the motorhome was parked);
//   - three coarser fallbacks where the exact place was not found: Victoria
//     (city centre), Suvarnabhumi (the airport), Wilderness Motorhome Rentals
//     (Christchurch Airport — a guess);
//   - the Burning Man, Carmel, Bishop and Death Valley stops reuse the pin of
//     an earlier stop at the same place.
//
// Run from modern-app:  node scripts/apply-stop-coordinates-2026-10.mjs [--write]
// A stop that already has a position is left alone, so anything placed by hand
// in the editor since wins. Idempotent.
import { readDataset, writeDataset } from '../src/lib/adminStore.js';

const write = process.argv.includes('--write');

const COORDS = {
  119: ['Normandy Farms Campground', 42.03836, -71.2849],
  1929: ['Holiday Park Campground', 39.01593, -75.76936],
  1934: ['Wye Oak State Park', 38.94007, -76.08438],
  1936: ['Chesapeake Bay Maritime Museum', 38.7887, -76.22205],
  1941: ['Annapolis', 38.97864, -76.49279],
  1946: ['Blackwater National Wildlife Refuge', 38.44485, -76.11957],
  1951: ['Eastern Neck National Wildlife Refuge', 39.03166, -76.22904],
  1967: ['Lake Placid', 44.28312, -73.98283],
  1994: ['Huntington Beach State Park / Brookgreen Gardens', 33.51319, -79.06228],
  2011: ['Stowe', 44.46438, -72.68562],
  2017: ['Clark Art Institute / Williams College Museum of Art', 42.70496, -73.21689],
  2023: ['Norman Rockwell Museum', 42.28783, -73.33594],
  2037: ['Patriots Point Naval & Maritime Museum / Fort Sumter', 32.79055, -79.90559],
  2048: ['Cape Henlopen State Park', 38.77093, -75.10333],
  2582: ['Nineteen Mile Brook Trailhead', 44.29209, -71.2113],
  6374: ['Suvarnabhumi Airport Hotel', 13.68188, 100.74858],
  9945: ['Salt Point State Park', 38.57722, -123.31249],
  9956: ['Sea Ranch Chapel', 38.73351, -123.47727],
  9961: ['St. Orres', 38.79227, -123.56164],
  9962: ['The Lost Coast', 39.82894, -123.84949],
  10033: ['Victoria', 48.42832, -123.36495],
  11216: ['Wilderness Motorhome Rentals', -43.48524, 172.53548],
  11840: ['Prepping Me and the Motorhome for Burning Man', 40.788124, -119.204169],
  11854: ['The Climax - The Burning of the Man', 40.789099, -119.203138],
  12108: ['Carmel and Big Sur', 36.550499, -121.929146],
  8842: ['Bishop', 37.36068, -118.394342],
  8746: ['Bishop', 37.361589, -118.395366],
  8829: ['Bishop', 37.361589, -118.395366],
  10482: ['Bishop', 37.361406, -118.395262],
  8843: ['Death Valley', 36.81281, -117.766168],
  10517: ['Death Valley National Park', 36.456874, -116.865589],
};

const stops = readDataset('stops');
let changed = 0;
for (const [nid, [title, lat, lng]] of Object.entries(COORDS)) {
  const stop = stops.find((s) => String(s.nid) === nid);
  if (!stop) throw new Error(`stop ${nid} not found`);
  if (stop.title.trim() !== title) throw new Error(`stop ${nid} is "${stop.title}", expected "${title}"`);
  if (Number.isFinite(stop.lat) && Number.isFinite(stop.lng)) {
    console.log(`stop ${nid} ${title}: already at ${stop.lat}, ${stop.lng} — left alone`);
    continue;
  }
  stop.lat = lat;
  stop.lng = lng;
  changed++;
  console.log(`stop ${nid} ${title}: ${lat}, ${lng}`);
}

if (!write) {
  console.log(`\ndry run — ${changed} stop(s) would change; pass --write to apply`);
} else {
  if (changed) writeDataset('stops', stops);
  console.log(`\nlocated ${changed} stop(s)`);
}
