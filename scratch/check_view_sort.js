const fs = require('fs');
const sqlPath = 'Y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-07-03T00-0.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

let idx = 0;
while ((idx = sql.indexOf('trip_stops', idx)) !== -1) {
  const snippet = sql.substring(Math.max(0, idx - 50), idx + 200).replace(/\n/g, ' ');
  if (snippet.includes('INSERT') || snippet.includes('view') || snippet.includes('sort') || snippet.includes('order')) {
    console.log('View match:', snippet);
  }
  idx += 10;
}
