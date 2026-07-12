import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import CrossCountryExplorer from '@/components/CrossCountryExplorer';
import { DATA_DIR } from '@/lib/dataPaths';
import { menuTrips } from '@/data/menuTrips';

// Route-map GIFs for each trip. Most were already in the exported archive
// under their original Drupal filenames. The three newest trips (2015
// Migration West, 2015 Solo Motorcycle, 2016 Boat West) turned out to have
// real maps too, but under different filenames/paths than the rest
// (sites/default/files/images/6k or 8k, not the flat maps/ folder) — found
// by checking the still-live original site directly and pulling the correct
// files from the Drupal export, copied into public/maps/ under clearer
// names. (cc2015b.gif, previously guessed for Migration West, was wrong —
// it belongs to an unrelated trip and showed a completely different route.)
const GIF_BY_HREF = {
  "/1999-cross-country-road-trip": "cc1999s.gif",
  "/2000-cross-country-road-trip": "cc2000s.gif",
  "/2001-cross-country-road-trip": "cc2001s.gif",
  "/2002-cross-country-road-trip": "cc2002s.gif",
  "/2003-cross-country-road-trip": "cc2003s.gif",
  "/2005-cross-country-road-trip": "cc2005s.gif",
  "/2007-cross-country-road-trip": "cc2007s.gif",
  "/2009-cross-country-camping-trip": "cc20b9s.gif",
  "/2011-cross-country-road-trip": "cc2011s.gif",
  "/2013-cross-country-road-trip": "cc2013a.gif",
  "/2015-herb-and-lolos-migration-west": "cc2015d.gif",
  "/2015-solo-cross-country-motorcycle-trip": "2015-solo-motorcycle.gif",
  "/2016-bringing-boat-west": "cc2016c.gif",
};

// Short editorial blurbs, one per trip — grounded in each trip's real stops,
// not auto-generated. Maintained by hand alongside menuTrips.js.
const TEASER_BY_HREF = {
  "/1999-cross-country-road-trip": "Our maiden voyage, and the trip that started it all. Los Angeles to New York by way of Las Vegas, Hoover Dam, Lake Mead, Zion, the Grand Canyon's North Rim, and Bryce Canyon. We had no idea yet that this would become an annual tradition – by the time we got home we were already planning next year's route.",
  "/2000-cross-country-road-trip": "A sweep through the upper Midwest and northern plains: Sleeping Bear Dunes, Mackinac Island, Pictured Rocks, and Apostle Islands National Lakeshores, then west into the Dakotas. More lakeshore stops than any other cross-country trip we've run.",
  "/2001-cross-country-road-trip": "Our longest cross-country trip by mileage. Rocky Mountain National Park anchored the outbound leg, with Dinosaur National Monument, Flaming Gorge, Zion, Bryce, and the Grand Canyon's South Rim on the way to a finish at Olympic National Park on the Washington coast.",
  "/2002-cross-country-road-trip": "A trip through the Deep South and Southwest: Mammoth Cave, the Natchez Trace Parkway, Vicksburg, and on to Carlsbad Caverns, White Sands, Big Bend, and Saguaro. The longest itinerary of any of our cross-country trips.",
  "/2003-cross-country-road-trip": "A trip built entirely around Utah's red rock country: Flaming Gorge, Bryce Canyon, Cedar Breaks, and Zion, with stops at Kodachrome Basin and Moab in between. If you only have three weeks and want maximum scenery per mile driven, this is close to the ideal Utah loop.",
  "/2005-cross-country-road-trip": "Cuyahoga Valley National Park on the way out, then Colorado's Garden of the Gods, Black Canyon of the Gunnison, Mesa Verde, Arches, and Canyonlands, with a stop in Telluride and a night in Moab.",
  "/2007-cross-country-road-trip": "Goblin Valley and Capitol Reef set up a run through Lake Mead and Death Valley before a grand finale in Sequoia and Yosemite. Death Valley ran hotter than we expected even for a summer trip – worth checking the forecast if you're following this route.",
  "/2009-cross-country-camping-trip": "A trip to celebrate the boys' graduations: Indiana Dunes, Badlands, the Beartooth Highway, and Yellowstone and Grand Teton back-to-back – one of the best wildlife-watching stretches of any trip we've taken.",
  "/2011-cross-country-road-trip": "A trip centered on Colorado's Front Range: Boulder, Golden Gate Canyon State Park, Rocky Mountain National Park, and the Peak to Peak Highway, with Tommy showing us around Boulder where he was living at the time.",
  "/2013-cross-country-road-trip": "Our last cross-country trip together before the boys were off on their own: Rocky Mountain, Mount Rainier, Crater Lake, Olympic, North Cascades, Glacier, and Theodore Roosevelt National Parks. Seven parks in one trip is more than we'd usually attempt, but we wanted to make it count.",
  "/2015-solo-cross-country-motorcycle-trip": "A different kind of cross-country trip – just Herb, solo, on two wheels. Skyline Drive, the Blue Ridge Parkway, the Great Smoky Mountains, and Cades Cove, before heading west across the rest of the country.",
  "/2015-herb-and-lolos-migration-west": "The trip that moved us out to the West Coast for good – nine days, seven stops, and not much sightseeing along the way. Practical business, not a vacation: this is the trip that ended our cross-country era and started our West Coast one.",
  "/2016-bringing-boat-west": "Towing the boat trailer behind the Suburban, retracing much of our old cross-country route from New Jersey through the Midwest to the Southwest. Our last full cross-country drive – after this one, our trips shifted to flying out and renting or already having a vehicle in place.",
};

function getYear(trip) {
  const m = (trip.hover || trip.title || "").match(/^(\d{4})/);
  return m ? m[1] : "";
}

