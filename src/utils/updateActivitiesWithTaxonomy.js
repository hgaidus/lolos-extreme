const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const dataDir = path.normalize("y:\\Lolos_Migration_Data\\exported_content\\data");
const sqlPath = 'y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-01-06T17-2.sql.gz';

console.log("Loading SQL dump...");
const buffer = fs.readFileSync(sqlPath);
const sql = zlib.gunzipSync(buffer).toString('utf8');

console.log("Parsing term_data for Activity Types (vid 4) and Ratings (vid 5)...");
const activityTypes = {}; // tid -> name
const ratings = {}; // tid -> name

const tdMatches = sql.matchAll(/\('(\d+)'\s*,\s*'(\d+)'\s*,\s*'((?:[^'\\]|\\.)*)'/g);
for (const tm of tdMatches) {
  const tid = tm[1];
  const vid = tm[2];
  const name = tm[3].replace(/\\'/g, "'");
  if (vid === '4') {
    activityTypes[tid] = name;
  } else if (vid === '5') {
    ratings[tid] = name;
  }
}
console.log(`Loaded ${Object.keys(activityTypes).length} activity types and ${Object.keys(ratings).length} ratings.`);

console.log("Parsing term_node mappings...");
const nidToType = {};
const nidToRating = {};

const tnMatches = sql.matchAll(/INSERT INTO `term_node` VALUES \('(\d+)'\s*,\s*'(\d+)'\s*,\s*'(\d+)'\);/g);
for (const tm of tnMatches) {
  const nid = tm[1];
  const tid = tm[2];
  if (activityTypes[tid]) {
    nidToType[nid] = activityTypes[tid];
  }
  if (ratings[tid]) {
    nidToRating[nid] = ratings[tid];
  }
}
console.log(`Mapped activity types for ${Object.keys(nidToType).length} nodes and ratings for ${Object.keys(nidToRating).length} nodes.`);

console.log("Updating activities.json...");
const actsPath = path.join(dataDir, "activities.json");
const acts = JSON.parse(fs.readFileSync(actsPath, "utf-8"));
let updated = 0;

acts.forEach(a => {
  const nid = String(a.nid);
  let changed = false;
  if (nidToType[nid]) {
    a.activity_type = nidToType[nid];
    changed = true;
  } else if (!a.activity_type) {
    a.activity_type = "Highlight";
  }
  if (nidToRating[nid]) {
    a.rating = nidToRating[nid];
    changed = true;
  } else if (!a.rating) {
    a.rating = "";
  }
  if (changed) updated++;
});

fs.writeFileSync(actsPath, JSON.stringify(acts, null, 2), "utf-8");
console.log(`Updated ${updated} activities in activities.json!`);

// Verify Las Vegas activities
const lvActs = acts.filter(a => String(a.parent_stop_nid) === '98');
console.log("Las Vegas activities after update:", lvActs.map(a => ({
  nid: a.nid,
  title: a.title,
  type: a.activity_type,
  rating: a.rating
})));
