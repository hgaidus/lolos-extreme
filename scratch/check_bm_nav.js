const slugs = [
  'so-what-burning-man',
  'our-burning-man-experience',
  'prepping-me-and-motorhome-burning-man',
  'climax-burning-man'
];

async function checkAll() {
  for (const s of slugs) {
    const r = await fetch(`https://www.cross-country-trips.com/${s}`);
    const html = await r.text();
    const m = html.match(/<ul class="custom-pager[^>]*>([\s\S]*?)<\/ul>/i);
    console.log(`=== ${s} ===`);
    if (m) {
      console.log(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    } else {
      console.log('No pager found');
    }
  }
}
checkAll();
