const fs = require('fs');
const sqlPath = 'Y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-07-03T00-0.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

const vs = sql.match(/INSERT INTO `view_sort`[^;\n]+/g) || [];
vs.forEach(line => {
  if (line.includes("'8'") || line.includes("'26'") || line.includes("'5'") || line.includes("'25'") || line.includes("trip_stops")) {
    console.log('view_sort:', line);
  }
});

// Also check views_display for vid 26 or 25
const vd = sql.match(/INSERT INTO `views_display`[^;\n]+/g) || [];
vd.forEach(line => {
  if (line.includes("'trip_stops_mini'") || line.includes("'trip_stops_block'")) {
    console.log('views_display:', line.substring(0, 300));
  }
});
