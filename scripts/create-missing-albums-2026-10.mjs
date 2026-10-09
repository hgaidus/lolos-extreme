#!/usr/bin/env node
// One-off, 2026-10-09: four trips have photos linked to their stops but no
// album — albums on the Drupal site were assembled by hand and these were
// never made. This builds one from what the data already says: every photo
// whose trip_stop_nid is a stop of the trip, ordered by the stops' arrival
// and, within a stop, by upload order (image_nid).
//
// Also fixes two photo titles that were still their camera file names while
// the caption on the page had the real one.
//
// Run from modern-app:
//   node scripts/create-missing-albums-2026-10.mjs <tripNid> [...] [--titles] [--write]
// Idempotent: a photo already in the trip's album is skipped.
import { readDataset, writeDataset } from '../src/lib/adminStore.js';
import { appendToTripAlbum, albumEntryFor, updatePhotoRecord } from '../src/lib/adminPhotos.js';

const args = process.argv.slice(2);
const write = args.includes('--write');
const fixTitles = args.includes('--titles');
const tripNids = args.filter((a) => /^\d+$/.test(a));

const TITLE_FIXES = [
  { nid: '12182', from: 'PXL 20260830 235641515', to: 'Lolo' },
  { nid: '12188', from: 'PXL 20260827 143401216', to: 'Rattlesnake along our trail' },
];

if (fixTitles) {
  for (const fix of TITLE_FIXES) {
    const photo = readDataset('photos').find((p) => String(p.image_nid) === fix.nid);
    if (!photo) throw new Error(`photo ${fix.nid} not found`);
    if (photo.title === fix.to) { console.log(`photo ${fix.nid}: already "${fix.to}"`); continue; }
    if (photo.title !== fix.from) throw new Error(`photo ${fix.nid} is titled "${photo.title}", expected "${fix.from}"`);
    console.log(`photo ${fix.nid}: "${fix.from}" -> "${fix.to}"`);
    if (write) updatePhotoRecord(fix.nid, { title: fix.to }); // mirrors into albums
  }
}

const when = (s) => Number(s.arrival_date) || Number(s.created) || 0;
for (const tripNid of tripNids) {
  const trip = readDataset('trips').find((t) => String(t.nid) === tripNid);
  if (!trip) throw new Error(`trip ${tripNid} not found`);
  const stops = readDataset('stops')
    .filter((s) => String(s.parent_trip_nid) === tripNid)
    .sort((a, b) => when(a) - when(b));
  const order = new Map(stops.map((s, i) => [String(s.nid), i]));
  const photos = readDataset('photos')
    .filter((p) => order.has(String(p.trip_stop_nid)))
    .sort((a, b) => order.get(String(a.trip_stop_nid)) - order.get(String(b.trip_stop_nid))
      || Number(a.image_nid) - Number(b.image_nid));

  const existing = readDataset('albums').find((a) => a.slug === `photo-albums/${trip.slug}` || a.title === trip.title);
  console.log(`\n${trip.title.trim()} (nid ${tripNid}): ${photos.length} photos across ${stops.length} stops`
    + (existing ? ` — album exists with ${existing.images.length}` : ' — no album yet'));
  for (const s of stops) {
    console.log(`   ${s.title.trim()}: ${photos.filter((p) => String(p.trip_stop_nid) === String(s.nid)).length}`);
  }
  if (write) {
    // The first photo goes through appendToTripAlbum so the album is created
    // exactly as the CMS would create it; the rest are added in ONE write.
    // (A write per photo, 124 in a row, lost a race with the file-sync client
    // on Windows: EPERM on the rename.)
    const { album: made } = appendToTripAlbum(trip, albumEntryFor(photos[0]));
    const albums = readDataset('albums');
    const album = albums.find((a) => a.tid === made.tid);
    const present = new Set(album.images.map((i) => String(i.image_nid)));
    let added = 0;
    for (const p of photos) {
      if (present.has(String(p.image_nid))) continue;
      album.images.push(albumEntryFor(p));
      added++;
    }
    // Keep the intended order even if an earlier, interrupted run added some.
    const rank = new Map(photos.map((p, i) => [String(p.image_nid), i]));
    album.images.sort((a, b) => (rank.get(String(a.image_nid)) ?? 1e9) - (rank.get(String(b.image_nid)) ?? 1e9));
    writeDataset('albums', albums);
    console.log(`   -> ${album.slug} (tid ${album.tid}): added ${added}, now ${album.images.length}`);
  }
}
if (!write) console.log('\ndry run — pass --write to apply');
