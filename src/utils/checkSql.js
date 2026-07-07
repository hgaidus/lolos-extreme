const fs = require('fs');
const zlib = require('zlib');

const sqlPath = 'y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-01-06T17-2.sql.gz';
const buffer = fs.readFileSync(sqlPath);
const sql = zlib.gunzipSync(buffer).toString('utf8');

function parseInsertTuples(tableName) {
  const bt = String.fromCharCode(96);
  const target = 'INSERT INTO ' + bt + tableName + bt;
  let idx = sql.indexOf(target);
  const results = [];

  while (idx !== -1) {
    let endIdx = sql.indexOf(';\r\n', idx);
    if (endIdx === -1) endIdx = sql.indexOf(';\n', idx);
    if (endIdx === -1) endIdx = idx + 1000000;
    
    const insertStr = sql.slice(idx, endIdx);
    let inQuote = false;
    let esc = false;
    let currentVal = '';
    let vals = [];
    let inTuple = false;

    for (let i = 0; i < insertStr.length; i++) {
      const c = insertStr[i];
      if (inQuote) {
        if (esc) {
          currentVal += c;
          esc = false;
        } else if (c === '\\') {
          esc = true;
          currentVal += c;
        } else if (c === "'") {
          inQuote = false;
          currentVal += c;
        } else {
          currentVal += c;
        }
      } else {
        if (c === "'") {
          inQuote = true;
          currentVal += c;
        } else if (c === '(' && !inTuple) {
          inTuple = true;
          vals = [];
          currentVal = '';
        } else if (c === ',' && inTuple) {
          vals.push(currentVal.trim());
          currentVal = '';
        } else if (c === ')' && inTuple) {
          vals.push(currentVal.trim());
          if (vals[0] && !vals[0].includes('`')) {
            results.push(vals);
          }
          inTuple = false;
        } else if (inTuple) {
          currentVal += c;
        }
      }
    }
    idx = sql.indexOf(target, idx + 10);
  }
  return results;
}

const stopRows = parseInsertTuples('content_type_content_trip_stop');
console.log('Parsed trip_stop rows from 2026 dump:', stopRows.length);
if (stopRows.length > 0) {
  console.log('Sample stop row:', stopRows[0]);
  const stopToTrip = {};
  stopRows.forEach(r => {
    stopToTrip[r[1]] = r[10]; // nid -> field_trip_name_nid
  });
  console.log('Unique stop->trip mappings:', Object.keys(stopToTrip).length);
  console.log('Sample mappings:', Object.entries(stopToTrip).slice(0, 10));
}

const actRows = parseInsertTuples('content_type_content_activity');
console.log('Parsed activity rows from 2026 dump:', actRows.length);
if (actRows.length > 0) {
  console.log('Sample activity row:', actRows[0]);
}
