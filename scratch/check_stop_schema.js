const fs = require('fs');
const sqlPath = 'Y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-07-03T00-0.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

const idx = sql.indexOf('CREATE TABLE `content_type_content_trip_stop`');
if (idx !== -1) {
  console.log(sql.substring(idx, idx + 1500));
}
