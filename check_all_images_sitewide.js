const fs = require('fs');
const http = require('http');

const dataDir = 'y:/Lolos_Migration_Data/exported_content/data';
const stops = JSON.parse(fs.readFileSync(`${dataDir}/stops.json`, 'utf8'));
const trips = JSON.parse(fs.readFileSync(`${dataDir}/trips.json`, 'utf8'));
const activities = JSON.parse(fs.readFileSync(`${dataDir}/activities.json`, 'utf8'));
const photos = JSON.parse(fs.readFileSync(`${dataDir}/photo_titles.json`, 'utf8'));

// Find all NIDs referenced in any shortcode across all text fields
const allText = JSON.stringify({ stops, trips, activities });
const matches = allText.match(/\[img_assist[^\]]*\]/gi) || [];

console.log(`Total [img_assist] shortcodes found sitewide: ${matches.length}`);

const imageMap = new Map();
photos.forEach(p => {
  if (p && p.image_nid) imageMap.set(String(p.image_nid), p);
  if (p && p.image_vid) imageMap.set(String(p.image_vid), p);
});

const uniqueNids = new Set();
matches.forEach(m => {
  const nidMatch = m.match(/nid=(\d+)/i);
  if (nidMatch) uniqueNids.add(nidMatch[1]);
});

console.log(`Unique photo NIDs referenced sitewide: ${uniqueNids.size}`);

const nidsArray = Array.from(uniqueNids);
let checked = 0;
let notFoundCount = 0;
const notFoundList = [];

function checkNext(index) {
  if (index >= nidsArray.length) {
    console.log(`\n=== AUDIT COMPLETE ===`);
    console.log(`Checked: ${checked}`);
    console.log(`404 Not Found: ${notFoundCount}`);
    if (notFoundList.length > 0) {
      console.log(`\nList of 404 images:`);
      notFoundList.forEach(item => console.log(` - NID ${item.nid} (${item.title}): ${item.filename}`));
    }
    return;
  }

  const nid = nidsArray[index];
  const p = imageMap.get(nid);
  if (!p) {
    console.log(`[MISSING IN MAP] NID ${nid}`);
    notFoundCount++;
    notFoundList.push({ nid, title: 'Unknown', filename: 'No record in photo_titles.json' });
    checkNext(index + 1);
    return;
  }

  const cleanFilename = (p.filename || "").replace(/^sites\/default\/files\/(?:images\/)?/i, '');
  const url = 'http://localhost:3000/photos/' + encodeURI(cleanFilename);

  http.get(url, res => {
    checked++;
    if (res.statusCode !== 200) {
      notFoundCount++;
      notFoundList.push({ nid, title: p.title, filename: cleanFilename, status: res.statusCode });
      console.log(`[${res.statusCode}] NID ${nid} | ${p.title} | ${cleanFilename}`);
    } else if (checked % 100 === 0) {
      console.log(`Progress: Checked ${checked}/${nidsArray.length} images...`);
    }
    checkNext(index + 1);
  }).on('error', err => {
    console.error(`Error checking NID ${nid}:`, err.message);
    checkNext(index + 1);
  });
}

checkNext(0);
