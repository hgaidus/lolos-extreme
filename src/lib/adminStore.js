import fs from 'fs';
import path from 'path';
// Explicit extension so plain `node scripts/*.mjs` can import this module
// directly (Next's bundler resolves it either way).
import { DATA_DIR } from './dataPaths.js';

// Single write layer for every content dataset the CMS touches. Centralizes
// the three things that have each caused real incidents when handled ad hoc:
// per-file indent (standalone_pages.json is 2-space, everything else 1-space —
// writing the wrong one once reformatted 698 lines), nid allocation (the
// datasets share one Drupal node-id namespace, and allocating from a subset
// minted ids that collided with photo image_nids), and non-atomic writes.

export const DATASETS = {
  trips: { file: 'trips.json' },
  stops: { file: 'stops.json' },
  activities: { file: 'activities.json' },
  pages: { file: 'standalone_pages.json' },
  photos: { file: 'photo_titles.json' },
  albums: { file: 'albums.json' },
};

function datasetPath(name) {
  const ds = DATASETS[name];
  if (!ds) throw new Error(`Unknown dataset: ${name}`);
  return path.join(DATA_DIR, ds.file);
}

// Indent is a property of each file, not a global convention. Detected from
// the raw text and remembered per file; re-detected when the file changes on
// disk (e.g. a server-side git pull could theoretically reformat).
const indentCache = new Map(); // file path -> { mtimeMs, indent, endsWithNewline }

function detectFormat(filePath, raw, mtimeMs) {
  const m = raw.match(/^\[\r?\n(\s+)/);
  const format = {
    mtimeMs,
    indent: m ? m[1] : ' ',
    endsWithNewline: raw.endsWith('\n'),
  };
  indentCache.set(filePath, format);
  return format;
}

function getFormat(filePath) {
  const stat = fs.statSync(filePath);
  const cached = indentCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return detectFormat(filePath, raw, stat.mtimeMs);
}

export function readDataset(name) {
  const filePath = datasetPath(name);
  const stat = fs.statSync(filePath);
  const raw = fs.readFileSync(filePath, 'utf-8');
  detectFormat(filePath, raw, stat.mtimeMs);
  return JSON.parse(raw);
}

// JSON.stringify silently turns NaN/Infinity into null and drops undefined —
// exactly the kind of corruption a validation gap upstream would produce.
// Refuse to write rather than persist it.
function assertJsonSafe(value, trail = '$') {
  if (value === null) return;
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return;
  if (t === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number at ${trail}`);
    return;
  }
  if (t === 'undefined' || t === 'function' || t === 'symbol' || t === 'bigint') {
    throw new Error(`Non-JSON value (${t}) at ${trail}`);
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertJsonSafe(v, `${trail}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(value)) assertJsonSafe(v, `${trail}.${k}`);
}

export function writeDataset(name, data) {
  const filePath = datasetPath(name);
  const format = getFormat(filePath);

  assertJsonSafe(data);
  const serialized =
    JSON.stringify(data, null, format.indent) + (format.endsWithNewline ? '\n' : '');

  // Write-then-rename so a crash mid-write can never leave a torn JSON file.
  // The content repo gitignores *.tmp so `git add -A` can't sweep a stray one.
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, serialized, 'utf-8');
  fs.renameSync(tmpPath, filePath);

  const stat = fs.statSync(filePath);
  detectFormat(filePath, serialized, stat.mtimeMs);
}

// All node-bearing datasets draw from ONE Drupal node-id namespace, and photo
// image_nids currently occupy its top (max 12177 vs stop max 12108). Allocate
// above the max of every namespace member, or new ids collide with photos.
export function allocateNid() {
  let max = 0;
  const consider = (v) => {
    const n = Number(v);
    if (Number.isFinite(n) && n > max) max = n;
  };
  for (const name of ['trips', 'stops', 'pages', 'activities']) {
    for (const rec of readDataset(name)) consider(rec.nid);
  }
  for (const rec of readDataset('photos')) consider(rec.image_nid);
  for (const album of readDataset('albums')) {
    for (const img of album.images || []) consider(img.image_nid);
  }
  return String(max + 1);
}

// Albums are Drupal taxonomy terms — a separate id namespace from nodes.
export function allocateTid() {
  let max = 0;
  for (const album of readDataset('albums')) {
    const n = Number(album.tid);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

// Lifted verbatim from the original adminData.js so slug behavior is unchanged.
export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ensureUniqueSlug(slug, takenSet) {
  let candidate = slug;
  let n = 2;
  while (takenSet.has(candidate)) {
    candidate = `${slug}-${n}`;
    n += 1;
  }
  return candidate;
}

export function allContentSlugs() {
  const taken = new Set();
  for (const name of ['trips', 'stops', 'pages']) {
    for (const rec of readDataset(name)) {
      if (rec.slug) taken.add(rec.slug);
    }
  }
  return taken;
}
