async function checkNav() {
  const r = await fetch('https://www.cross-country-trips.com/our-burning-man-experience');
  const html = await r.text();
  const matches = html.match(/<div class="[^"]*book-navigation[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/i) || html.match(/<div class="[^"]*nav[^"]*"[^>]*>[\s\S]*?<\/div>/gi);
  if (matches) {
    console.log('--- Found Book Navigation ---');
    console.log(matches[0]);
  } else {
    // Search for "of " like "3 of 4"
    const idx = html.indexOf(' of ');
    if (idx !== -1) {
      console.log('--- Found " of " ---');
      console.log(html.substring(idx - 200, idx + 200));
    } else {
      console.log('Not found.');
    }
  }
}
checkNav();
