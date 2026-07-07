const fs = require('fs');
const path = require('path');
const { cleanDrupalContent } = require('../src/utils/cleanContent.js');

const stops = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/stops.json', 'utf8'));
const allPhotos = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/photo_titles.json', 'utf8'));

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

function resolveImage(filename) {
  filename = filename.replace(/^sites\/default\/files\/(?:images\/)?/i, '');
  const cleanNoMod = filename.replace(/\.(preview|thumbnail|mini)\./i, '.');
  const ext = path.extname(cleanNoMod);
  const stem = cleanNoMod.slice(0, -ext.length);

  const stems = Array.from(new Set([
    stem,
    stem.replace(/\s*\(\d+\)$/, ''),
    stem.replace(/~\d+$/, ''),
    stem.replace(/_exported_\d+([~_]\d+)*$/, ''),
    stem.replace(/\.(RAW-01|COVER|NIGHT_|_)+/g, ''),
    stem.replace(/(_exported_\d+|~\d+|\s*\(\d+\)|\.(RAW-01|COVER|NIGHT_|_)+)/g, '')
  ])).filter(Boolean);

  const candidates = [];
  candidates.push(filename);
  for (const st of stems) {
    candidates.push(`${st}${ext}`, `${st}.jpg`, `${st}.jpeg`, `${st}.png`, `${st}.JPG`, `${st}.JPEG`);
    candidates.push(`${st}.preview${ext}`, `${st}.preview.jpg`, `${st}.preview.jpeg`, `${st}.preview.png`);
    candidates.push(`${st}.thumbnail${ext}`, `${st}.thumbnail.jpg`, `${st}.thumbnail.jpeg`, `${st}.thumbnail.png`);
  }
  for (const st of stems) {
    candidates.push(`${st}.mini${ext}`, `${st}.mini.jpg`, `${st}.mini.jpeg`, `${st}.mini.png`);
  }
  const candidateFilenames = Array.from(new Set(candidates));

  for (const fName of candidateFilenames) {
    for (const dir of baseDirs) {
      const candidate = path.join(dir, fName);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { path: candidate, served: fName, size: fs.statSync(candidate).size };
      }
    }
  }

  for (const fName of candidateFilenames) {
    const baseName = path.basename(fName);
    for (const dir of baseDirs) {
      const candidate = path.join(dir, baseName);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { path: candidate, served: fName, size: fs.statSync(candidate).size };
      }
    }
  }

  for (const st of stems) {
    const baseStem = path.basename(st);
    if (!baseStem || baseStem.length < 3) continue;
    for (const dir of baseDirs) {
      try {
        const files = fs.readdirSync(dir);
        const matches = files.filter(f => {
          const lowerF = f.toLowerCase();
          const lowerStem = baseStem.toLowerCase();
          return (lowerF.startsWith(lowerStem + ".") || lowerF.startsWith(lowerStem + "_") || lowerF.startsWith(lowerStem + "~") || lowerF.startsWith(lowerStem + " ") || (baseStem.length > 6 && lowerF.includes(lowerStem))) &&
                 (lowerF.endsWith('.jpg') || lowerF.endsWith('.jpeg') || lowerF.endsWith('.png') || lowerF.endsWith('.gif') || lowerF.endsWith('.webp'));
        });
        if (matches.length > 0) {
          matches.sort((a, b) => {
            const aMini = a.includes('.mini.') ? 1 : 0;
            const bMini = b.includes('.mini.') ? 1 : 0;
            if (aMini !== bMini) return aMini - bMini;
            try {
              const statA = fs.statSync(path.join(dir, a)).size;
              const statB = fs.statSync(path.join(dir, b)).size;
              return statB - statA;
            } catch (e) { return 0; }
          });
          for (const m of matches) {
            const candidate = path.join(dir, m);
            if (fs.statSync(candidate).isFile()) {
              return { path: candidate, served: m, size: fs.statSync(candidate).size };
            }
          }
        }
      } catch (e) {}
    }
  }

  return null;
}

let totalChecked = 0;
let foundOriginal = 0;
let foundPreview = 0;
let foundThumbnail = 0;
let foundMini = 0;
let notFound = 0;

const miniExamples = [];
const notFoundExamples = [];

stops.forEach(s => {
  if (!s.travelogue) return;
  const htmlContent = cleanDrupalContent(s.travelogue, allPhotos);
  const imgTags = htmlContent.match(/<img[^>]+>/gi) || [];
  imgTags.forEach(tag => {
    const mSrc = tag.match(/src=["']([^"']+)["']/i);
    if (!mSrc || !mSrc[1]) return;
    const src = mSrc[1];
    const relPath = src.replace(/^\/photos\//, '');
    totalChecked++;
    
    const res = resolveImage(relPath);
    if (!res) {
      notFound++;
      if (notFoundExamples.length < 10) notFoundExamples.push({ stop: s.slug, src });
    } else {
      if (res.served.includes('.mini.')) {
        foundMini++;
        if (miniExamples.length < 10) miniExamples.push({ stop: s.slug, src, served: res.served });
      } else if (res.served.includes('.thumbnail.')) {
        foundThumbnail++;
      } else if (res.served.includes('.preview.')) {
        foundPreview++;
      } else {
        foundOriginal++;
      }
    }
  });
});

console.log('--- SITEWIDE IMAGE QUALITY AUDIT ---');
console.log({
  totalChecked,
  foundOriginal,
  foundPreview,
  foundThumbnail,
  foundMini,
  notFound
});
console.log('\nTop Mini Examples (Only mini exists on disk):', miniExamples.slice(0, 5));
console.log('\nTop Not Found Examples:', notFoundExamples.slice(0, 5));
