const fs = require('fs');
const path = require('path');

const stops = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/stops.json', 'utf8'));
const photos = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/photo_titles.json', 'utf8'));

const s = stops.find(x => x.slug === 'so-what-burning-man');
const nids = (s.travelogue.match(/nid=(\d+)/gi) || []).map(x => x.split('=')[1]);

console.log(`Checking ${nids.length} photos on /so-what-burning-man:`);

const baseDirs = [
  path.normalize("y:\\Lolos_Migration_Data\\files\\images"),
  path.normalize("y:\\Lolos_Migration_Data\\files\\images\\1k"),
  path.normalize("y:\\Lolos_Migration_Data\\files\\images\\2k"),
  path.normalize("y:\\Lolos_Migration_Data\\files\\images\\3k"),
  path.normalize("y:\\Lolos_Migration_Data\\files\\images\\4k"),
  path.normalize("y:\\Lolos_Migration_Data\\files\\images\\5k"),
  path.normalize("y:\\Lolos_Migration_Data\\files\\images\\6k"),
  path.normalize("y:\\Lolos_Migration_Data\\files\\images\\7k"),
  path.normalize("y:\\Lolos_Migration_Data\\files\\images\\8k"),
  path.normalize("y:\\Lolos_Migration_Data\\files\\images-old"),
  path.normalize("y:\\Lolos_Migration_Data\\files")
];

function testRouteLogic(filename) {
  let cleanFilename = filename.replace(/^sites\/default\/files\/(?:images\/)?/i, '');
  const candidateFilenames = [cleanFilename];
  
  if (cleanFilename.includes('.preview.') || cleanFilename.includes('.thumbnail.') || cleanFilename.includes('.mini.')) {
    candidateFilenames.push(cleanFilename.replace(/\.(preview|thumbnail|mini)\./i, '.'));
  } else {
    const ext = path.extname(cleanFilename);
    const base = cleanFilename.slice(0, -ext.length);
    candidateFilenames.push(`${base}.preview${ext}`);
  }

  // What if we also try all other variations (.preview, .thumbnail, .mini, or original)?
  // Let's see what the current route does:
  let foundPath = null;
  for (const fName of candidateFilenames) {
    for (const dir of baseDirs) {
      const cand = path.join(dir, fName);
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        foundPath = cand;
        break;
      }
    }
    if (foundPath) break;
  }

  if (!foundPath) {
    // Current fallback: search by basename
    for (const fName of candidateFilenames) {
      const baseName = path.basename(fName);
      for (const dir of baseDirs) {
        const cand = path.join(dir, baseName);
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          foundPath = cand;
          break;
        }
      }
      if (foundPath) break;
    }
  }
  return foundPath;
}

nids.forEach(nid => {
  const p = photos.find(x => String(x.image_nid) === nid || String(x.image_vid) === nid);
  if (!p) {
    console.log(`[MISSING RECORD] NID ${nid}`);
    return;
  }
  const found = testRouteLogic(p.filename);
  console.log(`NID ${nid} | ${p.title} | ${p.filename} | Route finds: ${found ? 'YES (' + path.basename(found) + ')' : 'NO'}`);
  
  if (!found) {
    // Let's see why it's missing on disk! Let's search Y:/Lolos_Migration_Data/files/images for any file matching the base name without extensions
    const ext = path.extname(p.filename);
    const baseWithoutExts = path.basename(p.filename).split('.')[0];
    console.log(`   Searching disk for anything containing "${baseWithoutExts}":`);
    baseDirs.forEach(dir => {
      try {
        fs.readdirSync(dir).forEach(f => {
          if (f.includes(baseWithoutExts)) {
            console.log(`     -> Found candidate in ${dir}: ${f}`);
          }
        });
      } catch (e) {}
    });
  }
});
