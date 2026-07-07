const fs = require('fs');
const path = require('path');
const { cleanDrupalContent } = require('../src/utils/cleanContent.js');

const stops = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/stops.json', 'utf8'));
const photos = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/photo_titles.json', 'utf8'));
const s = stops.find(x => x.slug === 'our-burning-man-experience');

const htmlContent = cleanDrupalContent(s.travelogue, photos);
const tags = htmlContent.match(/<img[^>]+>/gi) || [];

const baseDir = 'y:/Lolos_Migration_Data/files/images';

console.log(`Total <img tags in our-burning-man-experience: ${tags.length}`);

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

  // Current route.js order:
  const candidates = Array.from(new Set([
    filename,
    `${stem}.preview${ext}`,
    `${stem}${ext}`,
    `${stem}.mini${ext}`,
    `${stem}.thumbnail${ext}`,
    `${stem}.jpg`,
    `${stem}.preview.jpg`,
    `${stem}.mini.jpg`,
    `${stem}.thumbnail.jpg`,
    `${stem}.jpeg`,
    `${stem}.preview.jpeg`,
    `${stem}.mini.jpeg`,
    `${stem}.thumbnail.jpeg`,
    `${stem}.png`,
    `${stem}.preview.png`
  ]));

  let served = 'NOT FOUND';
  let servedSize = 0;
  for (const c of candidates) {
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

  if (i < 15 || served.includes('.mini.') || served === 'NOT FOUND') {
    console.log(`[${i}] Req: ${filename} -> Served: ${served} (${servedSize} bytes)`);
  }
});

console.log('\n--- SUMMARY ---');
console.log({
  total: tags.length,
  originalServedCount,
  previewServedCount,
  thumbnailServedCount,
  miniServedCount,
  notFoundCount
});
