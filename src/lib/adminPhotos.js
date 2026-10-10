import fs from 'fs';
import path from 'path';
import { FILES_DIR, UPLOADS_DIR } from './dataPaths.js';
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

  const previousTitle = photos[idx].title || '';
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

    // And into the captions on pages, where they were simply the old title.
    if (fields.title !== previousTitle) {
      updated.captionsUpdated = retitleMatchingCaptions(imageNid, previousTitle, fields.title).replaced;
    }
  }

  return updated;
}

// A caption is stored inside the page text, in the photo's own embed tag, with
// the tag's delimiters swapped out so it cannot break the tag. Same rule as
// the photo picker applies when it writes one.
const asCaption = (s) => String(s || '').replace(/\|/g, '/').replace(/\]/g, ')').trim();

/**
 * When a photo is retitled, update the caption on every page where the caption
 * was just the old title.
 *
 * The caption under a photo on a page is not the photo's title — it is text in
 * that page, written when the photo was placed, and it is allowed to differ
 * (442 of the site's 5,819 placements do). So retitling a photo in the Photos
 * screen used to change the album and leave the page showing the old words,
 * which looks like the edit did not take.
 *
 * Only captions that MATCH the old title are touched: those were never a
 * separate piece of writing, just the title repeated. A caption someone worded
 * differently is theirs and stays. "Match" ignores capitalisation and runs of
 * spaces, because a good share of the differing ones differ in nothing else
 * ("Herb and Boys with Rental RV" on the page, "…boys with rental RV" as the
 * title) and those are the same words. Covers every place a photo can be embedded:
 * stop travelogue and description, trip travelogue, standalone page body.
 * Activities never embed photos.
 */
export function retitleMatchingCaptions(imageNid, oldTitle, newTitle) {
  const from = asCaption(oldTitle);
  const to = asCaption(newTitle);
  if (!from || from === to) return { replaced: 0 };

  const loose = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase();
  const fromLoose = loose(from);
  const tag = new RegExp(`(\\[img_assist\\|nid=${String(imageNid)}\\|title=)([^|\\]]*)`, 'g');
  let replaced = 0;
  const rewrite = (text) => {
    if (typeof text !== 'string' || !text.includes(`nid=${String(imageNid)}|`)) return text;
    return text.replace(tag, (whole, head, caption) => {
      if (loose(caption) !== fromLoose) return whole;
      replaced++;
      return head + to;
    });
  };

  const stops = readDataset('stops');
  let stopsTouched = false;
  for (const stop of stops) {
    const before = replaced;
    stop.travelogue = rewrite(stop.travelogue);
    stop.description = rewrite(stop.description);
    if (replaced !== before) {
      stop.body = stop.description || stop.travelogue; // the mirror, as updateStop keeps it
      stopsTouched = true;
    }
  }
  if (stopsTouched) writeDataset('stops', stops);

  const trips = readDataset('trips');
  let tripsTouched = false;
  for (const trip of trips) {
    const before = replaced;
    trip.travelogue = rewrite(trip.travelogue);
    if (replaced !== before) {
      trip.body = trip.travelogue;
      tripsTouched = true;
    }
  }
  if (tripsTouched) writeDataset('trips', trips);

  const pages = readDataset('pages');
  let pagesTouched = false;
  for (const page of pages) {
    const before = replaced;
    page.body = rewrite(page.body);
    if (replaced !== before) pagesTouched = true;
  }
  if (pagesTouched) writeDataset('pages', pages);

  return { replaced };
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
    // The albums index sorts by weight, then newest tid first, and the trip
    // albums all sit at the lowest weight — so a new album takes that weight
    // to land at the top of the list rather than among the odds and ends at 0.
    const weight = albums.reduce((min, a) => Math.min(min, Number(a.weight) || 0), 0);
    album = { tid: allocateTid(), title: trip.title, weight, slug: wantSlug, images: [] };
    // A draft trip's photos are not public yet either. There is no publish
    // switch for albums in the admin, so this one follows its trip: hidden
    // now, shown by publishTripAlbum when the trip is published.
    if (trip.published === false) album.published = false;
    albums.push(album);
    created = true;
  }
  if (!Array.isArray(album.images)) album.images = [];

  const alreadyPresent = album.images.some((i) => String(i.image_nid) === String(imageEntry.image_nid));
  if (!alreadyPresent) album.images.push(imageEntry);

  writeDataset('albums', albums);
  return { album: { tid: album.tid, title: album.title, slug: album.slug }, created, alreadyPresent };
}

/** The album images[] entry for a photo record. */
export function albumEntryFor(photo) {
  return {
    url: `/photos/${photo.filename}`,
    title: photo.title || '',
    filename: photo.filename,
    image_nid: photo.image_nid,
  };
}

/** Show a trip's album once the trip itself goes public. No-op if it has none. */
export function publishTripAlbum(trip) {
  const albums = readDataset('albums');
  const album = albums.find((a) => a.slug === `photo-albums/${trip.slug}`);
  if (!album || album.published !== false) return false;
  delete album.published;
  writeDataset('albums', albums);
  return true;
}

const unassigned = (photo) => !photo.trip_stop_nid || String(photo.trip_stop_nid) === '0';

/**
 * Claim the photos a stop's text embeds that belong to no stop yet: set their
 * trip_stop_nid (which is what the album lightbox's "Go to Trip Stop" link
 * reads) and add them to the trip's album, oldest upload first.
 *
 * This is what makes the link automatic. A photo can only be told its stop at
 * upload if the stop already exists, and the natural way to write a new stop
 * is to add its photos BEFORE pressing Create — so every one of them used to
 * land with no stop and in no album.
 *
 * Deliberately limited to unassigned photos. A photo that already has a stop
 * keeps it, and nothing already-assigned is added to an album here: the
 * migrated albums are hand-picked subsets, and re-adding every embedded photo
 * on each save would undo that curation.
 */
export function claimEmbeddedPhotos(stop, trip) {
  const text = `${stop.travelogue || ''}\n${stop.description || ''}`;
  const embedded = new Set([...text.matchAll(/\[img_assist\|nid=(\d+)/g)].map((m) => m[1]));
  if (!embedded.size) return { linked: [] };

  const photos = readDataset('photos');
  const claimed = photos
    .filter((p) => embedded.has(String(p.image_nid)) && unassigned(p))
    .sort((a, b) => Number(a.image_nid) - Number(b.image_nid));
  if (!claimed.length) return { linked: [] };

  for (const p of claimed) p.trip_stop_nid = String(stop.nid);
  writeDataset('photos', photos);
  if (trip) for (const p of claimed) appendToTripAlbum(trip, albumEntryFor(p));
  return { linked: claimed.map((p) => String(p.image_nid)) };
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
