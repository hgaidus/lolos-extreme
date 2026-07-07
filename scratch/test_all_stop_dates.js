const fs = require('fs');
const sqlPath = 'Y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-07-03T00-0.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

const stopFields = {}; // nid/vid -> { parent_trip_nid, description, travelogue, arrival_date }
const chunks = sql.split('INSERT INTO `content_type_content_trip_stop`');
chunks.slice(1).forEach(chunk => {
  const end = chunk.indexOf(';\r\n') !== -1 ? chunk.indexOf(';\r\n') : chunk.indexOf(';\n');
  const valStr = chunk.slice(chunk.indexOf('VALUES') + 6, end > 0 ? end : chunk.length);
  
  // We can match individual value tuples: ('vid','nid',...)
  // Since travelogue and description can contain commas and parens, let's use a regex or string scanner
  let rVal = /\(\s*'?'?(\d+)'?'?\s*,\s*'?'?(\d+)'?'?\s*,\s*[^,]*,\s*(?:'((?:[^'\\]|\\.)*)'|null|NULL)\s*,\s*[^,]*,\s*(?:'((?:[^'\\]|\\.)*)'|null|NULL)\s*,\s*[^,]*,\s*[^,]*,\s*[^,]*,\s*[^,]*,\s*('?'?\d+'?'?|null|NULL)\s*,\s*('?'?\d+'?'?|null|NULL)/gi;
  let m;
  while ((m = rVal.exec(valStr)) !== null) {
    const vid = m[1];
    const nid = m[2];
    const desc = m[3] ? m[3].replace(/\\'/g, "'").replace(/\\\\/g, "\\") : "";
    const trav = m[4] ? m[4].replace(/\\'/g, "'").replace(/\\\\/g, "\\") : "";
    let parent = m[5];
    if (!parent || parent.toLowerCase() === 'null') parent = "";
    else parent = parent.replace(/'/g, "");
    
    let date = m[6];
    if (!date || date.toLowerCase() === 'null') date = 0;
    else date = parseInt(date.replace(/'/g, ""), 10) || 0;
    
    const obj = { parent_trip_nid: parent, description: desc, travelogue: trav, arrival_date: date };
    stopFields[vid] = obj;
    stopFields[nid] = obj;
  }
});

console.log(`Extracted fields for ${Object.keys(stopFields).length / 2} stop nodes.`);

const bmNids = ['11757', '11760', '11840', '11854'];
bmNids.forEach(nid => {
  console.log(`NID ${nid}:`, stopFields[nid] ? { parent: stopFields[nid].parent_trip_nid, date: stopFields[nid].arrival_date } : 'MISSING');
});
