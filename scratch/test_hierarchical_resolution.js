const fs = require('fs');
const path = require('path');

const stops = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/stops.json', 'utf8'));
const photos = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/photo_titles.json', 'utf8'));
const s = stops.find(x => x.slug === 'our-burning-man-experience');
const stopPhotos = photos.filter(p => String(p.trip_stop_nid) === String(s.nid));

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

function resolveImageHierarchical(filename) {
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

  // TIER 1: High-Resolution Exact & Modified Candidates (Originals & Previews ONLY)
  const highResCandidates = [];
  if (!filename.includes('.mini.') && !filename.includes('.thumbnail.')) {
    highResCandidates.push(filename);
  }
  for (const st of stems) {
    highResCandidates.push(`${st}${ext}`, `${st}.jpg`, `${st}.jpeg`, `${st}.png`, `${st}.JPG`, `${st}.JPEG`);
    highResCandidates.push(`${st}.preview${ext}`, `${st}.preview.jpg`, `${st}.preview.jpeg`, `${st}.preview.png`);
  }
  const uniqueHighRes = Array.from(new Set(highResCandidates));

  for (const fName of uniqueHighRes) {
    for (const dir of baseDirs) {
      const candidate = path.join(dir, fName);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { path: candidate, served: fName, size: fs.statSync(candidate).size, tier: '1_HighResExact' };
      }
    }
  }

  // TIER 2: High-Resolution Fuzzy Matching (Ignore .mini and .thumbnail files!)
  for (const st of stems) {
    const baseStem = path.basename(st);
    if (!baseStem || baseStem.length < 3) continue;
    for (const dir of baseDirs) {
      try {
        const files = fs.readdirSync(dir);
        const matches = files.filter(f => {
          if (f.includes('.mini.') || f.includes('.thumbnail.')) return false;
          const lowerF = f.toLowerCase();
          const lowerStem = baseStem.toLowerCase();
          return (lowerF.startsWith(lowerStem + ".") || lowerF.startsWith(lowerStem + "_") || lowerF.startsWith(lowerStem + "~") || lowerF.startsWith(lowerStem + " ") || (baseStem.length > 6 && lowerF.includes(lowerStem))) &&
                 (lowerF.endsWith('.jpg') || lowerF.endsWith('.jpeg') || lowerF.endsWith('.png') || lowerF.endsWith('.gif') || lowerF.endsWith('.webp'));
        });
        if (matches.length > 0) {
          matches.sort((a, b) => {
            try {
              return fs.statSync(path.join(dir, b)).size - fs.statSync(path.join(dir, a)).size;
            } catch (e) { return 0; }
          });
          for (const m of matches) {
            const candidate = path.join(dir, m);
            if (fs.statSync(candidate).isFile()) {
              return { path: candidate, served: m, size: fs.statSync(candidate).size, tier: '2_HighResFuzzy' };
            }
          }
        }
      } catch (e) {}
    }
  }

  // TIER 3: Thumbnails (Exact & Fuzzy)
  const thumbCandidates = [];
  for (const st of stems) {
    thumbCandidates.push(`${st}.thumbnail${ext}`, `${st}.thumbnail.jpg`, `${st}.thumbnail.jpeg`, `${st}.thumbnail.png`);
  }
  for (const fName of thumbCandidates) {
    for (const dir of baseDirs) {
      const candidate = path.join(dir, fName);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { path: candidate, served: fName, size: fs.statSync(candidate).size, tier: '3_ThumbExact' };
      }
    }
  }
  for (const st of stems) {
    const baseStem = path.basename(st);
    if (!baseStem || baseStem.length < 3) continue;
    for (const dir of baseDirs) {
      try {
        const files = fs.readdirSync(dir);
        const matches = files.filter(f => f.includes('.thumbnail.') && f.toLowerCase().includes(baseStem.toLowerCase()));
        if (matches.length > 0) {
          matches.sort((a, b) => fs.statSync(path.join(dir, b)).size - fs.statSync(path.join(dir, a)).size);
          return { path: path.join(dir, matches[0]), served: matches[0], size: fs.statSync(path.join(dir, matches[0])).size, tier: '4_ThumbFuzzy' };
        }
      } catch (e) {}
    }
  }

  // TIER 4: Minis (Exact & Fuzzy) as absolute last resort
  const miniCandidates = [];
  for (const st of stems) {
    miniCandidates.push(`${st}.mini${ext}`, `${st}.mini.jpg`, `${st}.mini.jpeg`, `${st}.mini.png`);
  }
  for (const fName of miniCandidates) {
    for (const dir of baseDirs) {
      const candidate = path.join(dir, fName);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { path: candidate, served: fName, size: fs.statSync(candidate).size, tier: '5_MiniExact' };
      }
    }
  }

  return null;
}

let tierCounts = {};
stopPhotos.forEach((p, idx) => {
  const res = resolveImageHierarchical(p.filename);
  if (!res) {
    tierCounts['NOT_FOUND'] = (tierCounts['NOT_FOUND'] || 0) + 1;
    console.log(`[${idx}] Req: ${p.filename} -> NOT FOUND`);
  } else {
    tierCounts[res.tier] = (tierCounts[res.tier] || 0) + 1;
    if (res.tier.includes('Thumb') || res.tier.includes('Mini') || idx === 2) {
      console.log(`[${idx}] Req: ${path.basename(p.filename)} -> Served (${res.tier}): ${res.served} (${res.size} bytes)`);
    }
  }
});

console.log('\n--- BURNING MAN SLIDES HIERARCHICAL RESOLUTION ---');
console.log(tierCounts);
