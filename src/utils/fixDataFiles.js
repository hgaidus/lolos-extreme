const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const dataDir = path.normalize("y:\\Lolos_Migration_Data\\exported_content\\data");
const sqlPath = 'y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-01-06T17-2.sql.gz';

console.log("Loading 2026 database dump...");
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

console.log("Parsing stop mappings...");
const stopRows = parseInsertTuples('content_type_content_trip_stop');
const stopToTrip = {};
stopRows.forEach(r => {
  stopToTrip[r[1]] = r[10] && r[10] !== 'NULL' && r[10] !== 'null' ? r[10] : null;
});
console.log("Extracted stop->trip mappings:", Object.keys(stopToTrip).length);

console.log("Parsing activity mappings...");
const actRows = parseInsertTuples('content_type_content_activity');
const actToStop = {};
const actNarratives = {};
actRows.forEach(r => {
  actToStop[r[1]] = r[4] && r[4] !== 'NULL' && r[4] !== 'null' ? r[4] : null;
  actNarratives[r[1]] = r[2] && r[2] !== 'NULL' ? r[2] : "";
});
console.log("Extracted activity->stop mappings:", Object.keys(actToStop).length);

// Also let's get activity titles from node table
console.log("Parsing node titles...");
const nodeRows = parseInsertTuples('node');
const nodeTitles = {};
nodeRows.forEach(r => {
  nodeTitles[r[0]] = r[3] && r[3] !== 'NULL' ? r[3] : "";
});

// Update stops.json
console.log("Updating stops.json...");
const stopsPath = path.join(dataDir, "stops.json");
const stops = JSON.parse(fs.readFileSync(stopsPath, "utf-8"));
let updatedStops = 0;
stops.forEach(s => {
  const trueTripNid = stopToTrip[s.nid];
  if (trueTripNid) {
    s.parent_trip_nid = String(trueTripNid);
    updatedStops++;
  }
});
fs.writeFileSync(stopsPath, JSON.stringify(stops, null, 2), "utf-8");
console.log(`Updated ${updatedStops} out of ${stops.length} stops in stops.json!`);

// Update activities.json
console.log("Updating activities.json...");
const actsPath = path.join(dataDir, "activities.json");
const acts = JSON.parse(fs.readFileSync(actsPath, "utf-8"));
let updatedActs = 0;
acts.forEach(a => {
  const trueStopNid = actToStop[a.nid];
  if (trueStopNid) {
    a.parent_stop_nid = String(trueStopNid);
    a.title = nodeTitles[a.nid] || "Activity";
    if (actNarratives[a.nid]) {
      a.narrative = actNarratives[a.nid];
    }
    updatedActs++;
  }
});
fs.writeFileSync(actsPath, JSON.stringify(acts, null, 2), "utf-8");
console.log(`Updated ${updatedActs} out of ${acts.length} activities in activities.json!`);

console.log("Data repair complete!");
