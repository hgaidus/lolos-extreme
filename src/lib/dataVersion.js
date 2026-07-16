import fs from 'fs';
import path from 'path';
import { DATA_DIR, FILES_DIR, UPLOADS_DIR } from './dataPaths.js';

// Version stamps for the two things module-level caches derive from: the
// content JSON and the photo directories. Caches wrapped in makeVersioned
// recompute when the stamp changes, so a CMS save (or a server-side git pull,
// or an scp'd file) becomes visible everywhere within ~2 seconds — WITHOUT a
// process restart, and correctly across multiple Passenger worker processes.
//
// mtime polling was chosen over an in-memory invalidation bus deliberately:
// Passenger can run several Node workers for one app, and an in-process bump
// only reaches the worker that handled the write. Filesystem mtimes are the
// one channel every worker (and every out-of-band change) shares.

const TTL_MS = 2000;

const DATA_FILES = [
  'trips.json', 'stops.json', 'activities.json',
  'standalone_pages.json', 'photo_titles.json', 'albums.json', 'comments.json',
];

const PHOTO_DIRS = [
  path.join(FILES_DIR, 'images'),
  ...['1k', '2k', '3k', '4k', '5k', '6k', '7k', '8k'].map((t) => path.join(FILES_DIR, 'images', t)),
  path.join(FILES_DIR, 'images-old'),
  FILES_DIR,
  UPLOADS_DIR,
  path.join(UPLOADS_DIR, 'maps'),
];

function stamp(paths) {
  const parts = [];
  for (const p of paths) {
    try {
      parts.push(String(fs.statSync(p).mtimeMs));
    } catch {
      parts.push('-'); // path may not exist in every environment
    }
  }
  return parts.join('|');
}

let dataMemo = { value: null, expires: 0 };
export function getDataVersion() {
  const now = Date.now();
  if (now < dataMemo.expires) return dataMemo.value;
  dataMemo = { value: stamp(DATA_FILES.map((f) => path.join(DATA_DIR, f))), expires: now + TTL_MS };
  return dataMemo.value;
}

let photoMemo = { value: null, expires: 0 };
export function getPhotoDirVersion() {
  const now = Date.now();
  if (now < photoMemo.expires) return photoMemo.value;
  photoMemo = { value: stamp(PHOTO_DIRS), expires: now + TTL_MS };
  return photoMemo.value;
}

// Bypass the TTL memo after an in-process write (e.g. a photo upload) so the
// worker that performed it sees the change on its very next request.
export function expireVersionMemos() {
  dataMemo.expires = 0;
  photoMemo.expires = 0;
}

/**
 * Wrap an expensive computation so it recomputes only when a version stamp
 * changes. Usage: const cache = makeVersioned(build, getDataVersion);
 *                 const value = cache.get();
 */
export function makeVersioned(computeFn, versionFn) {
  let cachedVersion = null;
  let cachedValue = null;
  return {
    get() {
      const v = versionFn();
      if (v !== cachedVersion) {
        cachedValue = computeFn();
        cachedVersion = v;
      }
      return cachedValue;
    },
  };
}
