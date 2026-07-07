const fs = require('fs');
const path = require('path');

const sqlPath = 'Y:/Lolos_Migration_Data/files/backup_migrate/manual/Lolo039sExtremeCrossCountryRVTrips-2026-07-03T00-0.sql';
console.log('Reading 2026 SQL dump from:', sqlPath);
const sql = fs.readFileSync(sqlPath, 'utf8');

// Helper to extract table block strictly within table boundaries
function extractTableBlock(sqlText, tableName) {
  const marker = `CREATE TABLE \`${tableName}\``;
  const idx = sqlText.indexOf(marker);
  if (idx === -1) return "";
  const nextTable = sqlText.indexOf("CREATE TABLE", idx + marker.length);
  return nextTable !== -1 ? sqlText.slice(idx, nextTable) : sqlText.slice(idx);
}

// 1. Extract node types and stop nodes strictly within node table
console.log('1. Extracting stop nodes and image nodes...');
const stopNodes = {}; // nid -> { vid, title }
const imageNodes = {}; // nid -> { vid, title, nid }
const nodeBlock = extractTableBlock(sql, 'node');
let rNode = /\(\s*'?'?(\d+)'?'?\s*,\s*'?'?(\d+)'?'?\s*,\s*'([^']*)'\s*,\s*'((?:[^'\\]|\\.)*)'/g;
let m;
while ((m = rNode.exec(nodeBlock)) !== null) {
  const nid = m[1];
  const vid = m[2];
  const type = m[3];
  const title = m[4].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
  if (type === 'content_trip_stop') {
    stopNodes[nid] = { vid, title };
  } else if (type === 'image') {
    imageNodes[nid] = { vid, title, nid };
    imageNodes[vid] = { vid, title, nid };
  }
}
console.log(`Found ${Object.keys(stopNodes).length} trip stop nodes and ${Object.keys(imageNodes).length / 2} image nodes.`);

// 2. Extract url_alias strictly within url_alias table
console.log('2. Extracting url_alias...');
const aliases = {}; // nid -> slug
const aliasBlock = extractTableBlock(sql, 'url_alias');
let rAlias = /\(\s*'?(\d+)'?\s*,\s*'node\/(\d+)'\s*,\s*'([^']*)'/g;
while ((m = rAlias.exec(aliasBlock)) !== null) {
  aliases[m[2]] = m[3];
}
console.log(`Extracted ${Object.keys(aliases).length} aliases.`);

// 3. Extract content_type_content_trip_stop fields
console.log('3. Extracting content_type_content_trip_stop...');
const stopFields = {}; // nid/vid -> { parent_trip_nid, description, travelogue }
const stopBlock = extractTableBlock(sql, 'content_type_content_trip_stop');
let rVal = /\(\s*'?'?(\d+)'?'?\s*,\s*'?'?(\d+)'?'?\s*,\s*[^,]*,\s*(?:'((?:[^'\\]|\\.)*)'|null|NULL)\s*,\s*[^,]*,\s*(?:'((?:[^'\\]|\\.)*)'|null|NULL)\s*,\s*[^,]*,\s*[^,]*,\s*[^,]*,\s*[^,]*,\s*('?'?\d+'?'?|null|NULL)\s*,\s*('?'?\d+'?'?|null|NULL)/gi;
while ((m = rVal.exec(stopBlock)) !== null) {
  const vid = m[1];
  const nid = m[2];
  const desc = m[3] ? m[3].replace(/\\'/g, "'").replace(/\\\\/g, "\\") : "";
  const trav = m[4] ? m[4].replace(/\\'/g, "'").replace(/\\\\/g, "\\") : "";
  let parent = m[5];
  if (parent && parent.toLowerCase() !== 'null') parent = parent.replace(/'/g, '');
  else parent = null;

  stopFields[nid] = { parent_trip_nid: parent, description: desc, travelogue: trav };
  stopFields[vid] = stopFields[nid];
}
console.log(`Extracted stop fields for ${Object.keys(stopFields).length / 2} stops.`);

// Build authoritative stops.json array
const cleanedStops = [];
Object.keys(stopNodes).forEach(nid => {
  const node = stopNodes[nid];
  const fields = stopFields[nid] || stopFields[node.vid] || {};
  let slug = aliases[nid];
  if (!slug) {
    slug = node.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  const desc = fields.description || "";
  const trav = fields.travelogue || "";

  cleanedStops.push({
    nid: nid,
    vid: node.vid,
    title: node.title,
    slug: slug,
    parent_trip_nid: fields.parent_trip_nid || null,
    description: desc,
    travelogue: trav,
    body: desc || trav || ""
  });
});

// Sort cleanedStops by nid (chronological creation order in Drupal)
cleanedStops.sort((a, b) => {
  return parseInt(a.nid, 10) - parseInt(b.nid, 10);
});

console.log(`Generated ${cleanedStops.length} total authoritative stops.`);

// Write stops.json
const stopsPath = 'y:/Lolos_Migration_Data/exported_content/data/stops.json';
fs.writeFileSync(stopsPath, JSON.stringify(cleanedStops, null, 2), 'utf8');
console.log('Successfully saved stops.json!');

// 4. Extract image file paths strictly within files table
console.log('4. Extracting files table...');
const filesMap = {}; // fid -> filename
const fileBlock = extractTableBlock(sql, 'files');
let rFile = /\(\s*'?'?(\d+)'?'?\s*,\s*'?'?(\d+)'?'?\s*,\s*'[^']*'\s*,\s*'([^']*)'\s*,\s*'image\/[^']*'/g;
while ((m = rFile.exec(fileBlock)) !== null) {
  let fp = m[3];
  if (fp.startsWith('sites/default/files/images/')) {
    fp = fp.slice('sites/default/files/images/'.length);
  } else if (fp.startsWith('sites/default/files/')) {
    fp = fp.slice('sites/default/files/'.length);
  }
  filesMap[m[1]] = fp;
}
console.log(`Extracted ${Object.keys(filesMap).length} file paths.`);

// 5. Extract image sizes and fids strictly within image table
console.log('5. Extracting image table...');
const imageFids = {}; // nid -> fid
const imageSizes = {}; // nid -> size priority
const sizePriority = { '_original': 10, 'normal': 8, 'preview': 5, 'thumbnail': 2, 'mini': 1 };
const imgBlock = extractTableBlock(sql, 'image');
let rImg = /\(\s*'?'?(\d+)'?'?\s*,\s*'?'?(\d+)'?'?\s*,\s*'([^']*)'\s*\)/g;
while ((m = rImg.exec(imgBlock)) !== null) {
  const nid = m[1];
  const fid = m[2];
  const size = m[3];
  if (filesMap[fid]) {
    const prio = sizePriority[size] || 6; // default 6 for custom dimensions
    const currPrio = imageSizes[nid] || 0;
    if (prio > currPrio) {
      imageSizes[nid] = prio;
      imageFids[nid] = fid;
    }
  }
}
console.log(`Mapped ${Object.keys(imageFids).length} images to fids.`);

// 6. Extract content_type_image stop associations into SEPARATE NID and VID maps
console.log('6. Extracting content_type_image stop associations...');
const stopByNid = new Map();
const stopByVid = new Map();
const assocBlock = extractTableBlock(sql, 'content_type_image');
let rAssoc = /\(\s*'?'?(\d+)'?'?\s*,\s*'?'?(\d+)'?'?\s*,\s*'?'?(\d+|null|NULL)'?'?/gi;
while ((m = rAssoc.exec(assocBlock)) !== null) {
  if (m[3] && m[3].toLowerCase() !== 'null') {
    const val = m[3].replace(/'/g, '');
    stopByVid.set(String(m[1]), val);
    stopByNid.set(String(m[2]), val);
  }
}
console.log(`Mapped stop associations: stopByNid=${stopByNid.size}, stopByVid=${stopByVid.size}`);

// Build authoritative photo_titles.json
const photoTitlesMap = new Map();
const photoTitlesPath = 'y:/Lolos_Migration_Data/exported_content/data/photo_titles.json';

// Enrich with authoritative SQL data first so _original high res takes priority
Object.keys(imageFids).forEach(nidStr => {
  const fid = imageFids[nidStr];
  const filename = filesMap[fid];
  const nodeInfo = imageNodes[nidStr] || {};
  const title = nodeInfo.title || "";
  const vidStr = nodeInfo.vid ? String(nodeInfo.vid) : nidStr;
  const realNid = nodeInfo.nid ? String(nodeInfo.nid) : nidStr;
  
  // Strictly check NID map first to prevent VID collision
  const stopNid = stopByNid.get(realNid) || stopByVid.get(vidStr) || null;

  const record = {
    image_nid: realNid,
    image_vid: vidStr,
    filename: filename,
    title: title,
    trip_stop_nid: stopNid
  };

  photoTitlesMap.set(realNid, record);
  if (vidStr !== realNid) photoTitlesMap.set(vidStr, record);
});

// Preserve any existing records from old photo_titles.json only if not in SQL
if (fs.existsSync(photoTitlesPath)) {
  const oldPhotos = JSON.parse(fs.readFileSync(photoTitlesPath, 'utf8'));
  oldPhotos.forEach(p => {
    if (p && p.image_nid && !photoTitlesMap.has(String(p.image_nid))) {
      photoTitlesMap.set(String(p.image_nid), p);
    }
  });
}

const finalPhotoTitles = Array.from(photoTitlesMap.values());
console.log(`Generated ${finalPhotoTitles.length} total authoritative photo records.`);

// Verify Burning Man stops and photos
const bmStops = cleanedStops.filter(s => s.parent_trip_nid === '11756' || s.title.toLowerCase().includes('burn'));
console.log('=== BURNING MAN STOPS IN STOPS.JSON ===');
bmStops.forEach(s => {
  console.log(`NID: ${s.nid}, Title: "${s.title}", Slug: "${s.slug}", ParentTrip: "${s.parent_trip_nid}", TravLen: ${s.travelogue.length}, BodyLen: ${s.body.length}`);
});

const bmPhotos = finalPhotoTitles.filter(p => bmStops.some(s => s.nid === p.trip_stop_nid));
console.log(`Found ${bmPhotos.length} photos associated with Burning Man stops.`);

fs.writeFileSync(photoTitlesPath, JSON.stringify(finalPhotoTitles, null, 2), 'utf8');
console.log('Successfully saved photo_titles.json!');
