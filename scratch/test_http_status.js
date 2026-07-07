const fs = require('fs');
const { cleanDrupalContent } = require('../src/utils/cleanContent.js');

const stops = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/stops.json', 'utf8'));
const photos = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/photo_titles.json', 'utf8'));
const s = stops.find(x => x.slug === 'our-burning-man-experience');

const htmlContent = cleanDrupalContent(s.travelogue, photos);
const tags = htmlContent.match(/<img[^>]+>/gi) || [];
const srcs = tags.map(t => {
  const m = t.match(/src="([^"]+)"/i) || t.match(/src='([^']+)'/i);
  return m ? m[1] : null;
}).filter(Boolean);

Promise.all(srcs.map(src => 
  fetch('http://localhost:3000' + src)
    .then(r => ({ src, status: r.status }))
    .catch(e => ({ src, status: 'ERROR' }))
)).then(results => {
  const counts = {};
  results.forEach(r => counts[r.status] = (counts[r.status] || 0) + 1);
  console.log('HTTP Status counts:', counts);
  results.filter(r => r.status !== 200).forEach(r => console.log('Non-200:', r.status, r.src));
});
