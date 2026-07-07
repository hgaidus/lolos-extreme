const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const sqlPath = 'y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-01-06T17-2.sql.gz';
console.log("Loading SQL dump...");
const buffer = fs.readFileSync(sqlPath);
const sql = zlib.gunzipSync(buffer).toString('utf8');

console.log("Parsing term_data...");
const termMap = {};
// Match tuples like ('6','3','Amusement Park',...)
const tdMatches = sql.matchAll(/\('(\d+)'\s*,\s*'(\d+)'\s*,\s*'((?:[^'\\]|\\.)*)'/g);
for (const tm of tdMatches) {
  termMap[tm[1]] = { vid: tm[2], name: tm[3].replace(/\\'/g, "'") };
}
console.log(`Loaded ${Object.keys(termMap).length} terms from term_data.`);

console.log("Parsing term_node...");
const nidToTerms = {};
// Match tuples like ('2299','6','2299') in term_node
const tnMatches = sql.matchAll(/INSERT INTO `term_node` VALUES \('(\d+)'\s*,\s*'(\d+)'\s*,\s*'(\d+)'\);/g);
let tnCount = 0;
for (const tm of tnMatches) {
  const nid = tm[1];
  const tid = tm[2];
  if (!nidToTerms[nid]) nidToTerms[nid] = [];
  nidToTerms[nid].push(tid);
  tnCount++;
}
console.log(`Loaded ${tnCount} term mappings across ${Object.keys(nidToTerms).length} nodes.`);

// Let's check Las Vegas activities: nids 79, 80, 296, 297, 304, 567, 629, 834, 835
const lvNids = ['79', '80', '296', '297', '304', '567', '629', '834', '835'];
lvNids.forEach(nid => {
  const tids = nidToTerms[nid] || [];
  const terms = tids.map(t => termMap[t] ? `${termMap[t].name} (tid:${t}, vid:${termMap[t].vid})` : `tid:${t}`);
  console.log(`Activity nid ${nid}: terms =`, terms);
});

// Let's search for fivestar ratings for these nids
console.log("Searching for ratings in voting tables...");
const votingMatches = sql.matchAll(/INSERT INTO `(?:votingapi_cache|votingapi_vote|fivestar[^`]*)` VALUES \(([^)]+)\)/gi);
for (const vm of votingMatches) {
  console.log("Voting row:", vm[1]);
}
