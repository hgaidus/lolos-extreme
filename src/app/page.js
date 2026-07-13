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
// not auto-generated. Maintained by hand alongside menuTrips.js. Cross-checked
// against stops.json for accuracy (a few parks named in earlier drafts of
// this copy — e.g. Olympic, North Cascades, Glacier, and Theodore Roosevelt
// for 2013 — turned out not to be on that trip's actual stop list, so those
// were corrected here).
const TEASER_BY_HREF = {
  "/1999-cross-country-road-trip": "Our maiden voyage, and the trip that started it all. Las Vegas to New Jersey by way of Hoover Dam and Lake Mead, then five National Parks through Utah and Arizona's canyon country – Zion, the Grand Canyon's North Rim, Bryce Canyon, Arches, and Canyonlands – with a stop at Mesa Verde's cliff dwellings before the long drive home across Kansas and Ohio. We had no idea yet that this would become an annual tradition – by the time we got home we were already planning next year's route.",
  "/2000-cross-country-road-trip": "A sweep through the upper Midwest that turned into something much bigger: Sleeping Bear Dunes, Mackinac Island, and Pictured Rocks National Lakeshores, then all the way out to Waterton-Glacier, Yellowstone, and Grand Teton before looping back through Mount Rushmore and the Badlands. More National Lakeshores and National Parks than any other cross-country trip we've run, and our first real taste of Montana and Wyoming.",
  "/2001-cross-country-road-trip": "Our longest cross-country trip by mileage. Rocky Mountain National Park anchored the outbound leg, with Dinosaur National Monument and Flaming Gorge on the way to a finish at Mount Rainier and Olympic National Park on the Washington coast. From there we crossed into Canada for Banff, Mt. Revelstoke, and Jasper National Parks along the Icefields Parkway, then looped home through the Canadian prairies and Minnesota.",
  "/2002-cross-country-road-trip": "A trip through the Deep South and Southwest: Mammoth Cave, the Natchez Trace Parkway, and Vicksburg, then on to Carlsbad Caverns, White Sands, and Guadalupe Mountains, with a swing through Navajo Land at Monument Valley and Four Corners. The longest itinerary of any of our cross-country trips, with detours through Santa Fe, Sedona, and the Grand Canyon's South Rim on the way back east.",
  "/2003-cross-country-road-trip": "A trip built entirely around Utah's red rock country: Flaming Gorge, Bryce Canyon, and Cedar Breaks, with stops at Kodachrome Basin, Lake Powell, and Arches in between. If you only have three weeks and want maximum scenery per mile driven, this is close to the ideal Utah loop – four National Parks and monuments without ever leaving the state's southern half.",
  "/2005-cross-country-road-trip": "Cuyahoga Valley National Park on the way out, then Colorado's Garden of the Gods and Black Canyon of the Gunnison, followed by a run through Utah's Natural Bridges, Capitol Reef, and Arches, with stops in Ouray, Vail, and a night in Moab. We closed the loop with the Gateway Arch in St. Louis and Frank Lloyd Wright's Fallingwater in Pennsylvania.",
  "/2007-cross-country-road-trip": "Goblin Valley and Capitol Reef set up a run through Lake Mead and Death Valley before a grand finale in Yosemite Valley. Death Valley ran hotter than we expected even for a summer trip – worth checking the forecast if you're following this route – and we closed the loop with a stop at the underrated Great Basin National Park in eastern Nevada.",
  "/2009-cross-country-camping-trip": "A trip to celebrate the boys' graduations: Indiana Dunes, Badlands, the Beartooth Highway, and Yellowstone and Grand Teton back-to-back – one of the best wildlife-watching stretches of any trip we've taken. We finished with a run through Bryce Canyon, the Grand Canyon's South Rim, Monument Valley, and Arches on the way home.",
  "/2011-cross-country-road-trip": "A trip centered on Colorado's Front Range: Boulder, Golden Gate Canyon State Park, Rocky Mountain National Park, and the Peak to Peak Highway, with Tommy showing us around Boulder where he was living at the time. A shorter, more relaxed itinerary than most of our cross-country runs – one region explored in real depth rather than a sprint coast to coast.",
  "/2013-cross-country-road-trip": "Our last cross-country trip together before the boys were off on their own – one to start a new job in Seattle, the other in San Francisco. Rocky Mountain National Park anchored the outbound leg, with Mount Rainier, Crater Lake, and the Redwoods on the way to drop-offs on both ends of the West Coast. Towing a car behind the RV for the first time in 15 years of travel, our little caravan stretched over 60 feet long.",
  "/2015-solo-cross-country-motorcycle-trip": "A different kind of cross-country trip – just Herb, solo, on two wheels. Skyline Drive, the Blue Ridge Parkway, the Great Smoky Mountains, and Cades Cove through the Appalachians, then Route 66 and I-40 west through Oklahoma, New Mexico, and Arizona to Las Vegas and Death Valley. The last leg climbed into the Eastern Sierra at June Lake before dropping into Sacramento and finishing at the Bay.",
  "/2015-herb-and-lolos-migration-west": "The trip that moved us out to the West Coast for good – nine days, seven stops, and not much sightseeing along the way. We drove the I-80 corridor practically nonstop to beat our moving truck to storage in Santa Rosa, with just enough time to climb a wall in Iowa, tour Temple Square in Salt Lake City, and gawk at the Bonneville Salt Flats along the way. Practical business, not a vacation: this is the trip that ended our cross-country era and started our West Coast one.",
  "/2016-bringing-boat-west": "Towing the boat trailer behind the Suburban, retracing much of our old cross-country route from New Jersey through the Midwest to the Southwest, with a stop at Petrified Forest National Park and Lake Mead before the boat's new home in Northern California. Our last full cross-country drive – after this one, our trips shifted to flying out and renting or already having a vehicle in place.",
};

