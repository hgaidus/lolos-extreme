const fs = require('fs');
const sqlPath = 'Y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-07-03T00-0.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

// Search for menu_links with book or mlid/plid/weight
const bmNids = ['11757', '11760', '11840', '11854'];
console.log('--- Book Table ---');
const bookInserts = sql.match(/INSERT INTO `book`[^;\n]+/g) || [];
bookInserts.forEach(line => {
  bmNids.forEach(nid => {
    if (line.includes(`(${nid},`) || line.includes(` ${nid},`) || line.includes(`'${nid}'`)) {
      console.log(`Book match for ${nid}:`, line.substring(0, 200));
    }
  });
});

console.log('--- Menu Links ---');
const menuInserts = sql.match(/INSERT INTO `menu_links`[^;\n]+/g) || [];
menuInserts.forEach(line => {
  bmNids.forEach(nid => {
    if (line.includes(`node/${nid}`)) {
      console.log(`Menu match for ${nid}:`, line.substring(0, 300));
    }
  });
});
