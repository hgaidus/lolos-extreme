const fs = require('fs');
const { cleanDrupalContent } = require('../src/utils/cleanContent.js');
const stops = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/stops.json', 'utf8'));
const photos = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/photo_titles.json', 'utf8'));
const s = stops.find(x => x.slug === 'our-burning-man-experience');
const stopPhotos = photos.filter(p => String(p.trip_stop_nid) === String(s.nid));
const htmlContent = cleanDrupalContent(s.travelogue, photos);
const imgTags = htmlContent.match(/<img[^>]+>/gi) || [];

console.log('Archive photos count:', stopPhotos.length);
console.log('Inline img tags count:', imgTags.length);

console.log('\n--- First 5 Archive Photos (photos array) ---');
stopPhotos.slice(0, 5).forEach((p, i) => {
  console.log(`[${i}] ${p.filename} | title: "${p.title}"`);
});

console.log('\n--- First 5 Inline Story Photos (in travelogue HTML) ---');
imgTags.slice(0, 5).forEach((t, i) => {
  const srcMatch = t.match(/src=["']([^"']+)["']/i);
  const altMatch = t.match(/alt=["']([^"']*)["']/i);
  console.log(`[${i}] ${srcMatch ? srcMatch[1] : 'no-src'} | alt: "${altMatch ? altMatch[1] : 'no-alt'}"`);
});
