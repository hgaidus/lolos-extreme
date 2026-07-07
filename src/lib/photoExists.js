import fs from 'fs';
import path from 'path';
import { FILES_DIR } from './dataPaths';

let cachedFileIndex = null;

function buildFileIndex() {
  if (cachedFileIndex) return cachedFileIndex;
  const baseDirs = [
    path.join(FILES_DIR, 'images'),
    path.join(FILES_DIR, 'images', '1k'),
    path.join(FILES_DIR, 'images', '2k'),
    path.join(FILES_DIR, 'images', '3k'),
    path.join(FILES_DIR, 'images', '4k'),
    path.join(FILES_DIR, 'images', '5k'),
    path.join(FILES_DIR, 'images', '6k'),
    path.join(FILES_DIR, 'images', '7k'),
    path.join(FILES_DIR, 'images', '8k'),
    path.join(FILES_DIR, 'images-old'),
    FILES_DIR,
  ];
  cachedFileIndex = new Set();
  for (const dir of baseDirs) {
    try {
      for (const f of fs.readdirSync(dir)) cachedFileIndex.add(f.toLowerCase());
    } catch {
      // directory may not exist in every environment; skip it
    }
  }
  return cachedFileIndex;
}

// Mirrors the tiered exact/fuzzy lookup the /photos/[...path] route uses,
// so we can tell upfront whether a referenced photo will actually resolve
// to a real file instead of finding out via a 404 <img> in the browser.
export function photoFileExists(filename) {
  if (!filename) return false;
  const files = buildFileIndex();
  const clean = filename.replace(/^sites\/default\/files\/(?:images\/)?/i, '').toLowerCase();
  const base = path.basename(clean);
  if (files.has(base)) return true;

  const noMod = clean.replace(/\.(preview|thumbnail|mini)\./, '.');
  const ext = path.extname(noMod);
  const stem = path.basename(ext ? noMod.slice(0, -ext.length) : noMod);
  if (!stem || stem.length < 3) return false;

  for (const f of files) {
    if (
      f.startsWith(stem + '.') ||
      f.startsWith(stem + '_') ||
      f.startsWith(stem + '~') ||
      f.startsWith(stem + ' ') ||
      (stem.length > 6 && f.includes(stem))
    ) {
      return true;
    }
  }
  return false;
}
