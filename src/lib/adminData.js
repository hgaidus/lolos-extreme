import { execFile } from 'child_process';
import { promisify } from 'util';
import { DATA_DIR, UPLOADS_DIR } from './dataPaths';
import {
  readDataset,
  writeDataset,
  allocateNid,
  slugify,
  ensureUniqueSlug,
  allContentSlugs,
} from './adminStore';

// Facade over adminStore: keeps the exported API the routes/pages already use,
// while reads/writes/nid-allocation go through the shared write layer (per-file
// indent preservation, atomic writes, namespace-wide nid allocation).

const execFileAsync = promisify(execFile);

export function getTrips() {
  return readDataset('trips').sort((a, b) => Number(a.year || 0) - Number(b.year || 0));
}

export function getTrip(nid) {
  return readDataset('trips').find((t) => String(t.nid) === String(nid)) || null;
}

export function updateTrip(nid, fields) {
  const trips = readDataset('trips');
  const idx = trips.findIndex((t) => String(t.nid) === String(nid));
  if (idx === -1) throw new Error(`Trip nid ${nid} not found`);

  const updated = { ...trips[idx], ...fields };
  updated.body = updated.travelogue;
  trips[idx] = updated;

  writeDataset('trips', trips);
  return updated;
}

export function getStop(nid) {
  return readDataset('stops').find((s) => String(s.nid) === String(nid)) || null;
}

export function getStopsForTrip(tripNid) {
  return readDataset('stops').filter((s) => String(s.parent_trip_nid) === String(tripNid));
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
  const stops = readDataset('stops');
  return Array.from(new Set(stops.map((s) => s.state).filter(Boolean))).sort();
}

export function getDistinctAuthors() {
  const stops = readDataset('stops');
  return Array.from(new Set(stops.map((s) => s.author).filter(Boolean))).sort();
}

export function updateStop(nid, fields) {
  const stops = readDataset('stops');
  const idx = stops.findIndex((s) => String(s.nid) === String(nid));
  if (idx === -1) throw new Error(`Stop nid ${nid} not found`);

  const updated = { ...stops[idx], ...fields };
  updated.body = updated.description || updated.travelogue;
  stops[idx] = updated;

  writeDataset('stops', stops);
  return updated;
}

export function createStop(parentTripNid, fields) {
  const trips = readDataset('trips');
  const stops = readDataset('stops');

  const parentTrip = trips.find((t) => String(t.nid) === String(parentTripNid));
  if (!parentTrip) throw new Error(`Parent trip nid ${parentTripNid} not found`);

  const slug = ensureUniqueSlug(slugify(fields.title || 'new-stop'), allContentSlugs());
  const nid = allocateNid();

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
  writeDataset('stops', stops);
  return newStop;
}

// Runs from within DATA_DIR, which is its own git repo (local + production
// server both wired to the hgaidus/lolos-extreme-content remote). The file
// write has already succeeded by the time this runs and is never rolled back;
// `status` tells the caller how much of the versioning pipeline followed:
//   'pushed'            committed and on GitHub
//   'push_failed'       committed locally, GitHub push failed (amber: backup
//                       deferred; the next successful push carries it)
//   'commit_failed'     the edit is on disk but NOT in git at all (red: the
//                       change is unversioned — investigate before continuing)
//   'nothing_to_commit' a no-op edit
async function gitCommitAndPush(cwd, message) {
  const opts = { cwd };
  try {
    await execFileAsync('git', ['add', '-A'], opts);
    try {
      await execFileAsync('git', ['commit', '-m', message], opts);
    } catch (err) {
      if (!/nothing to commit/i.test(err.stdout || err.message || '')) throw err;
      return { status: 'nothing_to_commit', committed: false, pushed: false };
    }
    try {
      await execFileAsync('git', ['push'], opts);
      return { status: 'pushed', committed: true, pushed: true };
    } catch (pushErr) {
      return { status: 'push_failed', committed: true, pushed: false, pushError: pushErr.message };
    }
  } catch (err) {
    return { status: 'commit_failed', committed: false, pushed: false, error: err.message };
  }
}

export async function commitAndPush(message) {
  return gitCommitAndPush(DATA_DIR, message);
}

// The uploads directory is its own git repo (hgaidus/lolos-photo-uploads);
// pushing each uploaded binary is what gives new photos an off-site copy
// within seconds of upload.
export async function commitAndPushUploads(message) {
  return gitCommitAndPush(UPLOADS_DIR, message);
}
