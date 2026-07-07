const fs = require('fs');
const sqlPath = 'Y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-07-03T00-0.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

// Parse content_type_content_trip_stop
// Schema: vid, nid, hourslaststop, description, desc_fmt, travelogue, trav_fmt, mileslaststop, timezone, numnights, field_trip_name_nid, field_arrival_date_value
const stopDates = {};
const chunks = sql.split('INSERT INTO `content_type_content_trip_stop`');
chunks.slice(1).forEach(chunk => {
  const end = chunk.indexOf(';\r\n') !== -1 ? chunk.indexOf(';\r\n') : chunk.indexOf(';\n');
  const valStr = chunk.slice(chunk.indexOf('VALUES') + 6, end > 0 ? end : chunk.length);
  // Simple regex or string splitting
  // Let's find all ('vid','nid',...,'field_trip_name_nid','field_arrival_date_value')
  const rows = valStr.split(/\),\s*\(/);
  rows.forEach(r => {
    const clean = r.replace(/^\(/, '').replace(/\)$/, '');
    // Split by comma respecting quotes is tricky, but let's look at the last two values!
    const parts = clean.split(/,\s*/);
    const nid = parts[1] ? parts[1].replace(/['"]/g, '') : null;
    const parent = parts[parts.length - 2] ? parts[parts.length - 2].replace(/['"]/g, '') : null;
    const date = parts[parts.length - 1] ? parts[parts.length - 1].replace(/['"]/g, '') : null;
    if (nid) {
      stopDates[nid] = { nid, parent, date: parseInt(date, 10) || 0 };
    }
  });
});

console.log('Burning Man stop dates extracted:');
['11757', '11760', '11840', '11854'].forEach(nid => {
  console.log(`NID ${nid}:`, stopDates[nid]);
});
