import fs from 'fs';
import path from 'path';
import { FILES_DIR, UPLOADS_DIR } from './dataPaths';
import {
  readDataset,
  writeDataset,
  allocateNid,
  allocateTid,
} from './adminStore.js';

// Photo management for the CMS. Photos are never deleted — the published
// flag hides a record from galleries/albums/lightboxes while explicit
// [img_assist] narrative embeds keep rendering (hiding those too is how a
// figure once vanished silently). Files on disk are never touched except by
// upload itself.

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

/**
 * Basename-only, whitelisted characters, whitelisted extension. NEVER mints
 * Drupal-style `_0` re-upload names — collisions are surfaced to the user
 * instead (checkDuplicate), because silent near-duplicate names are how the
 * export ended up with four copies of "Pyro show".
 */
export function sanitizeUploadFilename(name) {
  const base = path.basename(String(name || '')).replace(/^sites[\\/]default[\\/]files[\\/]?/i, '');
  const ext = path.extname(base).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { error: `File type ${ext || '(none)'} not allowed — use jpg, png, gif, or webp.` };
  }
  let stem = base
    .slice(0, -ext.length)
    .replace(/[^A-Za-z0-9._~ -]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-. ]+|[-. ]+$/g, '');
  if (!stem) return { error: 'Filename is empty after sanitizing.' };
  return { filename: `${stem}${ext}` };
}

// Same stem normalization InteractiveTravelogue uses to dedupe its lightbox —
// so "possible duplicate" here matches what the site itself would consider
// the same photo.
function normalizeStem(f) {
  return String(f || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.(preview|thumbnail|mini)\./i, '.')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/\s*\(\d+\)/g, '')
    .replace(/~\d+/g, '')
    .replace(/_exported_\d+([~_]\d+)*/g, '')
    .toLowerCase();
}

/**
 * @returns {{fileExists: boolean, similarRecords: Array}} —
 * fileExists: this exact name is already on disk (uploads or legacy 8k);
 * similarRecords: photo_titles entries whose normalized stem matches.
 */
export function checkDuplicate(filename) {
  const fileExists =
    fs.existsSync(path.join(UPLOADS_DIR, filename)) ||
    fs.existsSync(path.join(FILES_DIR, 'images', '8k', filename));

  const stem = normalizeStem(filename);
  const similarRecords = stem.length < 4 ? [] : readDataset('photos')
    .filter((p) => normalizeStem(p.filename) === stem)
    .map((p) => ({ image_nid: p.image_nid, filename: p.filename, title: p.title }));

  return { fileExists, similarRecords };
}

export function suggestRename(filename) {
  const ext = path.extname(filename);
  const stem = filename.slice(0, -ext.length);
  for (let n = 2; n < 100; n++) {
    const candidate = `${stem}-${n}${ext}`;
    if (!checkDuplicate(candidate).fileExists) return candidate;
  }
  return null;
}

export function getPhoto(imageNid) {
  return readDataset('photos').find((p) => String(p.image_nid) === String(imageNid)) || null;
}

export function createPhotoRecord({ filename, title, tripStopNid }) {
  const photos = readDataset('photos');
  const nid = allocateNid();
  const record = {
    image_nid: nid,
    image_vid: nid,
    filename: `uploads/${filename}`,
    title: title || '',
    trip_stop_nid: tripStopNid ? String(tripStopNid) : '',
  };
  photos.push(record);
  writeDataset('photos', photos);
  return record;
}

/**
 * Update title / trip_stop_nid / published on a photo record. Title changes
 * are mirrored into every album images[] entry carrying the same image_nid so
 * the two stores can't drift.
 */
export function updatePhotoRecord(imageNid, fields) {
  const photos = readDataset('photos');
  const idx = photos.findIndex((p) => String(p.image_nid) === String(imageNid));
  if (idx === -1) throw new Error(`Photo image_nid ${imageNid} not found`);

  const updated = { ...photos[idx] };
  if ('title' in fields) updated.title = fields.title;
  if ('trip_stop_nid' in fields) updated.trip_stop_nid = fields.trip_stop_nid ? String(fields.trip_stop_nid) : '';
  if ('published' in fields) {
    // absence = published: drop the field entirely when republishing so
    // records return to their pristine shape.
    if (fields.published === false) updated.published = false;
    else delete updated.published;
  }
  photos[idx] = updated;
  writeDataset('photos', photos);

  if ('title' in fields) {
    const albums = readDataset('albums');
    let touched = false;
    for (const album of albums) {
      for (const img of album.images || []) {
        if (String(img.image_nid) === String(imageNid) && img.title !== fields.title) {
          img.title = fields.title;
          touched = true;
        }
      }
    }
    if (touched) writeDataset('albums', albums);
  }

  return updated;
}

/**
 * Ensure the trip has an album and append the image entry to it. Albums are
 * matched by the slug convention 'photo-albums/<trip-slug>', falling back to
 * an exact title match; created with a fresh taxonomy tid when absent.
 * Returns { album, created, alreadyPresent }.
 */
export function appendToTripAlbum(trip, imageEntry) {
  const albums = readDataset('albums');
  const wantSlug = `photo-albums/${trip.slug}`;
  let album = albums.find((a) => a.slug === wantSlug) || albums.find((a) => a.title === trip.title);
  let created = false;

  if (!album) {
    album = { tid: allocateTid(), title: trip.title, weight: 0, slug: wantSlug, images: [] };
    albums.push(album);
    created = true;
  }
  if (!Array.isArray(album.images)) album.images = [];

  const alreadyPresent = album.images.some((i) => String(i.image_nid) === String(imageEntry.image_nid));
  if (!alreadyPresent) album.images.push(imageEntry);

  writeDataset('albums', albums);
  return { album: { tid: album.tid, title: album.title, slug: album.slug }, created, alreadyPresent };
}

/**
 * Optional cleanup tool (not a delete prerequisite — nothing is deletable):
 * swap every [img_assist|nid=from...] embed for the `to` photo across all
 * narrative fields, re-deriving the body mirrors.
 */
export function repointImageReferences(fromNid, toNid) {
  const pattern = new RegExp(`(\\[img_assist\\|nid=)${String(fromNid)}([\\|\\]])`, 'gi');
  let total = 0;

  const stops = readDataset('stops');
  let anyStopTouched = false;
  for (const s of stops) {
    let thisStopTouched = false;
    for (const field of ['travelogue', 'description']) {
      if (typeof s[field] === 'string' && pattern.test(s[field])) {
        pattern.lastIndex = 0;
        s[field] = s[field].replace(pattern, `$1${String(toNid)}$2`);
        total++;
        thisStopTouched = true;
      }
      pattern.lastIndex = 0;
    }
    // Re-derive the body mirror ONLY for the stop actually modified.
    if (thisStopTouched) {
      s.body = s.description || s.travelogue;
      anyStopTouched = true;
    }
  }
  if (anyStopTouched) writeDataset('stops', stops);

  const trips = readDataset('trips');
  let tripsTouched = false;
  for (const t of trips) {
    if (typeof t.travelogue === 'string' && pattern.test(t.travelogue)) {
      t.travelogue = t.travelogue.replace(pattern, `$1${String(toNid)}$2`);
      t.body = t.travelogue;
      total++;
      tripsTouched = true;
    }
    pattern.lastIndex = 0;
  }
  if (tripsTouched) writeDataset('trips', trips);

  return { replaced: total };
}
