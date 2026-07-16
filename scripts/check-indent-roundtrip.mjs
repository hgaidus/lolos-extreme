// Reads every dataset through the adminStore write layer and writes it back
// unchanged, then reports whether any file's bytes moved. A clean run means
// per-file indent detection (1-space vs standalone_pages' 2-space), trailing
// newline handling, and serialization are all faithful — the guard against
// the "no-op save reformats 698 lines" class of bug.
//
// Usage:  node scripts/check-indent-roundtrip.mjs
// Verify: git -C <DATA_DIR> diff --stat   (must be empty afterwards)

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

process.env.EXPORTED_CONTENT_DATA_DIR ||= path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'exported_content', 'data'
);

const { DATASETS, readDataset, writeDataset } = await import('../src/lib/adminStore.js');
const { DATA_DIR } = await import('../src/lib/dataPaths.js');

let failed = 0;
for (const name of Object.keys(DATASETS)) {
  const filePath = path.join(DATA_DIR, DATASETS[name].file);
  const before = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
  writeDataset(name, readDataset(name));
  const after = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
  const ok = before === after;
  if (!ok) failed++;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${DATASETS[name].file}`);
}

if (failed) {
  console.error(`\n${failed} file(s) changed on a no-op round-trip — writeDataset is NOT format-preserving.`);
  process.exit(1);
}
console.log('\nAll datasets round-trip byte-identically.');
