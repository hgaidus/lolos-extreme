import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { DATA_DIR } from './dataPaths';

const execFileAsync = promisify(execFile);

const TRIPS_PATH = path.join(DATA_DIR, 'trips.json');
const STOPS_PATH = path.join(DATA_DIR, 'stops.json');

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 1), 'utf-8');
}

export function getTrips() {
  return readJSON(TRIPS_PATH).sort((a, b) => Number(a.year || 0) - Number(b.year || 0));
}

export function getTrip(nid) {
  const trips = readJSON(TRIPS_PATH);
  return trips.find((t) => String(t.nid) === String(nid)) || null;
}

export function updateTrip(nid, fields) {
  const trips = readJSON(TRIPS_PATH);
  const idx = trips.findIndex((t) => String(t.nid) === String(nid));
  if (idx === -1) throw new Error(`Trip nid ${nid} not found`);

  const updated = { ...trips[idx], ...fields };
  updated.body = updated.travelogue;
  trips[idx] = updated;

  writeJSON(TRIPS_PATH, trips);
  return updated;
}

export function getStop(nid) {
  const stops = readJSON(STOPS_PATH);
  return stops.find((s) => String(s.nid) === String(nid)) || null;
}

export function getStopsForTrip(tripNid) {
  const stops = readJSON(STOPS_PATH);
  return stops.filter((s) => String(s.parent_trip_nid) === String(tripNid));
}

// exact 20 values confirmed present across stops.json; category_listing pages
// match on this string exactly, so the CMS constrains new/edited stops to
// this fixed set rather than allowing free text.
export const STOP_CATEGORIES = [
  'Amusement Park', 'BLM/National Forest', 'Base Camp', 'Canadian National Park',
  'City/County Park', 'City/Village', 'Commercial Campground', 'Driving Break',
  'Landmark', 'Museum', 'National Park', 'Natural Beauty', 'Navajo Land',
  'Novelty', 'Provincial Park', 'Scenic Drive', 'Ski Area', 'State Park',
  'Stopover', 'Store', 'Truck Stop',
];

export function getDistinctStates() {
  const stops = readJSON(STOPS_PATH);
  return Array.from(new Set(stops.map((s) => s.state).filter(Boolean))).sort();
}

export function getDistinctAuthors() {
  const stops = readJSON(STOPS_PATH);
  return Array.from(new Set(stops.map((s) => s.author).filter(Boolean))).sort();
}

export function updateStop(nid, fields) {
  const stops = readJSON(STOPS_PATH);
  const idx = stops.findIndex((s) => String(s.nid) === String(nid));
  if (idx === -1) throw new Error(`Stop nid ${nid} not found`);

  const updated = { ...stops[idx], ...fields };
  updated.body = updated.description || updated.travelogue;
  stops[idx] = updated;

  writeJSON(STOPS_PATH, stops);
  return updated;
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function allSlugs(trips, stops) {
  return new Set([...trips.map((t) => t.slug), ...stops.map((s) => s.slug)]);
}

function nextNid(trips, stops) {
  const all = [...trips, ...stops].map((r) => Number(r.nid)).filter((n) => Number.isFinite(n));
  return String(Math.max(0, ...all) + 1);
}

export function createStop(parentTripNid, fields) {
  const trips = readJSON(TRIPS_PATH);
  const stops = readJSON(STOPS_PATH);

  const parentTrip = trips.find((t) => String(t.nid) === String(parentTripNid));
  if (!parentTrip) throw new Error(`Parent trip nid ${parentTripNid} not found`);

  const taken = allSlugs(trips, stops);
  let slug = slugify(fields.title || 'new-stop');
  let candidate = slug;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${slug}-${n}`;
    n += 1;
  }
  slug = candidate;

  const nid = nextNid(trips, stops);
  const newStop = {
    nid,
    vid: nid,
    title: fields.title || '',
    slug,
    parent_trip_nid: String(parentTripNid),
    description: fields.description || '',
    travelogue: fields.travelogue || '',
    body: fields.description || fields.travelogue || '',
    miles: fields.miles ?? 0,
    hours: fields.hours ?? 0,
    nights: fields.nights ?? 0,
    arrival_date: fields.arrival_date ?? Math.floor(Date.now() / 1000),
    created: Math.floor(Date.now() / 1000),
    author: fields.author || '',
    state: fields.state || '',
    category: fields.category || '',
  };

  stops.push(newStop);
  writeJSON(STOPS_PATH, stops);
  return newStop;
}

// Runs from within DATA_DIR, which is its own git repo (see project setup:
// local + production server both have DATA_DIR wired to the
// hgaidus/lolos-extreme-content remote). A push failure is surfaced as a
// warning rather than rolled back — the file write already succeeded and
// remains locally revertible via git either way.
export async function commitAndPush(message) {
  const opts = { cwd: DATA_DIR };
  try {
    await execFileAsync('git', ['add', '-A'], opts);
    try {
      await execFileAsync('git', ['commit', '-m', message], opts);
    } catch (err) {
      if (!/nothing to commit/i.test(err.stdout || err.message || '')) throw err;
      return { committed: false, pushed: false };
    }
    try {
      await execFileAsync('git', ['push'], opts);
      return { committed: true, pushed: true };
    } catch (pushErr) {
      return { committed: true, pushed: false, pushError: pushErr.message };
    }
  } catch (err) {
    return { committed: false, pushed: false, error: err.message };
  }
}
