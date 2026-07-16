// Companion to snapshot-pages.sh: compares two snapshot dirs in two tiers.
//
//   node scripts/compare-snapshots.mjs <before-dir> <after-dir>
//
// Tier 1 — raw bytes. The strict gate; any diff is listed.
// Tier 2 — rendered DOM (script bodies stripped). React serializes a
//   placeholder (`false`/`null`) into the RSC flight payload for every
//   conditional JSX child, so adding e.g. an admin-only banner changes raw
//   bytes without changing what any visitor sees. A raw diff that vanishes in
//   tier 2 is "flight-only" and acceptable WHEN UNDERSTOOD; a tier-2 diff is
//   a real regression, full stop.
//
// Exit code: 0 if no DOM differences, 1 otherwise.

import fs from 'fs';

const [, , dirA, dirB] = process.argv;
if (!dirA || !dirB) {
  console.error('usage: node scripts/compare-snapshots.mjs <before-dir> <after-dir>');
  process.exit(2);
}

const stripFlight = (s) => s.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '<script/>');

let identical = 0;
const flightOnly = [];
const domDiffs = [];

for (const f of fs.readdirSync(dirA).sort()) {
  const a = fs.readFileSync(`${dirA}/${f}`, 'utf8');
  let b;
  try {
    b = fs.readFileSync(`${dirB}/${f}`, 'utf8');
  } catch {
    domDiffs.push(`${f} (missing in after-dir)`);
    continue;
  }
  if (a === b) { identical++; continue; }
  if (stripFlight(a) === stripFlight(b)) { flightOnly.push(f); continue; }
  domDiffs.push(f);
}

console.log(`byte-identical:        ${identical}`);
console.log(`flight-payload-only:   ${flightOnly.length}${flightOnly.length ? '   (DOM identical — explain before accepting)' : ''}`);
flightOnly.forEach((f) => console.log(`    ~ ${f}`));
console.log(`REAL DOM differences:  ${domDiffs.length}`);
domDiffs.forEach((f) => console.log(`    ✗ ${f}`));

process.exit(domDiffs.length ? 1 : 0);
