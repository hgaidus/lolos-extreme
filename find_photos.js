const fs = require('fs');
const path = require('path');

const dirs = fs.readdirSync('y:/Lolos_Migration_Data/modern-app/public/photos');
console.log('public/photos top-level dirs/files count:', dirs.length);
console.log('Sample entries:', dirs.slice(0, 15));

const exists8k = fs.existsSync('y:/Lolos_Migration_Data/modern-app/public/photos/8k');
console.log('8k exists in public/photos:', exists8k);

function findFile(dir, name) {
  try {
    fs.readdirSync(dir).forEach(f => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory() && !p.includes('node_modules') && !p.includes('.next') && !p.includes('.git')) {
        findFile(p, name);
      } else if (f.toLowerCase() === name.toLowerCase()) {
        console.log('Found:', p);
      }
    });
  } catch (e) {}
}

console.log('Searching for BM3.jpg across Y:/Lolos_Migration_Data...');
findFile('y:/Lolos_Migration_Data', 'BM3.jpg');
findFile('y:/Lolos_Migration_Data', 'PXL_20250830_184050419~2_0.preview.jpg');
