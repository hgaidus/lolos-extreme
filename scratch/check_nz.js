const fs = require('fs');
const sql = fs.readFileSync('Y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-07-03T00-0.sql', 'utf8');
const stops = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/stops.json', 'utf8'));
const photoTitles = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/photo_titles.json', 'utf8'));

let s = stops.find(x => x.slug.includes('climax-burning-man'));
console.log('=== CLIMAX BURNING MAN STOP ===');
console.log('NID:', s.nid, 'VID:', s.vid, 'Title:', s.title);

const photos = photoTitles.filter(p => String(p.trip_stop_nid) === String(s.nid));
console.log('Associated photos in photo_titles.json:', photos.length);
photos.forEach((p, i) => {
  console.log(`[${i}] nid:${p.image_nid} vid:${p.image_vid} file:${p.filename} title:${p.title}`);
});

const idx = sql.indexOf('CREATE TABLE `content_type_image`');
console.log('\n=== SCHEMA content_type_image ===');
console.log(sql.substring(idx, idx + 400));

// Check what node 11899 and vid 11937 actually are in SQL node table
let mNode = sql.match(/\(\s*'?(11899|11861|11854|11937)'?'?\s*,\s*'?[^']*'?'?\s*,\s*'?[^']*'?'?\s*,\s*'?[^']*'?'?\s*,\s*'?[^']*'?'?/g);
console.log('\n=== NODE table matches ===');
console.log(mNode);
