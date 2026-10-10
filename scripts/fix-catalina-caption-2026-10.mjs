#!/usr/bin/env node
// One-off, 2026-10-09: Herb retitled photo 12185 from "Lolo in Catalina State
// Park" to "Lola in Catalina State Park" in the Photos screen. The album
// followed; the caption on the Tucson stop did not, because captions live in
// the page text. The code now carries a retitle into matching captions — this
// applies that same rule to the one edit made before it existed.
//
// Run from modern-app:  node scripts/fix-catalina-caption-2026-10.mjs [--write]
import { readDataset } from '../src/lib/adminStore.js';
import { retitleMatchingCaptions } from '../src/lib/adminPhotos.js';

const write = process.argv.includes('--write');
const NID = '12185';
const OLD = 'Lolo in Catalina State Park';
const NEW = 'Lola in Catalina State Park';

const photo = readDataset('photos').find((p) => String(p.image_nid) === NID);
if (!photo || photo.title !== NEW) throw new Error(`photo ${NID} is titled "${photo?.title}", expected "${NEW}"`);

const count = (title) => readDataset('stops')
  .reduce((n, s) => n + (String(s.travelogue || '').split(`nid=${NID}|title=${title}|`).length - 1), 0);
console.log(`captions reading "${OLD}": ${count(OLD)}   reading "${NEW}": ${count(NEW)}`);

if (!write) {
  console.log('dry run — pass --write to apply');
} else {
  const { replaced } = retitleMatchingCaptions(NID, OLD, NEW);
  console.log(`updated ${replaced} caption(s); now "${OLD}": ${count(OLD)}   "${NEW}": ${count(NEW)}`);
}
