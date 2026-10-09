#!/usr/bin/env node
// One-off content fix, 2026-10-09, both parts asked for by Herb:
//
// 1. Take home off the map. 34 stops were pinned on the two family houses to
//    within about 40 metres, on a public map. Their lat/lng is removed. Found
//    by position, not by title: 27 are titled "Home", the rest "Flight Home",
//    "San Francisco and Flight Home" and "Home Sweet Home". Friends' houses
//    elsewhere are not touched.
//
// 2. Give 13 unlocated stops the position another stop of the SAME TITLE
//    already has — the most recent one from before it, else the earliest
//    after. Only places whose existing pins agree closely (the Bishop and
//    Death Valley stops, whose pins are kilometres apart, are left for a
//    person to place).
//
// Run from modern-app:  node scripts/fix-stop-locations-2026-10.mjs [--write]
// Without --write it only prints the plan. Idempotent.
import { readDataset, writeDataset } from '../src/lib/adminStore.js';

const write = process.argv.includes('--write');

// The two houses, rounded to ~1 km so this file does not itself publish them.
const HOME_AREAS = [{ lat: 41.06, lng: -74.10 }, { lat: 38.42, lng: -122.58 }];
const HOME_RADIUS_KM = 1.5;
const EXPECTED_HOME_PINS = 34;

const COPY_TARGETS = [
  '1975', '2020',          // Mt. Brodie Ski Area
  '1986', '2027', '2044',  // Flying J - Latta
  '1988', '2029',          // Hunting Island State Park
  '2049',                  // First Landing State Park
  '2059',                  // Assateague Island
  '5393',                  // South Lake Tahoe
  '7565', '10588', '10659', // Yosemite Valley
];

const has = (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng);
const km = (a, b) => {
  const R = 6371, r = Math.PI / 180;
  const x = Math.sin((b.lat - a.lat) * r / 2) ** 2
    + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lng - a.lng) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const when = (s) => Number(s.arrival_date) || Number(s.created) || 0;

const stops = readDataset('stops');

// ---- 1. home pins
const homePins = stops.filter((s) => has(s) && HOME_AREAS.some((h) => km(h, s) < HOME_RADIUS_KM));
const titles = {};
for (const s of homePins) titles[s.title] = (titles[s.title] || 0) + 1;
console.log(`home pins to remove: ${homePins.length}`, JSON.stringify(titles));
const alreadyRemoved = homePins.length === 0;
if (!alreadyRemoved && homePins.length !== EXPECTED_HOME_PINS) {
  throw new Error(`expected ${EXPECTED_HOME_PINS} home pins, found ${homePins.length} — look before changing anything`);
}

// ---- 2. copies (sources chosen BEFORE anything is removed or added)
const located = stops.filter((s) => has(s) && !homePins.includes(s));
const copies = [];
for (const nid of COPY_TARGETS) {
  const target = stops.find((s) => String(s.nid) === nid);
  if (!target) throw new Error(`stop ${nid} not found`);
  if (has(target)) { console.log(`stop ${nid} ${target.title}: already located`); continue; }
  const same = located.filter((s) => norm(s.title) === norm(target.title));
  if (!same.length) throw new Error(`stop ${nid} ${target.title}: no located stop shares its title`);
  const before = same.filter((s) => when(s) < when(target)).sort((a, b) => when(b) - when(a));
  const after = same.filter((s) => when(s) >= when(target)).sort((a, b) => when(a) - when(b));
  const source = before[0] || after[0];
  copies.push({ target, source });
  console.log(`stop ${nid} ${target.title}: ${source.lat}, ${source.lng}  (from stop ${source.nid}, ${new Date(when(source) * 1000).getFullYear()})`);
}

if (!write) {
  console.log('\ndry run — pass --write to apply');
} else {
  for (const s of homePins) { delete s.lat; delete s.lng; }
  for (const { target, source } of copies) { target.lat = source.lat; target.lng = source.lng; }
  if (homePins.length || copies.length) writeDataset('stops', stops);
  console.log(`\nremoved ${homePins.length} home pin(s), located ${copies.length} stop(s)`);
}
