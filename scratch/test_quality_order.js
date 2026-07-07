const fs = require('fs');
const path = require('path');
const { cleanDrupalContent } = require('../src/utils/cleanContent.js');

const stops = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/stops.json', 'utf8'));
const photos = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/photo_titles.json', 'utf8'));
const s = stops.find(x => x.slug === 'our-burning-man-experience');

const htmlContent = cleanDrupalContent(s.travelogue, photos);
const tags = htmlContent.match(/<img[^>]+>/gi) || [];

const baseDir = 'y:/Lolos_Migration_Data/files/images';

let miniServedCount = 0;
let thumbnailServedCount = 0;
let previewServedCount = 0;
let originalServedCount = 0;
let notFoundCount = 0;

tags.forEach((t, i) => {
  const mSrc = t.match(/src="([^"]+)"/i) || t.match(/src='([^']+)'/i);
  if (!mSrc) return;
  const src = mSrc[1];
  const relPath = src.replace(/^\/photos\//, '');
  const parts = relPath.split('/');
  const filename = parts.pop();
  const dirPath = path.join(baseDir, ...parts);

  const ext = path.extname(filename);
  const stem = filename.slice(0, -ext.length).replace(/\.(preview|mini|thumbnail)$/, '');
  
  // Normalizations for stems: strip copy suffixes like (1), ~2, _0, _exported_1234, .RAW-01, .COVER_
  const stems = Array.from(new Set([
    stem,
    stem.replace(/\s*\(\d+\)$/, ''),
    stem.replace(/~\d+$/, ''),
    stem.replace(/_exported_\d+([~_]\d+)*$/, ''),
    stem.replace(/\.(RAW-01|COVER|NIGHT_|_)+/g, ''),
    stem.replace(/(_exported_\d+|~\d+|\s*\(\d+\)|\.(RAW-01|COVER|NIGHT_|_)+)/g, '')
  ])).filter(Boolean);

  const candidates = [];
  // First exact filename
  candidates.push(filename);

  // For each stem, add high quality to low quality variations
  for (const st of stems) {
    candidates.push(`${st}${ext}`, `${st}.jpg`, `${st}.jpeg`, `${st}.png`, `${st}.JPG`, `${st}.JPEG`);
    candidates.push(`${st}.preview${ext}`, `${st}.preview.jpg`, `${st}.preview.jpeg`, `${st}.preview.png`);
    candidates.push(`${st}.thumbnail${ext}`, `${st}.thumbnail.jpg`, `${st}.thumbnail.jpeg`, `${st}.thumbnail.png`);
  }
  // Only add minis at the very end as last resort
  for (const st of stems) {
    candidates.push(`${st}.mini${ext}`, `${st}.mini.jpg`, `${st}.mini.jpeg`, `${st}.mini.png`);
  }

  const uniqueCandidates = Array.from(new Set(candidates));

  let served = 'NOT FOUND';
  let servedSize = 0;
  for (const c of uniqueCandidates) {
    const fullP = path.join(dirPath, c);
    if (fs.existsSync(fullP)) {
      served = c;
      servedSize = fs.statSync(fullP).size;
      if (c.includes('.mini.')) miniServedCount++;
      else if (c.includes('.thumbnail.')) thumbnailServedCount++;
      else if (c.includes('.preview.')) previewServedCount++;
      else originalServedCount++;
      break;
    }
  }

  if (served === 'NOT FOUND') notFoundCount++;

  if (i < 15 || served.includes('.mini.') || served === 'NOT FOUND' || filename !== served) {
    console.log(`[${i}] Req: ${filename} -> Served: ${served} (${servedSize} bytes)`);
  }
});

console.log('\n--- NEW SUMMARY WITH NORMALIZATION ---');
console.log({
  total: tags.length,
  originalServedCount,
  previewServedCount,
  thumbnailServedCount,
  miniServedCount,
  notFoundCount
});
