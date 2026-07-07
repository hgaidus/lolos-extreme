const fs = require('fs');
const path = require('path');
const { cleanDrupalContent } = require('../src/utils/cleanContent.js');

const stops = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/stops.json', 'utf8'));
const photos = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/photo_titles.json', 'utf8'));
const s = stops.find(x => x.slug === 'our-burning-man-experience');
const stopPhotos = photos.filter(p => String(p.trip_stop_nid) === String(s.nid));
const htmlContent = cleanDrupalContent(s.travelogue, photos);

// Function to normalize URL or filename for comparison
function getNormalizeKey(url) {
  if (!url) return '';
  return url.split('?')[0]
    .replace(/^https?:\/\/[^\/]+/i, '')
    .replace(/^\/?photos\//i, '')
    .replace(/^sites\/default\/files\/(?:images\/)?/i, '')
    .replace(/\.(preview|thumbnail|mini)\./i, '.')
    .replace(/\s*\(\d+\)/g, '')
    .replace(/~\d+/g, '')
    .replace(/_exported_\d+([~_]\d+)*/g, '')
    .toLowerCase();
}

// Build story-first slide sequence
const list = [];
const seenKeys = new Set();

// 1. First extract all img tags from HTML in exact story order
const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
let match;
while ((match = imgRegex.exec(htmlContent)) !== null) {
  const fullTag = match[0];
  const src = match[1];
  const altMatch = fullTag.match(/alt=["']([^"']*)["']/i);
  const titleMatch = fullTag.match(/title=["']([^"']*)["']/i);
  const label = (altMatch && altMatch[1]) || (titleMatch && titleMatch[1]) || "";
  
  const key = getNormalizeKey(src);
  if (!seenKeys.has(key) && src) {
    seenKeys.add(key);
    // Try to find matching photo in stopPhotos to inherit rich metadata
    const matchedPhoto = stopPhotos.find(p => getNormalizeKey(p.filename) === key);
    list.push({
      url: src,
      title: matchedPhoto ? (matchedPhoto.title || label) : label,
      caption: matchedPhoto ? matchedPhoto.caption : "",
      nid: matchedPhoto ? matchedPhoto.image_nid : null,
      source: 'inline_story'
    });
  }
}

// 2. Second, append any remaining archive photos that were NOT embedded in the story
for (const p of stopPhotos) {
  const key = getNormalizeKey(p.filename);
  if (!seenKeys.has(key) && p.filename) {
    seenKeys.add(key);
    list.push({
      url: p.filename.startsWith('/') || p.filename.startsWith('http') ? p.filename : `/photos/${p.filename}`,
      title: p.title || p.filename,
      caption: p.caption || "",
      nid: p.image_nid,
      source: 'archive_only'
    });
  }
}

console.log('Total combined slides:', list.length);
console.log('\n--- First 5 Slides in New Story-First Sequence ---');
list.slice(0, 5).forEach((item, idx) => {
  console.log(`[Slide ${idx + 1}] (${item.source}) url: ${item.url} | title: "${item.title}"`);
});

console.log('\n--- Where is Slide 3 ("The next morning...")? ---');
const slide3Idx = list.findIndex(x => x.title && x.title.includes('The next morning'));
console.log(`Index: ${slide3Idx} (Slide ${slide3Idx + 1} of ${list.length})`);
