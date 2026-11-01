// Builds src/lib/legacyAliases.json from an export of the old Drupal site's
// url_alias table: one "node/123<TAB>photos/some-title" line per row, read from
// old.cross-country-trips.com before that database goes away.
//
//   node scripts/build-legacy-aliases-2026-10.mjs <alias.tsv>
//
// Only one-segment photos/ and activities/ aliases are kept; those are the old
// pages Search Console reports as 404s. Keys are lower-cased to match lookups.
import fs from 'fs';

const [, , input] = process.argv;
if (!input) throw new Error('usage: build-legacy-aliases-2026-10.mjs <alias.tsv>');

const out = { photos: {}, activities: {} };
for (const line of fs.readFileSync(input, 'utf8').split('\n')) {
  const [src, dst] = line.split('\t');
  const nid = /^node\/(\d+)$/.exec(src || '')?.[1];
  const m = /^(photos|activities)\/([^/]+)$/.exec(dst || '');
  if (nid && m) out[m[1]][m[2].toLowerCase()] = nid;
}

fs.writeFileSync('src/lib/legacyAliases.json', JSON.stringify(out));
console.log(`photos ${Object.keys(out.photos).length}, activities ${Object.keys(out.activities).length}`);
