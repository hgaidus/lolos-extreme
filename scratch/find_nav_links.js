async function check() {
  const r = await fetch('https://www.cross-country-trips.com/our-burning-man-experience');
  const html = await r.text();
  const idx = html.indexOf('‹ previous');
  if (idx !== -1) {
    console.log(html.substring(idx - 250, idx + 350));
  }
}
check();
