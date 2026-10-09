#!/usr/bin/env node
// One-off content fix, 2026-10-09: four stops whose arrival date was wrong
// (found because each made its trip's date range absurd), plus explicit dates
// for the motorcycle trip, which has a 2022 "for sale" page filed as a stop.
//
// The four dates are inferred from the night counts of the stop before each
// one and were confirmed by Herb; the Athens one he gave directly (Sep 18).
// Time of day is preserved — only the calendar day moves.
//
// Run from modern-app:  node scripts/fix-trip-dates-2026-10.mjs [--write]
// Without --write it only prints what it would change. Idempotent.
import { readDataset, writeDataset } from '../src/lib/adminStore.js';
import { toSiteDateInput, fromSiteDateInput } from '../src/lib/siteDates.js';

const write = process.argv.includes('--write');

const STOP_FIXES = [
  { nid: '12095', title: 'Auckland Airport Hotel', from: '2026-01-12', to: '2025-12-12' },
  { nid: '9265', title: 'Athens', from: '2022-10-18', to: '2022-09-18' },
  { nid: '3854', title: 'Flight Home', from: '2014-06-20', to: '2014-06-05' },
  { nid: '4582', title: 'I80 to San Francisco', from: '2015-06-13', to: '2015-05-13' },
];
const TRIP_FIX = { nid: '4567', start_date: '2015-04-25', end_date: '2015-05-15' };

const fmt = (ts) => new Date(ts * 1000).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });

const stops = readDataset('stops');
let stopChanges = 0;
for (const fix of STOP_FIXES) {
  const stop = stops.find((s) => String(s.nid) === fix.nid);
  if (!stop || stop.title !== fix.title) throw new Error(`stop ${fix.nid} is not "${fix.title}"`);
  const current = toSiteDateInput(stop.arrival_date);
  if (current === fix.to) { console.log(`stop ${fix.nid} ${fix.title}: already ${fix.to}`); continue; }
  if (current !== fix.from) throw new Error(`stop ${fix.nid}: expected ${fix.from}, found ${current}`);
  const next = fromSiteDateInput(fix.to, stop.arrival_date);
  console.log(`stop ${fix.nid} ${fix.title}: ${fmt(Number(stop.arrival_date))} -> ${fmt(next)}`);
  // Keep the stored type: the export has these as strings.
  stop.arrival_date = typeof stop.arrival_date === 'string' ? String(next) : next;
  stopChanges++;
}

const trips = readDataset('trips');
const trip = trips.find((t) => String(t.nid) === TRIP_FIX.nid);
if (!trip) throw new Error(`trip ${TRIP_FIX.nid} not found`);
const tripChanged = trip.start_date !== TRIP_FIX.start_date || trip.end_date !== TRIP_FIX.end_date;
if (tripChanged) {
  console.log(`trip ${trip.nid} ${trip.title}: dates ${trip.start_date || '(none)'}..${trip.end_date || '(none)'} -> ${TRIP_FIX.start_date}..${TRIP_FIX.end_date}`);
  trip.start_date = TRIP_FIX.start_date;
  trip.end_date = TRIP_FIX.end_date;
} else {
  console.log(`trip ${trip.nid}: dates already set`);
}

if (!write) {
  console.log('\ndry run — pass --write to apply');
} else {
  if (stopChanges) writeDataset('stops', stops);
  if (tripChanged) writeDataset('trips', trips);
  console.log(`\nwrote ${stopChanges} stop(s)${tripChanged ? ' and 1 trip' : ''}`);
}
