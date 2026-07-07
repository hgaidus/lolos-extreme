const fs = require('fs');
const { cleanDrupalContent } = require('../src/utils/cleanContent.js');
const stops = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/stops.json', 'utf8'));
const photoTitles = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/photo_titles.json', 'utf8'));

let s = stops.find(x => x.slug.includes('our-burning-man'));
const html = cleanDrupalContent(s.travelogue, photoTitles);
const matches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
console.log('Images in cleanHtml:', matches.length);
matches.slice(0, 5).forEach((m, i) => console.log(i + ':', m[1]));
