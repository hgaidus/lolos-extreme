// One-time backfill: moves the hardcoded trip metadata (nav menus, trip
// index, overview maps, authors) onto the trip records themselves, so
// src/lib/tripMeta.js can derive what src/data/menuTrips.js, tripIndex.js,
// and tripMaps.js hardcode today — and so trips created through the CMS
// slot into navigation automatically.
//
// Fields written per trip (absent = not applicable, keeping diffs minimal):
//   region      crossCountry|eastCoast|westCoast|international (nav grouping)
//   menu_label  short dropdown label
//   menu_hover  dropdown hover text (only where the original menu had one)
//   menu_order  explicit sort position within the region, spaced by 10 so
//               new trips can be inserted between neighbors by year
//   index_title / index_desc / index_order   trip-index entry (only trips
//               listed on the original hand-curated index page)
//   index_group written ONLY where the index groups a trip differently than
//               the menu does (e.g. Baja: menu=westCoast, index=international)
//   map_image   overview map path (only where one exists)
//   author      only the three non-Lolo trips
//
// Asserts BEFORE writing: every href resolves to exactly one trip, no trip
// in two regions, and the fields re-derive the hardcoded arrays EXACTLY
// (deepStrictEqual) via the same rules tripMeta.js will use at runtime.
//
// Usage:  node scripts/backfill-trip-meta.mjs [--write]
//         (dry run by default; --write saves trips.json via adminStore)

import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

process.env.EXPORTED_CONTENT_DATA_DIR ||= path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'exported_content', 'data'
);

const { menuTrips } = await import('../src/data/menuTrips.js');
const { tripIndex } = await import('../src/data/tripIndex.js');
const { TRIP_MAP_BY_SLUG, TRIP_AUTHOR_BY_SLUG } = await import('../src/data/tripMaps.js');
const { readDataset, writeDataset } = await import('../src/lib/adminStore.js');

const WRITE = process.argv.includes('--write');
const trips = readDataset('trips');
const bySlug = new Map(trips.map((t) => [t.slug, t]));
const problems = [];

