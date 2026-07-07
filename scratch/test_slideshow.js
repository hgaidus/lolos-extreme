const fs = require('fs');
const { cleanDrupalContent } = require('../src/utils/cleanContent.js');
const stops = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/stops.json', 'utf8'));
const photoTitles = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/photo_titles.json', 'utf8'));

let s = stops.find(x => x.slug.includes('our-burning-man'));
const photos = photoTitles
  .filter(p => String(p.trip_stop_nid) === String(s.nid))
  .map(p => ({ url: '/photos/' + p.filename, ...p }));

const getNormalizeKey = (u) => {
  if (!u) return '';
  return u.split('?')[0]
    .replace(/^https?:\/\/[^\/]+/i, '')
    .replace(/^\/?photos\//i, '')
    .replace(/^sites\/default\/files\/(?:images\/)?/i, '')
    .replace(/\.(preview|thumbnail|mini)\./i, '.')
    .replace(/\s*\(\d+\)/g, '')
    .replace(/~\d+/g, '')
    .replace(/_exported_\d+([~_]\d+)*/g, '')
    .toLowerCase();
};

const htmlContent = cleanDrupalContent(s.travelogue, photoTitles);

const seenKeys = new Set();
const list = [];
const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
let match;
while ((match = imgRegex.exec(htmlContent)) !== null) {
  const fullTag = match[0];
  const src = match[1];
  const mAlt = fullTag.match(/alt=["']([^"']*)["']/i);
  const mTitle = fullTag.match(/title=["']([^"']*)["']/i);
  const label = (mAlt && mAlt[1]) || (mTitle && mTitle[1]) || "";

  const key = getNormalizeKey(src);
  if (!seenKeys.has(key) && src) {
    seenKeys.add(key);
    const matchedPhoto = photos.find(p => getNormalizeKey(p.url || p.filename || "") === key);
    list.push({
      url: matchedPhoto ? matchedPhoto.url : src,
      title: matchedPhoto ? (matchedPhoto.title || label) : label,
      caption: matchedPhoto ? (matchedPhoto.caption || "") : "",
      nid: matchedPhoto ? (matchedPhoto.nid || matchedPhoto.image_nid) : null,
      ...matchedPhoto
    });
  }
}

console.log('Story slides count:', list.length);
console.log('First 5 slides in allSlides:');
list.slice(0, 5).forEach((sl, i) => {
  console.log(`[${i}] url: ${sl.url}, title: ${sl.title}`);
});

// Test clicking the first 5 images in HTML
const htmlMatches = [...htmlContent.matchAll(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi)];
console.log('\n--- Clicking first 5 images in HTML ---');
htmlMatches.slice(0, 5).forEach((m, i) => {
  const src = m[1];
  const cleanSrc = getNormalizeKey(src);
  const idx = list.findIndex(p => {
    const cleanP = getNormalizeKey(p.url);
    return cleanP === cleanSrc && cleanP.length > 0;
  });
  console.log(`HTML img [${i}] src: ${src} -> Matched allSlides idx: ${idx}`);
});