function getCrossCountryTrips() {
  try {
    const trips = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "trips.json"), "utf-8"));
    const stops = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "stops.json"), "utf-8"));

    return [...menuTrips.crossCountry].reverse().map(t => {
      const slug = t.href.replace(/^\//, "");
      const trip = trips.find(tr => tr.slug === slug);
      const tripStops = trip ? stops.filter(s => s.parent_trip_nid === trip.nid) : [];
      const miles = tripStops.reduce((a, s) => a + (Number(s.miles) || 0), 0);
      const nights = tripStops.reduce((a, s) => a + (Number(s.nights) || 0), 0);
      return {
        yr: getYear(t),
        name: t.title,
        href: slug,
        miles,
        days: nights + 1,
        gif: GIF_BY_HREF[t.href] || null,
        teaser: TEASER_BY_HREF[t.href] || "",
      };
    });
  } catch {
    return [];
  }
}

function getHomeBody() {
  try {
    const pages = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "standalone_pages.json"), "utf-8"));
    const home = pages.find(p => p.title && p.title.includes("Plan Your Route"));
    return home ? home.body : "";
  } catch { return ""; }
}

// Drupal's "line break converter" filter normally wraps blank-line-separated
// plain text in <p> tags at render time, but the raw stored body field (what
// we exported) never had that applied — it's just prose with blank lines
// between paragraphs. Recreate that here so paragraph breaks survive.
function autoParagraphs(html) {
  return html
    .split(/\n\s*\n+/)
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<(h2|h3|ul|p|iframe|div)/i.test(trimmed)) return trimmed;
      return `<p style="margin:0 0 14px;line-height:1.7">${trimmed}</p>`;
    })
    .join("\n");
}

function cleanBody(html) {
  const withParagraphs = autoParagraphs(
    html
      .replace(/<li>\s*<strong>Tips<\/strong>[\s\S]*?<\/li>/i, "")
      .replace(/href="internal:node\/(\d+)"/g, 'href="#"')
      .replace(/href="internal:([^"]+)"/g, 'href="/$1"')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
  );
  return withParagraphs
    .replace(/<h2>/g, '<h2 style="color:#c1593a;font-size:1.05rem;font-weight:700;margin:22px 0 10px">')
    .replace(/<h3>/g, '<h3 style="color:#c1593a;font-size:0.95rem;font-weight:700;margin:16px 0 8px">')
    .replace(/<ul>/g, '<ul style="margin:0 0 12px 18px;line-height:1.8">')
    .replace(/<li>/g, '<li style="margin-bottom:4px">')
    .replace(/<strong>/g, '<strong style="color:#2e2c26">');
  // Links intentionally get no inline color here — the site-wide `a`/`a:hover`
  // rule in globals.css (#3f5c4c at rest, #c1593a + underline on hover)
  // already applies to every <a>, so leaving it alone keeps these consistent
  // with the rest of the site instead of overriding it with a one-off color.
}

export default function HomePage() {
  const ccTrips = getCrossCountryTrips();
  const rawBody = getHomeBody();
  const cleanedBody = cleanBody(rawBody);

  // The raw body has its own "Contents of this site" list between the intro
  // and the news update — we render that section ourselves below (deduped
  // list, no Index item), so it's cut out here rather than shown twice.
  const contentsIdx = cleanedBody.indexOf('<h2 style="color:#c1593a;font-size:1.05rem;font-weight:700;margin:22px 0 10px">Contents of this');
  const updateIdx = cleanedBody.indexOf('<h2 style="color:#c1593a;font-size:1.05rem;font-weight:700;margin:22px 0 10px">January 2026 Update');
  const introPart = contentsIdx > 0 ? cleanedBody.substring(0, contentsIdx) : cleanedBody;
  const newsPart  = updateIdx > 0 ? cleanedBody.substring(updateIdx) : "";

  return (
    <div>
      <h1 className="font-serif text-[1.5rem] mb-4" style={{ color: "#2e2c26" }}>
        Cross Country RV Road Trip Planner
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-6 items-start">
        <CrossCountryExplorer trips={ccTrips} />

        <div>
          <div dangerouslySetInnerHTML={{ __html: introPart }} />

          <h2 style={{ color: "#c1593a", fontSize: "1.05rem", fontWeight: 700, margin: "20px 0 10px" }}>
            Contents of this 2,000+ page site include&hellip;
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1.5 text-sm mb-2" style={{ color: "#3d3a30" }}>
            <div>&bull; <Link href="/travel-itineraries" className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline font-semibold">Travelogues</Link> &mdash; a detailed account of our personal experiences at each stop</div>
            <div>&bull; <Link href="/trip-stops-map" className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline font-semibold">Overview Map</Link> &mdash; 809+ push-pin GPS stops</div>
            <div>&bull; <Link href="/activities/hike" className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline font-semibold">Activities</Link> &mdash; hikes, mountain biking, fishing &amp; rafting</div>
            <div>&bull; <Link href="/photo-albums" className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline font-semibold">Photographs</Link> &mdash; photo albums from each trip</div>
            <div>&bull; <Link href="/about-lolo-and-herb" className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline font-semibold">About Lolo &amp; Herb</Link> &mdash; our story &amp; the Lazy Daze</div>
            <div>&bull; <Link href="/motorhome-rentals" className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline font-semibold">Motorhome Rentals</Link> &mdash; tips on renting an RV</div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(90,74,50,0.15)", margin: "18px 0" }} />

          {newsPart && <div dangerouslySetInnerHTML={{ __html: newsPart }} />}
        </div>
      </div>
    </div>
  );
}
