const fs = require('fs');
const sqlPath = 'Y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-07-03T00-0.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

const bmNids = ['11757', '11760', '11840', '11854'];
bmNids.forEach(nid => {
  const target = `'${nid}','0',`;
  let idx = 0;
  while ((idx = sql.indexOf(target, idx)) !== -1) {
    const end = sql.indexOf(');', idx);
    if (end !== -1) {
      const row = sql.substring(idx, end + 2);
      if (row.length < 50000) {
        console.log(`NID ${nid} end:`, row.substring(row.length - 100));
      }
    }
    idx += 10;
  }
});
