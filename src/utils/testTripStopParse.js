const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

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
            results.push(vals.map(v => v.replace(/^'|'$/g, '')));
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

console.log("Parsing content_type_content_trip_stop...");
const stopRows = parseInsertTuples('content_type_content_trip_stop');
console.log("Found rows:", stopRows.length);
if (stopRows.length > 0) {
  const lv = stopRows.find(r => r[1] === '98');
  console.log("Las Vegas row in content_type_content_trip_stop:", lv);
}

console.log("Parsing term_data...");
const termData = parseInsertTuples('term_data');
const termMap = {};
termData.forEach(r => termMap[r[0]] = r[2]);

console.log("Parsing term_node...");
const termNode = parseInsertTuples('term_node');
const lvTerms = termNode.filter(r => r[0] === '98').map(r => termMap[r[1]]);
console.log("Las Vegas terms:", lvTerms);