// Real named highlights per trip, pulled from stops.json (National Parks,
// monuments, and other landmark stops) — used for the bulleted highlights
// list in the homepage explorer, and doubles as keyword-rich, crawlable
// content for search. Each links to that stop's own page (slug taken
// directly from stops.json, not guessed), so a couple of labels below use
// friendlier text than the underlying stop's own title.
const HIGHLIGHTS_BY_HREF = {
  "/1999-cross-country-road-trip": [
    { label: "Hoover Dam", slug: "hoover-dam" },
    { label: "Zion National Park", slug: "zion-national-park" },
    { label: "Grand Canyon National Park (North Rim)", slug: "grand-canyon-north-rim" },
    { label: "Bryce Canyon National Park", slug: "bryce-canyon-national-park" },
    { label: "Arches National Park", slug: "arches-national-park" },
    { label: "Canyonlands National Park", slug: "canyonlands-national-park" },
    { label: "Mesa Verde National Park", slug: "mesa-verde-national-park" },
  ],
  "/2000-cross-country-road-trip": [
    { label: "Sleeping Bear Dunes National Lakeshore", slug: "sleeping-bear-dunes-national-lakeshore" },
    { label: "Mackinac Island", slug: "mackinac-island" },
    { label: "Waterton-Glacier National Park", slug: "waterton-glacier-national-park" },
    { label: "Yellowstone National Park", slug: "yellowstone-national-park" },
    { label: "Grand Teton National Park", slug: "grand-teton-national-park-0" },
    { label: "Mount Rushmore", slug: "mount-rushmore" },
    { label: "Badlands National Park", slug: "badlands-national-park" },
  ],
  "/2001-cross-country-road-trip": [
    { label: "Rocky Mountain National Park", slug: "rocky-mountain-national-park" },
    { label: "Dinosaur National Monument", slug: "dinosaur-national-monument" },
    { label: "Flaming Gorge National Recreation Area", slug: "flaming-gorge-national-recreation-area" },
    { label: "Mount Rainier National Park", slug: "mount-rainier-national-park" },
    { label: "Olympic National Park", slug: "olympic-national-park" },
    { label: "Banff National Park", slug: "banff-national-park" },
    { label: "Jasper National Park", slug: "jasper-national-park" },
  ],
  "/2002-cross-country-road-trip": [
    { label: "Mammoth Cave", slug: "mammoth-cave" },
    { label: "Carlsbad Caverns", slug: "carlsbad-caverns" },
    { label: "White Sands National Monument", slug: "white-sands-national-monument" },
    { label: "Guadalupe Mountains National Park", slug: "guadalupe-mountains-national-park" },
    { label: "Monument Valley", slug: "monument-valley" },
    { label: "Grand Canyon National Park (South Rim)", slug: "grand-canyon-south-rim" },
    { label: "Petrified Forest National Park", slug: "petrified-forest-national-park" },
  ],
  "/2003-cross-country-road-trip": [
    { label: "Flaming Gorge National Recreation Area", slug: "flaming-gorge-national-recreation-area-fire-hole-canyon" },
    { label: "Bryce Canyon National Park", slug: "bryce-canyon-national-park-0" },
    { label: "Cedar Breaks National Monument", slug: "cedar-breaks-national-monument" },
    { label: "Kodachrome Basin State Park", slug: "kodachrome-basin-state-park" },
    { label: "Lake Powell", slug: "lake-powell-wahweap" },
    { label: "Arches National Park", slug: "arches-national-park-0" },
  ],
  "/2005-cross-country-road-trip": [
    { label: "Black Canyon of the Gunnison National Park", slug: "black-canyon-gunnison-national-park" },
    { label: "Natural Bridges National Monument", slug: "natural-bridges-national-monument" },
    { label: "Capitol Reef National Park", slug: "capitol-reef-national-park-0" },
    { label: "Arches National Park", slug: "arches-national-park-1" },
    { label: "Gateway Arch, St. Louis", slug: "gateway-arch-st-louis" },
    { label: "Fallingwater", slug: "fallingwater" },
  ],
  "/2007-cross-country-road-trip": [
    { label: "Goblin Valley State Park", slug: "goblin-valley-state-park" },
    { label: "Capitol Reef National Park", slug: "fremont-river-waterfall-capitol-reef-national-park" },
    { label: "Death Valley National Park", slug: "death-valley-national-park" },
    { label: "Yosemite Valley", slug: "yosemite-valley" },
    { label: "Great Basin National Park", slug: "great-basin-national-park" },
  ],
  "/2009-cross-country-camping-trip": [
    { label: "Badlands National Park", slug: "badlands-national-park-0" },
    { label: "Beartooth Highway", slug: "beartooth-highway" },
    { label: "Yellowstone National Park", slug: "yellowstone-national-park-0" },
    { label: "Grand Teton National Park", slug: "grand-teton-national-park" },
    { label: "Bryce Canyon National Park", slug: "bryce-canyon-national-park-1" },
    { label: "Monument Valley", slug: "monument-valley-0" },
    { label: "Arches National Park", slug: "arches-national-park-2" },
  ],
  "/2011-cross-country-road-trip": [
    { label: "Rocky Mountain National Park", slug: "rocky-mountain-national-park-1" },
    { label: "Golden Gate Canyon State Park", slug: "golden-gate-canyon-state-park" },
    { label: "Peak to Peak Highway", slug: "peak-peak-highway" },
    { label: "Boulder", slug: "boulder" },
    { label: "Breckenridge", slug: "breckenridge-1" },
  ],
  "/2013-cross-country-road-trip": [
    { label: "Rocky Mountain National Park", slug: "rocky-mountain-national-park-2" },
    { label: "Mount Rainier National Park", slug: "mount-rainier-national-park-0" },
    { label: "Crater Lake National Park", slug: "crater-lake-national-park" },
    { label: "Redwood National and State Parks", slug: "redwood-national-and-state-parks" },
    { label: "Seattle", slug: "seattle" },
  ],
  "/2015-solo-cross-country-motorcycle-trip": [
    { label: "Skyline Drive", slug: "skyline-drive-fancy-gap" },
    { label: "Blue Ridge Parkway", slug: "blue-ridge-parkway-ashville" },
    { label: "Great Smoky Mountains", slug: "great-smokies-gatlinburg" },
    { label: "Cades Cove", slug: "cades-cove-loop-lebanon" },
    { label: "Death Valley", slug: "nv160-death-valley" },
    { label: "Eastern Sierra (June Lake)", slug: "us395-june-lake" },
  ],
  "/2015-herb-and-lolos-migration-west": [
    { label: "Climb Iowa", slug: "iowa-nebraska" },
    { label: "Temple Square, Salt Lake City", slug: "wyoming-utah" },
    { label: "Bonneville Salt Flats", slug: "utah-california" },
  ],
  "/2016-bringing-boat-west": [
    { label: "Petrified Forest National Park", slug: "petrified-forest-national-park-0" },
    { label: "Lake Mead National Recreation Area", slug: "lake-mead-national-recreation-area-0" },
  ],
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
        highlights: HIGHLIGHTS_BY_HREF[t.href] || [],
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
