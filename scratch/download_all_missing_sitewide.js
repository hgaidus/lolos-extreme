const fs = require('fs');
const path = require('path');

const photos = JSON.parse(fs.readFileSync('y:/Lolos_Migration_Data/exported_content/data/photo_titles.json', 'utf8'));

const baseDirs = [
  "y:/Lolos_Migration_Data/files/images",
  "y:/Lolos_Migration_Data/files/images/1k",
  "y:/Lolos_Migration_Data/files/images/2k",
  "y:/Lolos_Migration_Data/files/images/3k",
  "y:/Lolos_Migration_Data/files/images/4k",
  "y:/Lolos_Migration_Data/files/images/5k",
  "y:/Lolos_Migration_Data/files/images/6k",
  "y:/Lolos_Migration_Data/files/images/7k",
  "y:/Lolos_Migration_Data/files/images/8k",
  "y:/Lolos_Migration_Data/files/images-old"
];

function hasHighResOnDisk(filename) {
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

  for (const st of stems) {
    const checkNames = [`${st}${ext}`, `${st}.jpg`, `${st}.jpeg`, `${st}.png`, `${st}.preview${ext}`, `${st}.preview.jpg`];
    for (const fn of checkNames) {
      for (const dir of baseDirs) {
        const full = path.join(dir, fn);
        if (fs.existsSync(full) && fs.statSync(full).size > 30000) {
          return true;
        }
      }
    }
  }
  return false;
}

async function auditAndDownload() {
  console.log(`Auditing all ${photos.length} photos sitewide for high-res versions on disk...`);
  const missingHighRes = [];
  
  for (const p of photos) {
    if (!p.filename) continue;
    if (!hasHighResOnDisk(p.filename)) {
      missingHighRes.push(p);
    }
  }
  
  console.log(`Found ${missingHighRes.length} photos sitewide lacking high-res (>30KB) files on disk.`);
  if (missingHighRes.length === 0) return;

  let downloaded = 0;
  let failed = 0;
  for (const p of missingHighRes) {
    let fn = p.filename.replace(/^sites\/default\/files\/(?:images\/)?/i, '');
    let cleanFn = fn.replace(/\.(thumbnail|mini)\./i, '.preview.');
    if (!cleanFn.includes('.preview.')) {
      const ext = path.extname(cleanFn);
      cleanFn = cleanFn.slice(0, -ext.length) + '.preview' + ext;
    }

    const targetFolder = path.join("y:/Lolos_Migration_Data/files/images", path.dirname(cleanFn));
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    const dest = path.join("y:/Lolos_Migration_Data/files/images", cleanFn);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 30000) continue;

    const url = `https://www.cross-country-trips.com/sites/default/files/images/${cleanFn.split('/').map(encodeURIComponent).join('/')}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 10000) {
          fs.writeFileSync(dest, Buffer.from(buf));
          downloaded++;
          if (downloaded % 10 === 0) console.log(`Downloaded ${downloaded} high-res files... (${cleanFn})`);
        } else {
          failed++;
        }
      } else {
        // try without /images/ prefix on URL
        const url2 = `https://www.cross-country-trips.com/sites/default/files/${cleanFn.split('/').map(encodeURIComponent).join('/')}`;
        const res2 = await fetch(url2);
        if (res2.ok) {
          const buf2 = await res2.arrayBuffer();
          if (buf2.byteLength > 10000) {
            fs.writeFileSync(dest, Buffer.from(buf2));
            downloaded++;
            if (downloaded % 10 === 0) console.log(`Downloaded ${downloaded} high-res files... (${cleanFn})`);
          } else {
            failed++;
          }
        } else {
          failed++;
        }
      }
    } catch (e) {
      failed++;
    }
  }
  console.log(`\nAudit complete! Successfully downloaded ${downloaded} new high-res preview files. (Failed/Not on server: ${failed})`);
}

auditAndDownload();
