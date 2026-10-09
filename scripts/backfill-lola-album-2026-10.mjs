#!/usr/bin/env node
// One-off, 2026-10-09: the photos Lolo uploaded for "2026 Picking up Lola"
// landed with no stop and in no album, because they were added from the trip
// editor and from the Tucson stop before it had been created. The code now
// handles both cases; this files the ones that predate the fix.
//
// Trip-level photos first, then the stop's, so the album runs in upload order.
//
// Run from modern-app:  node scripts/backfill-lola-album-2026-10.mjs [--write]
// Idempotent: photos already in the album or already assigned are left alone.
import { readDataset } from '../src/lib/adminStore.js';
import { appendToTripAlbum, albumEntryFor, claimEmbeddedPhotos } from '../src/lib/adminPhotos.js';

const write = process.argv.includes('--write');
const TRIP_NID = '12181';
const STOP_NID = '12191';

const trip = readDataset('trips').find((t) => String(t.nid) === TRIP_NID);
const stop = readDataset('stops').find((s) => String(s.nid) === STOP_NID);
if (!trip || !stop || String(stop.parent_trip_nid) !== TRIP_NID) throw new Error('trip/stop not as expected');

const embeds = (text) => [...String(text || '').matchAll(/\[img_assist\|nid=(\d+)/g)].map((m) => m[1]);
const photos = readDataset('photos');
const byNid = new Map(photos.map((p) => [String(p.image_nid), p]));
const free = (p) => p && (!p.trip_stop_nid || String(p.trip_stop_nid) === '0');

const tripLevel = embeds(trip.travelogue).map((n) => byNid.get(n)).filter(free)
  .sort((a, b) => Number(a.image_nid) - Number(b.image_nid));
const stopLevel = embeds(`${stop.travelogue}\n${stop.description}`).map((n) => byNid.get(n)).filter(free);

console.log(`trip "${trip.title}" (published: ${trip.published !== false})`);
console.log('  trip-level photos to add to the album:', tripLevel.map((p) => `${p.image_nid} ${p.title}`));
console.log(`  photos to link to stop "${stop.title}" and add:`, stopLevel.map((p) => `${p.image_nid} ${p.title}`));

if (!write) {
  console.log('\ndry run — pass --write to apply');
} else {
  for (const p of tripLevel) appendToTripAlbum(trip, albumEntryFor(p));
  const { linked } = claimEmbeddedPhotos(stop, trip);
  const album = readDataset('albums').find((a) => a.slug === `photo-albums/${trip.slug}`);
  console.log(`\nalbum ${album.slug} (tid ${album.tid}, weight ${album.weight}) now holds:`, album.images.map((i) => i.image_nid).join(' '));
  console.log('linked to the stop:', linked.join(' '));
}
