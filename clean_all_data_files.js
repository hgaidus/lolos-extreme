const fs = require('fs');
const path = require('path');

const dataDir = 'y:/Lolos_Migration_Data/exported_content/data';

function unescapeString(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    // Replace MySQL double escaped \\r\\n or \\n or \\r with actual newline \n
    .replace(/\\r\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\n/g, "\n")
    // Also normalize ASCII \r\n or \r to \n
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Unescape single quotes \'
    .replace(/\\'/g, "'")
    // Unescape double quotes \"
    .replace(/\\"/g, '"')
    // Unescape duplicate backslashes if any
    .replace(/\\\\/g, "\\");
}

function cleanObject(obj) {
  if (typeof obj === 'string') {
    return unescapeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObject(item));
  }
  if (obj && typeof obj === 'object') {
    const res = {};
    for (const key of Object.keys(obj)) {
      res[key] = cleanObject(obj[key]);
    }
    return res;
  }
  return obj;
}

const files = fs.readdirSync(dataDir);
let totalChanged = 0;

for (const file of files) {
  if (!file.endsWith('.json')) continue;
  const filePath = path.join(dataDir, file);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  
  const cleaned = cleanObject(data);
  const newRaw = JSON.stringify(cleaned, null, 2);
  
  if (raw !== newRaw) {
    fs.writeFileSync(filePath, newRaw, 'utf8');
    console.log(`Updated ${file} - removed escape sequences.`);
    totalChanged++;
  } else {
    console.log(`${file} was already clean.`);
  }
}

console.log(`Total files cleaned: ${totalChanged}`);

// Let's verify stop 85 travelogue
const stops = JSON.parse(fs.readFileSync(path.join(dataDir, 'stops.json'), 'utf8'));
const stop85 = stops.find(s => String(s.nid) === '85');
console.log('\n=== STOP 85 AFTER CLEANING ===');
console.log(stop85.travelogue.slice(0, 300));
