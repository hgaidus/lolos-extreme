const fs = require('fs');
const sqlPath = 'Y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-07-03T00-0.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

const bmNids = ['11757', '11760', '11840', '11854'];
bmNids.forEach(nid => {
  const target = `node/${nid}`;
  let idx = 0;
  while ((idx = sql.indexOf(target, idx)) !== -1) {
    console.log(`Match for ${nid}:`, sql.substring(idx - 100, idx + 150));
    idx += target.length;
  }
});