function resolve(href, source) {
  const slug = href.replace(/^\//, '');
  const trip = bySlug.get(slug);
  if (!trip) problems.push(`${source}: href ${href} resolves to NO trip`);
  return trip;
}

// ---- Plan the field assignments in memory ----------------------------------
const planned = new Map(); // nid -> fields object

function fieldsFor(trip) {
  if (!planned.has(trip.nid)) planned.set(trip.nid, {});
  return planned.get(trip.nid);
}

// Menus: region + label + hover + explicit order (spaced by 10)
const regionOf = new Map();
for (const [region, items] of Object.entries(menuTrips)) {
  items.forEach((item, i) => {
    const trip = resolve(item.href, `menu.${region}`);
    if (!trip) return;
    if (regionOf.has(trip.slug)) {
      problems.push(`menu: ${trip.slug} appears in both ${regionOf.get(trip.slug)} and ${region}`);
      return;
    }
    regionOf.set(trip.slug, region);
    const f = fieldsFor(trip);
    f.region = region;
    f.menu_label = item.title;
    if (item.hover) f.menu_hover = item.hover;
    f.menu_order = i * 10;
  });
}

// Trips reachable only outside the menu would vanish from nav — surface them.
for (const t of trips) {
  if (!regionOf.has(t.slug)) problems.push(`trip not in any menu region: ${t.slug} ("${t.title}")`);
}

// Trip index: title/desc + explicit order; group override only when it
// differs from the menu region.
for (const [group, items] of Object.entries(tripIndex)) {
  items.forEach((item, i) => {
    const trip = resolve(item.href, `index.${group}`);
    if (!trip) return;
    const f = fieldsFor(trip);
    if (f.index_order !== undefined) {
      problems.push(`index: ${trip.slug} listed twice`);
      return;
    }
    f.index_title = item.title;
    f.index_desc = item.desc;
    f.index_order = i * 10;
    if (regionOf.get(trip.slug) !== group) f.index_group = group;
  });
}

// Maps + authors
for (const [slug, mapPath] of Object.entries(TRIP_MAP_BY_SLUG)) {
  const trip = bySlug.get(slug);
  if (!trip) { problems.push(`tripMaps: slug ${slug} resolves to NO trip`); continue; }
  if (mapPath) fieldsFor(trip).map_image = mapPath;
}
for (const [slug, author] of Object.entries(TRIP_AUTHOR_BY_SLUG)) {
  const trip = bySlug.get(slug);
  if (!trip) { problems.push(`tripAuthors: slug ${slug} resolves to NO trip`); continue; }
  fieldsFor(trip).author = author;
}

// ---- Re-derive with the runtime rules and prove exact equality -------------
const staged = trips.map((t) => ({ ...t, ...(planned.get(t.nid) || {}) }));

function deriveMenus(list) {
  const groups = { crossCountry: [], eastCoast: [], westCoast: [], international: [] };
  for (const t of list) {
    if (t.region === undefined || t.menu_order === undefined) continue;
    groups[t.region].push(t);
  }
  for (const region of Object.keys(groups)) {
    groups[region] = groups[region]
      .sort((a, b) => a.menu_order - b.menu_order)
      .map((t) => {
        const item = { title: t.menu_label, href: `/${t.slug}` };
        if (t.menu_hover) item.hover = t.menu_hover;
        return item;
      });
  }
  return groups;
}

function deriveIndex(list) {
  const groups = { crossCountry: [], eastCoast: [], westCoast: [], international: [] };
  for (const t of list) {
    if (t.index_order === undefined) continue;
    groups[t.index_group || t.region].push(t);
  }
  for (const g of Object.keys(groups)) {
    groups[g] = groups[g]
      .sort((a, b) => a.index_order - b.index_order)
      .map((t) => ({ href: `/${t.slug}`, title: t.index_title, desc: t.index_desc }));
  }
  return groups;
}

try {
  assert.deepStrictEqual(deriveMenus(staged), menuTrips, 'derived menus != hardcoded menuTrips');
} catch (e) {
  problems.push(e.message.split('\n')[0] + ' (see full diff by running with NODE_OPTIONS=--stack-trace-limit=0)');
}
try {
  assert.deepStrictEqual(deriveIndex(staged), tripIndex, 'derived index != hardcoded tripIndex');
} catch (e) {
  problems.push(e.message.split('\n')[0]);
}

// ---- Report ----------------------------------------------------------------
const menuCount = [...planned.values()].filter((f) => f.menu_order !== undefined).length;
const indexCount = [...planned.values()].filter((f) => f.index_order !== undefined).length;
const overrides = staged.filter((t) => t.index_group).map((t) => `${t.slug} (menu=${t.region}, index=${t.index_group})`);
const menuOnly = staged.filter((t) => t.menu_order !== undefined && t.index_order === undefined).map((t) => t.slug);
const mapCount = [...planned.values()].filter((f) => f.map_image).length;

console.log(`trips.json records:        ${trips.length}`);
console.log(`menu entries planned:      ${menuCount}`);
console.log(`index entries planned:     ${indexCount}`);
console.log(`index group overrides:     ${overrides.length ? overrides.join(', ') : 'none'}`);
console.log(`in menu but not index:     ${menuOnly.length ? menuOnly.join(', ') : 'none'}`);
console.log(`map_image values:          ${mapCount}`);
console.log(`author overrides:          ${Object.keys(TRIP_AUTHOR_BY_SLUG).length}`);

const hardProblems = problems.filter((p) => !p.startsWith('trip not in any menu region'));
const orphanReports = problems.filter((p) => p.startsWith('trip not in any menu region'));
if (orphanReports.length) {
  console.log(`\nORPHAN TRIPS (reachable but unlisted — needs a region decision):`);
  for (const p of orphanReports) console.log('  ' + p);
}
if (hardProblems.length) {
  console.error(`\nFAILED — ${hardProblems.length} problem(s):`);
  for (const p of hardProblems) console.error('  ' + p);
  process.exit(1);
}

console.log('\nAll assertions passed: derived menus and index are EXACTLY the hardcoded arrays.');

if (WRITE) {
  writeDataset('trips', staged);
  console.log('trips.json written. Inspect with: git -C <DATA_DIR> diff --stat');
} else {
  console.log('(dry run — pass --write to save)');
}
