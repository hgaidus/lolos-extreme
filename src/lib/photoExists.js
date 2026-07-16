import fs from 'fs';
import path from 'path';
import { FILES_DIR } from './dataPaths';
import { getPhotoDirVersion, expireVersionMemos } from './dataVersion';

// The index rebuilds when any photo directory's mtime changes (a new upload,
// an scp'd file), so a just-uploaded photo passes the existence gate without
// a process restart. The per-filename result cache must flush with it —
// otherwise stale negative results would keep hiding the new file.
let cachedIndex = null;
let cachedIndexVersion = null;
const resultCache = new Map();

// For the upload route: force the writing worker to see its own upload on the
// very next request instead of waiting out the ~2s version-memo TTL.
export function invalidatePhotoIndex() {
  expireVersionMemos();
  cachedIndex = null;
  cachedIndexVersion = null;
  resultCache.clear();
}

// Characters that may follow a stem in a real filename (e.g. "foo.jpg",
// "foo_1.jpg", "foo~2.jpg", "foo 2.jpg"). Kept in sync with the fuzzy rules in
// photoFileExists below.
const STEM_DELIMITERS = new Set(['.', '_', '~', ' ']);

function buildIndex() {
  const version = getPhotoDirVersion();
  if (cachedIndex && cachedIndexVersion === version) return cachedIndex;
  resultCache.clear();
  cachedIndexVersion = version;
  const baseDirs = [
    path.join(FILES_DIR, 'images'),
    path.join(FILES_DIR, 'images', '1k'),
    path.join(FILES_DIR, 'images', '2k'),
    path.join(FILES_DIR, 'images', '3k'),
    path.join(FILES_DIR, 'images', '4k'),
    path.join(FILES_DIR, 'images', '5k'),
    path.join(FILES_DIR, 'images', '6k'),
    path.join(FILES_DIR, 'images', '7k'),
    path.join(FILES_DIR, 'images', '8k'),
    path.join(FILES_DIR, 'images-old'),
    FILES_DIR,
  ];

  const files = new Set();
  // Every prefix of a filename that is immediately followed by a stem
  // delimiter. Membership here is exactly equivalent to the four startsWith
  // rules the fuzzy match used to test against every file in turn, but as an
  // O(1) lookup — that linear scan cost ~5.7s on the photo-albums index, which
  // resolves thousands of filenames per request.
  const stemPrefixes = new Set();

  for (const dir of baseDirs) {
    try {
      for (const entry of fs.readdirSync(dir)) {
        const f = entry.toLowerCase();
        files.add(f);
        for (let i = 0; i < f.length; i++) {
          if (STEM_DELIMITERS.has(f[i])) stemPrefixes.add(f.slice(0, i));
        }
      }
    } catch {
      // directory may not exist in every environment; skip it
    }
  }

  cachedIndex = { files, stemPrefixes };
  return cachedIndex;
}

// Mirrors the tiered exact/fuzzy lookup the /photos/[...path] route uses,
// so we can tell upfront whether a referenced photo will actually resolve
// to a real file instead of finding out via a 404 <img> in the browser.
export function photoFileExists(filename) {
  if (!filename) return false;
  const cached = resultCache.get(filename);
  if (cached !== undefined) return cached;

  const { files, stemPrefixes } = buildIndex();
  const clean = filename.replace(/^sites\/default\/files\/(?:images\/)?/i, '').toLowerCase();
  const base = path.basename(clean);

  let result;
  if (files.has(base)) {
    result = true;
  } else {
    const noMod = clean.replace(/\.(preview|thumbnail|mini)\./, '.');
    const ext = path.extname(noMod);
    const stem = path.basename(ext ? noMod.slice(0, -ext.length) : noMod);

    if (!stem || stem.length < 3) {
      result = false;
    } else if (stemPrefixes.has(stem)) {
      // Equivalent to the old startsWith(stem + '.'|'_'|'~'|' ') rules.
      result = true;
    } else if (stem.length > 6) {
      // Last resort: the stem appearing anywhere in a filename. No prefix
      // index can answer this, but it only runs for names that matched
      // nothing above, so the scan is rare rather than routine.
      result = false;
      for (const f of files) {
        if (f.includes(stem)) {
          result = true;
          break;
        }
      }
    } else {
      result = false;
    }
  }

  resultCache.set(filename, result);
  return result;
}
