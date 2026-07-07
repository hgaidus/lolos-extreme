const fs = require('fs');
const sqlPath = 'Y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-07-03T00-0.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

const tables = [];
const re = /CREATE TABLE `([^`]+)`/g;
let m;
while ((m = re.exec(sql)) !== null) {
  tables.push(m[1]);
}
console.log('Last 40 tables:', tables.slice(-40));

const cp = sql.match(/INSERT INTO `custom_pager[^;\n]+/g) || [];
console.log('cp inserts:', cp);

// Search for where Burning Man stops order is defined
const bmNids = ['11757', '11760', '11840', '11854'];
bmNids.forEach(nid => {
  const re2 = new RegExp(`['"\`\\s]${nid}['"\`\\s]`, 'g');
  let match;
  let count = 0;
  while ((match = re2.exec(sql)) !== null && count < 5) {
    const start = Math.max(0, match.index - 50);
    const snippet = sql.substring(start, start + 150).replace(/\n/g, ' ');
    if (snippet.includes('INSERT') || snippet.includes('VALUES')) {
      console.log(`NID ${nid} ref:`, snippet);
      count++;
    }
  }
});
