const fs = require('fs');
const sqlPath = 'Y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-07-03T00-0.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');
const tables = [];
const re = /CREATE TABLE `([^`]+)`/g;
let m;
while ((m = re.exec(sql)) !== null) {
  tables.push(m[1]);
}
console.log('All tables:', tables);
