const fs = require('fs');
const sqlPath = 'Y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-07-03T00-0.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');
const tables = new Set();
let m;
const re = /CREATE TABLE `([^`]+)`/g;
while ((m = re.exec(sql)) !== null) {
  tables.add(m[1]);
}
console.log('Tables found:', Array.from(tables).filter(t => t.includes('book') || t.includes('menu') || t.includes('weight') || t.includes('node') || t.includes('sort')));
