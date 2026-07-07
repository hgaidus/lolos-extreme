const fs = require('fs');
const path = require('path');

const stems = [
  'PXL_20250828_171731560~2',
  'PXL_20250830_035405098',
  'PXL_20250829_014721554.RAW-01.COVER_',
  'PXL_20250827_133514819',
  'PXL_20250827_184903125~2',
  'PXL_20250829_042253741',
  'PXL_20250829_012618452_exported_6567~4',
  'PXL_20250829_181747606~4',
  'PXL_20250829_172840938.RAW-01.COVER~3 (2)',
  'PXL_20250830_190206089.RAW-01.COVER_',
  'PXL_20250830_184050419~2_0',
  'PXL_20250829_035514621~2 (1)',
  'PXL_20250830_191201745.RAW-01.COVER_'
];

const targetDir = 'y:/Lolos_Migration_Data/files/images/8k';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function downloadMissing() {
  console.log(`Starting download of ${stems.length} missing preview files from live site...`);
  let downloaded = 0;
  for (const s of stems) {
    const filename = `${s}.preview.jpg`;
    const dest = path.join(targetDir, filename);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
      console.log(`Already exists: ${filename} (${fs.statSync(dest).size} bytes)`);
      continue;
    }
    
    const url = `https://www.cross-country-trips.com/sites/default/files/images/8k/${encodeURIComponent(filename)}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        fs.writeFileSync(dest, Buffer.from(buf));
        console.log(`[SUCCESS] Downloaded ${filename} (${buf.byteLength} bytes)`);
        downloaded++;
      } else {
        console.log(`[FAILED] ${url} -> HTTP ${res.status}`);
      }
    } catch (e) {
      console.log(`[ERROR] ${filename}: ${e.message}`);
    }
  }
  console.log(`\nFinished downloading ${downloaded} missing high-res preview files!`);
}

downloadMissing();
