import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import InteractiveTravelogue from '@/components/InteractiveTravelogue';
import { cleanDrupalContent, unescapeDrupalText } from '@/utils/cleanContent';
import { DATA_DIR } from '@/lib/dataPaths';
import { photoFileExists } from '@/lib/photoExists';
import { getTripRegionInfo } from '@/lib/tripRegions';

function isExcludedSlug(slugStr) {
  const s = slugStr.toLowerCase();
  return s.includes('lazy-daze') || s === 'tips' || s.startsWith('tips/');
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const slugStr = slug.join('/');
  if (isExcludedSlug(slugStr)) {
    return { title: "Not Found | Lolo's Extreme Cross Country RV Trips" };
  }
  const item = lookupItem(slugStr);
  if (!item) {
    return { title: "Not Found | Lolo's Extreme Cross Country RV Trips" };
  }
  const title = cleanTitle(item.title);
  const fullTitle = `${title} | Lolo's Extreme Cross Country RV Trips`;
  // Canonicalize to the matched item's own slug, not the requested path.
  // lookupItem() falls back to fuzzy matching for legacy Drupal URLs, so many
  // URL variants (including any suffix on a real slug) resolve to the same
  // item; without this each variant self-canonicalizes and Google sees
  // duplicates. Synthetic state/category listings carry no slug, so they fall
  // back to the request path.
  const canonicalPath = item.slug
    ? "/" + String(item.slug).replace(/^\/+/, "")
    : "/" + decodeURIComponent(slugStr).replace(/^\/+/, "");

  // Real description from the content when available; sensible fallbacks for
  // the synthetic state/category listing pages (which have no travelogue).
  let description;
  if (item.itemType === "state_listing") {
    description = `Every RV trip stop Lolo and Herb visited in ${title} — campsites, national parks, and highlights across 20+ years of cross-country travel.`;
  } else if (item.itemType === "category_listing") {
    description = `${title} stops from Lolo and Herb's cross-country RV trips — where they camped, hiked, and explored across the USA and Canada.`;
  } else {
    description =
      plainExcerpt(item.travelogue || item.description || item.body || item.summary) ||
      `Lolo and Herb's RV travelogue and photos for ${title}.`;
  }

  return {
    title: fullTitle,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalPath,
      type: "article",
      siteName: "Lolo's Extreme Cross Country RV Trips",
      images: ["/photos/logo.gif"],
    },
  };
}

function cleanTitle(str = "") {
  return str.replace(/\[img_assist[^\]]*\]/gi, "").trim();
}

// Plain-text excerpt for meta descriptions / structured data — strips Drupal
// [img_assist] shortcodes, HTML tags, and entities, then truncates on a word
// boundary. (Function declaration, so it's hoisted for use in generateMetadata.)
function plainExcerpt(raw, maxLen = 155) {
  if (!raw) return "";
  let text = unescapeDrupalText(String(raw));
  text = text.replace(/\[img_assist[^\]]*\]/gi, " ");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/&#?[a-z0-9]+;/gi, " ");
  text = text.replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 60 ? truncated.slice(0, lastSpace) : truncated).trim() + "…";
}

function toIsoDate(unixSeconds) {
  if (!unixSeconds) return undefined;
  const d = new Date(Number(unixSeconds) * 1000);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function slugifyCategory(cat = "") {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatStopDate(ts) {
  if (!ts) return "";
  const d = new Date(Number(ts) * 1000);
  if (isNaN(d.getTime())) return "";
  const datePart = d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "long", year: "numeric", month: "long", day: "numeric" });
  let timePart = d.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit", hour12: true });
  timePart = timePart.replace(" ", "").toLowerCase();
  return `${datePart} - ${timePart}`;
}

function formatPageDate(ts) {
  if (!ts) return "";
  const d = new Date(Number(ts) * 1000);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatStopStats(miles, hours, nights) {
  const parts = [];
  if (miles !== null && miles !== undefined && Number(miles) > 0) parts.push(`${miles} miles`);
  if (hours !== null && hours !== undefined && Number(hours) > 0) parts.push(`${hours} hours`);
  
  let str = "";
  if (parts.length > 0) {
    str = parts.join(" and ") + " from our last stop";
  }
  
  if (nights !== null && nights !== undefined) {
    const n = Number(nights);
    const nightStr = `${n} night stay`;
    if (str) str += ` - ${nightStr}`;
    else str = nightStr;
  }
  return str;
}

// Verified against every trip's actual page on the original Drupal site
// (cross-country-trips.com) rather than guessed from slug keywords, since
// no trip-overview-map reference exists anywhere in the migrated data.
// null means the original site shows no overview map for that trip at all.
// Where the exact original file wasn't migrated (only a lower-res variant
// exists, or the file is missing entirely), the closest available
// substitute is used instead.
const TRIP_MAP_BY_SLUG = {
  "1998-road-trip-virginia-and-north-carolina": "/photos/ccalltrips_0.gif",
  "1999-cross-country-road-trip": "/photos/cc1999s.gif",
  "1999-road-trip-first-landing-state-park-virginia": "/photos/ccalltrips_0.gif",
  "1999-road-trip-niagara-falls": "/photos/ccalltrips_0.gif",
  "1999-road-trip-boston-suburbs": "/photos/ccalltrips_0.gif",
  "2000-cross-country-road-trip": "/photos/cc2000s.gif",
  "2000-winter-road-trip-acadia": "/photos/ccalltrips_0.gif",
  "2000-spring-break-hunting-island": "/photos/ccalltrips_0.gif",
  "2000-columbus-day-provincetown": "/photos/ccalltrips_0.gif",
  "2000-chesapeake-rv-road-trip": "/photos/ccalltrips_0.gif",
  "2001-cross-country-road-trip": "/photos/cc2001s.gif",
  "2001-spring-break-hunting-island": "/photos/ccalltrips_0.gif",
  "2001-winter-trip-lake-placid": "/photos/ccalltrips_0.gif",
  "2002-cross-country-road-trip": "/photos/cc2002s.gif",
  "2002-winter-trip-stowe-vermont": "/photos/ccalltrips_0.gif",
  "2002-spring-break-hunting-island": "/photos/ccalltrips_0.gif",
  "2002-rv-trip-delaware-and-virginia-beach": "/photos/ccalltrips_0.gif",
  "2003-cross-country-road-trip": "/photos/cc2003s.gif",
  "2003-spring-break-edisto-island": "/photos/ccalltrips_0.gif",
  "2004-maritime-provinces-road-trip": "/photos/cc2004s.gif",
  "2004-spring-break-ocracoke-island": "/photos/ccalltrips_0.gif",
  "2005-cross-country-road-trip": "/photos/cc2005s.gif",
  "2006-alaska-rv-road-trip": "/photos/cc2006s.gif",
  "2007-cross-country-road-trip": "/photos/cc2007s.gif",
  "2008-marthas-vineyard-rv-vacation": "/photos/4k/cc2008.gif",
  "2009-cross-country-camping-trip": "/photos/4k/cc20b9s.gif",
  "2009-white-mountains-backpacking-trip": "/photos/4k/AJG-White-Mountains-Map-01-450_0.jpg",
  "2009-southeast-coast-trip": "/photos/4k/cc2009s.gif",
  "2010-rv-trip-quebec": "/photos/4k/cc2010s.gif",
  "2011-cross-country-road-trip": "/photos/4k/cc2011s.gif",
  "2012-northern-california-road-trip": "/photos/4k/cc2012.gif",
  "2013-cross-country-road-trip": "/photos/4k/cc2013a.gif",
  "2013-pacific-northwest": "/photos/5k/cc2013b.gif",
  "2013-yosemite-thanksgiving": "/photos/5k/cc2013c_0.gif",
  "2014-pacific-northwest": "/photos/5k/cc2014a.gif",
  "2014-yosemite-and-eastern-sierra": "/photos/5k/cc2014b.gif",
  "2014-southwest-deserts-and-yosemite": "/photos/5k/cc2014c.gif",
  "2015-seattle-san-francisco-and-sierra": "/photos/6k/cc2015b.gif",
  "2015-solo-cross-country-motorcycle-trip": "/photos/8k/2015-solo-motorcycle.gif",
  "2015-yosemite-and-northern-california": "/photos/6k/cc2015c.gif",
  "2015-herb-and-lolos-migration-west": "/photos/6k/cc2015d.gif",
  "2015-yosemite-thanksgiving-and-san-diego": "/photos/6k/cc2015e.gif",
  "2015-christmas-yosemite": "/photos/6k/cc2015f.gif",
  "2016-yosemite-eastern-sierra": "/photos/6k/cc2016b.gif",
  "2016-bringing-boat-west": "/photos/6k/cc2016c.gif",
  "2016-yosemite-and-pinnacles": "/photos/6k/cc2016d.gif",
  "2016-christmas-tahoe": "/photos/6k/cc2016e.gif",
  "2017-southern-california-deserts": "/photos/6k/cc2017a.gif",
  "2017-death-valley-and-eastern-sierra-4wd": "/photos/6k/cc2017b.gif",
  "2017-european-vacation": "/photos/7k/germany.gif",
  "2017-4wd-eastern-sierra-and-death-valley-adventure": "/photos/6k/cc2017b.gif",
  "totality": "/photos/7k/cc2017d.gif",
  "2018-hawaii-big-island-maui": "/photos/8k/Hawaii-real.gif",
  "2018-thailand-trip": "/photos/7k/Thailand-Route.gif",
  "2018-eastern-sierra": "/photos/7k/20180529-sierra.gif",
  "2018-lake-powell-boat-camping": "/photos/7k/20180701-powell.gif",
  "2018-tuolumne-meadows": "/photos/7k/20180822-tuolumne.gif",
  "2018-trinity-alps": "/photos/7k/20180925-trinity.gif",
  "2018-eastern-sierra-outlaws": "/photos/7k/20181007-outlaws.gif",
  "2018-mojave-road-indian-wells": "/photos/7k/20181016-mojave.gif",
  "2018-yosemite-winter": "/photos/7k/20180220-yosemite.gif",
  "2019-spain": "/photos/8k/Spain.gif",
  "2019-baja-adventure": "/photos/8k/baja_map.gif",
  "2019-superbloom": "/photos/8k/north_america_map_2019-04_final_.gif",
  "2019-central-and-se-oregon": "/photos/8k/oregon.gif",
  "2019-bishop-andrews-30th-birthday-bash": "/photos/8k/2019-05-03-Bishop-Bday.gif",
  "2019-boating-shasta-lake": "/photos/8k/2019-07-07-Shasta.gif",
  "2019-august-yosemite-valley": "/photos/8k/2019-08-14-yosemite.gif",
  "2019-fall-trip-eastern-sierra": "/photos/8k/north_america_map_2019-10_final_.gif",
  "2020-yosemite-during-covid": "/photos/8k/2020-yosemite_0.gif",
  "2020-lake-powell-during-covid": "/photos/8k/cc2020-powell.gif",
  "2020-eastern-sierra-during-covid": "/photos/8k/2020-east-sierra-covid.gif",
  "2020-bishop-and-death-valley": "/photos/8k/2020-bishop-death.gif",
  "2021-california-surf-and-turf": "/photos/8k/2021-surfturf.gif",
  "2021-pacific-northwest-escaping-smoke": "/photos/8k/2021-Oregon.gif",
  "2021-yosemite-fall": "/photos/8k/2021-10-26-yosemite.gif",
  "2021-death-valley-fall": "/photos/8k/cc2017b.gif",
  "2021-carmel": "/photos/8k/2021-Carmel.gif",
  "2021-utah-roading": "/photos/8k/2023-9-9-UtahOffRoad.gif",
  "2022-san-diego-anza-borrego-joshua-tree": "/photos/8k/2022-sandiego-anza.gif",
  "2022-bishop-and-death-valley": "/photos/8k/2020-bishop-death.gif",
  "2022-pescadero-capitola": "/photos/8k/2022-capitola.gif",
  "2022-arizona-and-new-mexico": "/photos/8k/north_america_map_2022bisti_.gif",
  "2022-greece-and-islands": "/photos/8k/International-greece.gif",
  "2022-yosemite-valley": "/photos/8k/2020-yosemite_0.gif",
  "2023-galapagos-islands": "/photos/8k/galapagos-map.gif",
  "2023-iceland": "/photos/8k/Iceland.gif",
  "2023-lost-coast": "/photos/8k/Lost-Coast.gif",
  "2023-vancouver-island": "/photos/8k/2023-8-14-Vancouver.gif",
  "2023-utah-road": "/photos/8k/2023-9-9-UtahOffRoad.gif",
  "2023-yosemite-fall": "/photos/8k/2020-yosemite_0.gif",
  "2024-kauai": "/photos/8k/Hawaii-2024.gif",
  "2024-bishop-and-death-valley": "/photos/8k/cc2017b.gif",
  "2024-colorado-river-rafting": "/photos/8k/cc2020-powell.gif",
  "2024-maui": "/photos/8k/Hawaii-real.gif",
  "mojave-4wd-course-and-more": null,
  "2025-new-zealand-north-island": "/photos/8k/New-Zealand-North.gif",
  "2025-new-zealand-south-island": "/photos/8k/New-Zealand.gif",
  "2025-marthas-vineyard-vermont": "/photos/4k/cc2008.gif",
  "2025-utah-roading": "/photos/8k/2023-9-9-UtahOffRoad.gif",
  "2025-burning-man": "/photos/8k/cc2017b.gif",
  "2026-carmel": "/photos/8k/2021-Carmel.gif",
};

function getTripMapUrl(trip) {
  if (!trip) return null;
  const slug = (trip.slug || "").toLowerCase();
  return TRIP_MAP_BY_SLUG[slug] ?? null;
}

// Trips have no per-record author field in the migrated data (unlike stops,
// which do), so authorship was hardcoded to "Lolo" for every trip. Verified
// against the live site's byline for all 103 trips; these are the only ones
// not written by Lolo.
const TRIP_AUTHOR_BY_SLUG = {
  "2009-cross-country-camping-trip": "Tommy",
  "2009-white-mountains-backpacking-trip": "Andrew",
  "2015-solo-cross-country-motorcycle-trip": "Herb",
};

function getTripAuthor(trip) {
  if (!trip) return "Lolo";
  const slug = (trip.slug || "").toLowerCase();
  return TRIP_AUTHOR_BY_SLUG[slug] ?? "Lolo";
}

function formatStopDateOnly(ts) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function getExportedData() {
  try {
    const stops = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "stops.json"), "utf-8"));
    const trips = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "trips.json"), "utf-8"));
    const pages = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "standalone_pages.json"), "utf-8"));
    const comments = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "comments.json"), "utf-8"));
    const photoTitles = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "photo_titles.json"), "utf-8"))
      .map(p => ({ ...p, title: unescapeDrupalText(p.title) }));
    const activities = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "activities.json"), "utf-8"));
    return { stops, trips, pages, comments, photoTitles, activities };
  } catch (err) {
    console.warn("Could not load ETL data in catch-all", err);
    return { stops: [], trips: [], pages: [], comments: [], photoTitles: [], activities: [] };
  }
}

function lookupItem(slugStr) {
  if (isExcludedSlug(slugStr)) return null;
  const { stops, trips, pages: allPages } = getExportedData();
  const pages = allPages.filter(p => p.type !== 'amazon_node' && !((p.slug || '').toLowerCase() === 'tips' || (p.slug || '').toLowerCase().startsWith('tips/')));
  const cleanSlug = decodeURIComponent(slugStr).replace(/^\//, '');

  let found = stops.find(s => s.slug === cleanSlug || s.slug === `/${cleanSlug}`);
  if (found) return { ...found, itemType: 'stop' };

  found = trips.find(t => t.slug === cleanSlug || t.slug === `/${cleanSlug}`);
  if (found) return { ...found, itemType: 'trip' };

  found = pages.find(p => p.slug === cleanSlug || p.slug === `/${cleanSlug}`);
  if (found) return { ...found, itemType: 'page' };

  // Fuzzy / normalized matching fallback for minor slug discrepancies (e.g. missing 'and', 'trip', or hyphens)
  const norm = (s = "") => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w && !['and', 'the', 's', 'trip', 'road', 'vacation', 'islands', 'big', 'sur', 'in'].includes(w)).join('');
  const targetNorm = norm(cleanSlug);
  if (targetNorm) {
    found = trips.find(t => {
      const tn = norm(t.slug);
      const tt = norm(t.title);
      return tn === targetNorm || tt === targetNorm || tn.startsWith(targetNorm) || targetNorm.startsWith(tn) || (targetNorm.length >= 8 && (tn.includes(targetNorm) || tt.includes(targetNorm)));
    });
    if (found) return { ...found, itemType: 'trip' };

    found = stops.find(s => {
      const tn = norm(s.slug);
      const tt = norm(s.title);
      return tn === targetNorm || tt === targetNorm || tn.startsWith(targetNorm) || targetNorm.startsWith(tn);
    });
    if (found) return { ...found, itemType: 'stop' };

    found = pages.find(p => {
      const tn = norm(p.slug);
      const tt = norm(p.title);
      return tn === targetNorm || tt === targetNorm;
    });
    if (found) return { ...found, itemType: 'page' };
  }

  // Check if this is a state listing URL (e.g. /state/oh or /oh or /state/germany)
  const stateCandidate = decodeURIComponent(cleanSlug).replace(/^state\//i, '').trim().toLowerCase();
  const matchedStateObj = stops.find(s => s.state && (s.state.toLowerCase() === stateCandidate || slugifyCategory(s.state) === stateCandidate));
  if (matchedStateObj) {
    return { title: matchedStateObj.state, itemType: 'state_listing', stateCode: matchedStateObj.state };
  }

  // Check if this is a category/stop-type listing URL (e.g. /category/stopover or /stopover)
  const catCandidate = decodeURIComponent(cleanSlug).replace(/^(category|stop-type)\//i, '').trim().toLowerCase();
  const matchedCatObj = stops.find(s => s.category && (s.category.toLowerCase() === catCandidate || slugifyCategory(s.category) === catCandidate));
  if (matchedCatObj) {
    return { title: matchedCatObj.category, itemType: 'category_listing', categoryName: matchedCatObj.category };
  }

  return null;
}

export default async function CatchAllPage({ params, searchParams }) {
  const { slug } = await params;
  const { from } = await searchParams;
  const slugStr = slug.join('/');
  if (isExcludedSlug(slugStr)) {
    notFound();
  }
  const item = lookupItem(slugStr);
  if (!item) {
    notFound();
  }
  const { stops, trips, comments, photoTitles, activities } = getExportedData();
  const displayItem = item;

  const displayTitle = cleanTitle(displayItem.title);

  // Structured data (schema.org) for the article-style pages (trip/stop/page).
  // Rendered as a JSON-LD <script> in the main content column below.
  const canonicalUrl = "https://cross-country-trips.com/" + decodeURIComponent(slugStr).replace(/^\/+/, "");
  const jsonLd = ["trip", "stop", "page"].includes(displayItem.itemType)
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BlogPosting",
            headline: displayTitle,
            description: plainExcerpt(displayItem.travelogue || displayItem.description || displayItem.body) || undefined,
            datePublished: toIsoDate(displayItem.arrival_date || displayItem.created),
            author: { "@type": "Person", name: displayItem.author || "Lolo" },
            mainEntityOfPage: canonicalUrl,
            publisher: {
              "@type": "Organization",
              name: "Lolo's Extreme Cross Country RV Trips",
              logo: { "@type": "ImageObject", url: "https://cross-country-trips.com/photos/logo.gif" },
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://cross-country-trips.com/" },
              { "@type": "ListItem", position: 2, name: displayTitle, item: canonicalUrl },
            ],
          },
        ],
      }
    : null;

  if (displayItem.itemType === 'state_listing' || displayItem.itemType === 'category_listing') {
    const matchingStops = displayItem.itemType === 'state_listing'
      ? stops.filter(s => s.state && (s.state.toUpperCase() === displayItem.stateCode || s.state === displayItem.stateCode)).sort((a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title)))
      : stops.filter(s => s.category && s.category === displayItem.categoryName).sort((a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title)));

    // If we arrived here from a stop's state/category tag, show that stop as a
    // middle breadcrumb segment so it's easy to navigate back to it.
    const originStop = from ? stops.find(s => s.slug === from) : null;

    return (
      <div className="w-full max-w-6xl mx-auto min-w-0 py-6 px-4 sm:px-6 font-sans">
        <div className="mb-6 flex gap-2 items-center text-sm flex-wrap">
          <Link href="/" className="text-[#c1593a] font-semibold hover:underline">Home</Link>
          <span className="text-[#a89e8a]">/</span>
          {originStop && (
            <>
              <Link href={`/${originStop.slug}`} className="text-[#c1593a] font-semibold hover:underline">
                {cleanTitle(originStop.title)}
              </Link>
              <span className="text-[#a89e8a]">/</span>
            </>
          )}
          <span className="text-[#5c5648] font-medium truncate">{displayItem.title}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#c1593a] mb-6 font-sans">
          {displayItem.title}
        </h1>
        <div className="glass-panel overflow-hidden border border-[#c1593a]/25 rounded-lg shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse font-sans">
              <thead>
                <tr className="bg-[#3f5c4c] text-[#faf6ee] border-b border-[#c1593a]/30">
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Stop Name</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Trip Name</th>
                  <th className="py-3.5 px-3 text-center font-bold uppercase tracking-wider text-xs whitespace-nowrap w-20">State</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Stop Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4dcc8] bg-white/70">
                {matchingStops.length > 0 ? (
                  matchingStops.map((stop, idx) => {
                    const parentTrip = trips.find(t => String(t.nid) === String(stop.parent_trip_nid));
                    const catSlug = stop.category ? slugifyCategory(stop.category) : '';
                    return (
                      <tr key={stop.nid || idx} className={idx % 2 === 0 ? "bg-black/[0.02] hover:bg-[#c1593a]/5 transition-colors" : "bg-transparent hover:bg-[#c1593a]/5 transition-colors"}>
                        <td className="py-3 px-4 font-semibold">
                          <Link href={`/${stop.slug}`} className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline">
                            {cleanTitle(stop.title)}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          {parentTrip ? (
                            <Link href={`/${parentTrip.slug}`} className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline">
                              {cleanTitle(parentTrip.title)}
                            </Link>
                          ) : '--'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold whitespace-nowrap">
                          {stop.state ? (
                            <Link href={`/state/${stop.state.toLowerCase()}`} className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline">
                              {stop.state}
                            </Link>
                          ) : '--'}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {stop.category ? (
                            <Link href={`/category/${catSlug}`} className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline">
                              {stop.category}
                            </Link>
                          ) : '--'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-[#8a8272]">No stops found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Clean the text using our utility
  let rawText = "";
  if (displayItem.itemType === 'trip') {
    rawText = displayItem.travelogue || displayItem.body || (String(displayItem.year || "").length > 10 ? displayItem.year : "") || displayItem.summary || "";
  } else if (displayItem.description && displayItem.description.trim() && displayItem.travelogue && displayItem.description !== displayItem.travelogue) {
    rawText = displayItem.travelogue + `\n\n<hr />\n\n<div class="trip-description-box bg-[#c1593a]/[0.07] border-l-4 border-[#c1593a] rounded text-[#4a4437] italic font-medium leading-relaxed">${displayItem.description}</div>`;
  } else {
    rawText = displayItem.travelogue || displayItem.description || displayItem.summary || displayItem.body || "";
  }
  const cleanedHtml = cleanDrupalContent(rawText, photoTitles);

  // Find archival photos for this stop
  const stopPhotos = photoTitles
    .filter(p => String(p.trip_stop_nid) === String(displayItem.nid))
    .filter(p => photoFileExists(p.filename))
    .map((p, i) => ({
      url: `/photos/${p.filename}`,
      title: p.title || `${displayTitle} Photo Archive #${i+1}`
    }));

  const displayPhotos = stopPhotos;

  // Determine parent trip and trip stops for the Left Sidebar
  let currentTrip = null;
  let tripStops = [];
  let relevantActivities = [];

  // Stops must render in chronological trip order, not the order they happen to
  // appear in the source data (which reflects when each stop was added to the
  // CMS, not when it occurred on the trip).
  const byArrivalOrder = (a, b) => {
    const ta = Number(a.arrival_date) || Number(a.created) || 0;
    const tb = Number(b.arrival_date) || Number(b.created) || 0;
    return ta - tb;
  };

  if (displayItem.itemType === 'trip') {
    currentTrip = displayItem;
    tripStops = stops.filter(s => String(s.parent_trip_nid) === String(displayItem.nid)).sort(byArrivalOrder);
    relevantActivities = [];
  } else if (displayItem.itemType === 'stop') {
    currentTrip = trips.find(t => String(t.nid) === String(displayItem.parent_trip_nid));
    if (currentTrip) {
      tripStops = stops.filter(s => String(s.parent_trip_nid) === String(currentTrip.nid)).sort(byArrivalOrder);
    }
    relevantActivities = activities.filter(a => String(a.parent_stop_nid) === String(displayItem.nid));
  }

  const isStop = displayItem.itemType === 'stop';
  const stopIndex = isStop ? tripStops.findIndex(s => String(s.nid) === String(displayItem.nid)) : -1;
  const prevStop = stopIndex > 0 ? tripStops[stopIndex - 1] : null;
  const nextStop = stopIndex !== -1 && stopIndex < tripStops.length - 1 ? tripStops[stopIndex + 1] : null;


  // Safely extract 4-digit year
  const yr = (displayTitle || "").match(/\b(19\d\d|20\d\d)\b/)?.[1] ||
             (/^\d{4}$/.test(String(displayItem.year || "")) ? String(displayItem.year) : (currentTrip ? (currentTrip.title || "").match(/\b(19\d\d|20\d\d)\b/)?.[1] : null));

  const tripMapUrl = displayItem.itemType === 'trip' ? getTripMapUrl(displayItem) : null;

  return (
    <div className="w-full">
      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex gap-2 items-center text-sm flex-wrap">
        <Link href="/" className="text-[#c1593a] font-semibold hover:underline">Home</Link>
        <span className="text-[#a89e8a]">/</span>
        {currentTrip && displayItem.itemType === 'stop' && (
          <>
            <Link href={`/${currentTrip.slug}`} className="text-[#c1593a] font-semibold hover:underline">
              {cleanTitle(currentTrip.title)}
            </Link>
            <span className="text-[#a89e8a]">/</span>
          </>
        )}
        <span className="text-[#5c5648] font-medium truncate">{displayTitle}</span>
      </div>

      {/* Unified 3-Column Layout: Fixed Left & Right Sidebars, Fluid Center Content */}
      <div className="trip-page-layout flex flex-row gap-4 sm:gap-6 lg:gap-8 items-start w-full">
        {/* LEFT SIDEBAR: Route Map & Itinerary Table (Fixed Width) - ONLY FOR TRIPS, STOPS, AND ABOUT US */}
        {(displayItem.itemType === 'trip' || displayItem.itemType === 'stop' || displayItem.slug === 'about-lolo-and-herb' || String(displayItem.nid) === '2' || displayItem.slug === 'contact-us') && (
          <aside
            className={`${
              displayItem.itemType === 'trip'
                ? 'trip-overview-sidebar-column shrink-0 glass-sidebar p-3 sm:p-4 md:p-5 sticky top-20'
                : displayItem.slug === 'about-lolo-and-herb' || String(displayItem.nid) === '2' || displayItem.slug === 'contact-us'
                  ? 'photo-sidebar-column shrink-0 glass-sidebar'
                  : 'trip-sidebar-column shrink-0 glass-sidebar p-3 sm:p-4 md:p-5 sticky top-20'
            }`}
          >
            <div>
              {/* About Lolo & Herb Sidebar Photo per Original Drupal Site */}
              {(displayItem.slug === 'about-lolo-and-herb' || String(displayItem.nid) === '2') ? (
                <div className="trip-sidebar-map-box standalone-photo-box text-center bg-white p-3 rounded-lg border border-[#c1593a]/25 font-sans">
                  <img
                    src="/photos/HL_Yosemite.jpg"
                    alt="Herb and Lolo Backpacking in Yosemite circa 1986"
                    title="Herb and Lolo Backpacking in Yosemite circa 1986"
                    style={{ maxWidth: "241px" }}
                    className="w-full h-auto rounded shadow-md border border-black/10 mx-auto"
                  />
                  <div className="mt-2.5 text-xs text-[#5c5648] font-medium leading-relaxed">
                    <strong>Herb and Lolo Backpacking in Yosemite circa 1986</strong>
                  </div>
                </div>
              ) : displayItem.slug === 'contact-us' ? (
                <div className="trip-sidebar-map-box standalone-photo-box text-center bg-white p-3 rounded-lg border border-[#c1593a]/25 font-sans">
                  <img
                    src="/photos/family_yellowstone_1992.jpg"
                    alt="The Gaidus family in Yellowstone, 1992"
                    title="The Gaidus family in Yellowstone, 1992"
                    style={{ maxWidth: "372px" }}
                    className="w-full h-auto rounded shadow-md border border-black/10 mx-auto"
                  />
                  <div className="mt-2.5 text-xs text-[#5c5648] font-medium leading-relaxed">
                    <strong>The Gaidus family in Yellowstone, 1992</strong>
                  </div>
                </div>
              ) : (
                <>
                  {/* Route Map Image - ONLY ON TRIP OVERVIEWS THAT HAVE A ROUTE MAP */}
                  {displayItem.itemType === 'trip' && tripMapUrl && (
                    <div className="trip-sidebar-map-box">
                      <img
                        src={tripMapUrl}
                        alt={`Route Map for ${displayTitle}`}
                        width="450"
                        height="300"
                        className="trip-sidebar-map-img"
                      />
                    </div>
                  )}

                  {/* Drupal Green & White Striped Itinerary Table - ONLY ON TRIPS & STOPS */}
                  {(displayItem.itemType === 'trip' || displayItem.itemType === 'stop') && (
                    <div className="trip-sidebar-table-box">
                      {/* From a stop, this bar is the way back up to the trip
                          overview. On the trip overview itself it names the page
                          you're already on, so it stays plain text rather than
                          linking to itself. */}
                      {isStop && currentTrip ? (
                        <Link
                          href={`/${currentTrip.slug}`}
                          className="block bg-[#58B195] hover:bg-[#4a9a80] text-[#faf6ee] hover:text-white font-bold p-2.5 text-xs uppercase tracking-wider text-center border-b border-[#c1593a]/30 no-underline hover:underline transition-colors"
                        >
                          {cleanTitle(currentTrip.title)} Itinerary
                        </Link>
                      ) : (
                        <div className="bg-[#58B195] text-[#faf6ee] font-bold p-2.5 text-xs uppercase tracking-wider text-center border-b border-[#c1593a]/30">
                          {currentTrip ? cleanTitle(currentTrip.title) : displayTitle} Itinerary
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        {isStop ? (
                          <table className="w-full text-left text-xs border-collapse font-sans">
                            <tbody className="divide-y divide-[#e4dcc8]">
                              {tripStops.length > 0 ? (
                                tripStops.map((stop, idx) => {
                                  const isCurrentStop = String(stop.nid) === String(displayItem.nid);
                                  return (
                                    <tr key={stop.nid || idx} className={isCurrentStop ? "bg-[#7c9880]/25 font-bold text-[#3f5c4c]" : (idx % 2 === 0 ? "bg-black/[0.02] hover:bg-[#c1593a]/5 transition-colors" : "bg-transparent hover:bg-[#c1593a]/5 transition-colors")}>
                                      <td className="py-2.5 px-3 font-medium">
                                        <Link href={`/${stop.slug}`} className={`${isCurrentStop ? 'text-[#3f5c4c] font-extrabold underline' : 'text-[#3f5c4c] hover:text-[#c1593a] hover:underline no-underline'} block whitespace-normal break-words`}>
                                          {cleanTitle(stop.title)}
                                        </Link>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td className="py-6 text-center text-[#8a8272]">No stops logged.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse font-sans table-fixed">
                            <thead>
                              <tr className="bg-[#7c9880]/20 text-[#3f5c4c] border-b border-[#c1593a]/25">
                                <th className="py-2.5 px-2 text-center w-[26px] font-bold whitespace-nowrap">#</th>
                                <th className="py-2.5 px-2 font-bold">Itinerary</th>
                                <th className="py-2.5 px-1 text-center w-[38px] font-bold whitespace-nowrap">State</th>
                                <th className="py-2.5 px-1 text-right w-[44px] font-bold whitespace-nowrap">Miles</th>
                                <th className="py-2.5 px-2 text-right w-[46px] font-bold whitespace-nowrap">Hours</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e4dcc8]">
                              {tripStops.length > 0 ? (
                                tripStops.map((stop, idx) => {
                                  return (
                                    <tr key={stop.nid || idx} className={idx % 2 === 0 ? "bg-black/[0.02] hover:bg-[#c1593a]/5 transition-colors" : "bg-transparent hover:bg-[#c1593a]/5 transition-colors"}>
                                      <td className="py-2.5 px-2 text-center font-bold text-[#8a8272] whitespace-nowrap">{idx + 1}</td>
                                      <td className="py-2.5 px-2 font-medium">
                                        <Link href={`/${stop.slug}`} className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline no-underline block whitespace-normal break-words">
                                          {cleanTitle(stop.title)}
                                        </Link>
                                      </td>
                                      <td className="py-2.5 px-1 text-center font-semibold text-[#5c5648] whitespace-nowrap">{stop.state || '--'}</td>
                                      <td className="py-2.5 px-1 text-right text-[#5c5648] whitespace-nowrap">{stop.miles ?? '--'}</td>
                                      <td className="py-2.5 px-2 text-right text-[#5c5648] whitespace-nowrap">{stop.hours ?? '--'}</td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan="5" className="py-6 text-center text-[#8a8272]">No stops logged.</td>
                                </tr>
                              )}
                            </tbody>
                            {tripStops.length > 0 && (
                              <tfoot>
                                <tr className="bg-[#58B195] text-[#faf6ee] font-bold border-t border-[#c1593a]/30">
                                  <td colSpan="2" className="py-2.5 px-2 text-right uppercase tracking-wider text-[11px] whitespace-nowrap">Total: {tripStops.length} Stops</td>
                                  <td className="py-2.5 px-1 text-center whitespace-nowrap">--</td>
                                  <td className="py-2.5 px-1 text-right text-[#a54a2f] whitespace-nowrap">
                                    {tripStops.reduce((acc, s) => acc + (Number(s.miles) || 0), 0)}
                                  </td>
                                  <td className="py-2.5 px-2 text-right text-[#a54a2f] whitespace-nowrap">
                                    {tripStops.reduce((acc, s) => acc + (Number(s.hours) || 0), 0)}
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        )}

        {/* CENTER COLUMN: Road Trip Article (Fluid Width - Expands/Contracts as needed) */}
        <main className="trip-main-column flex-1 min-w-0">
          {jsonLd && (
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          )}
          <article className="glass-panel p-6 md:p-8 mb-8">
            <div className="border-b border-black/10 pb-5 mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-[#2e2c26] m-0">
                {displayTitle}{isStop && displayItem.state && !displayTitle.includes(displayItem.state) ? `, ${displayItem.state}` : ''}
              </h1>
              {displayItem.itemType === 'page' ? (
                displayItem.type === 'story' && (
                  <div className="mt-3 font-sans">
                    <div className="flex flex-wrap items-center justify-between text-sm gap-2 text-[#8a8272] border-t border-black/5 pt-3">
                      <div>
                        {formatPageDate(displayItem.created)} by Herb
                      </div>
                    </div>
                  </div>
                )
              ) : !isStop ? (
                <div className="mt-3 font-sans">
                  <div className="flex flex-wrap items-center justify-between text-sm gap-2 text-[#8a8272] border-t border-black/5 pt-3">
                    <div>
                      {tripStops.length > 0 ? `${formatStopDateOnly(tripStops[0].arrival_date || tripStops[0].created)} to ${formatStopDateOnly(tripStops[tripStops.length-1].arrival_date || tripStops[tripStops.length-1].created)} by ${getTripAuthor(displayItem)}` : (yr ? `${yr} by ${getTripAuthor(displayItem)}` : `by ${getTripAuthor(displayItem)}`)}
                    </div>
                    <Link href={getTripRegionInfo(displayItem.slug).href} className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline font-medium transition-colors">
                      {getTripRegionInfo(displayItem.slug).label}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-3 font-sans">
                  <div className="flex flex-wrap items-center justify-between text-sm gap-2 text-[#8a8272]">
                    <div>
                      {formatStopDate(displayItem.arrival_date || displayItem.created)}
                      {displayItem.author ? ` by ${displayItem.author}` : ' by Lolo'}
                    </div>
                    {(displayItem.state || displayItem.category) && (
                      <div className="flex items-center gap-2 text-[#c1593a] font-medium">
                        {displayItem.state && (
                          <Link href={`/state/${displayItem.state.toLowerCase()}?from=${displayItem.slug}`} className="hover:text-[#a54a2f] hover:underline transition-colors">
                            {displayItem.state}
                          </Link>
                        )}
                        {displayItem.state && displayItem.category && (
                          <span className="text-[#a89e8a]">|</span>
                        )}
                        {displayItem.category && (
                          <Link href={`/category/${slugifyCategory(displayItem.category)}?from=${displayItem.slug}`} className="hover:text-[#a54a2f] hover:underline transition-colors">
                            {displayItem.category}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Travelogue with Integrated Lightbox & Pagination */}
            <InteractiveTravelogue
              htmlContent={cleanedHtml}
              photos={displayPhotos}
              albumTitle={displayTitle}
              isTrip={displayItem.itemType === 'trip'}
              use35mmSlides={false}
            />

            {/* Trip overviews end with a hand-off into the trip itself, so the
                reader can start at the first stop instead of hunting for the
                itinerary. Derived from the arrival-sorted stops, so it stays
                correct as stops are added or reordered; omitted for the odd
                trip that has no stops. */}
            {displayItem.itemType === 'trip' && tripStops.length > 0 && (
              <p className="mt-8 text-lg text-[#2e2c26] clear-both font-sans">
                Let&apos;s hit the road to{' '}
                <Link
                  href={`/${tripStops[0].slug}`}
                  className="text-[#c1593a] font-semibold hover:underline"
                >
                  {cleanTitle(tripStops[0].title)}
                </Link>
                {' '}&rarr;
              </p>
            )}

            {/* Prev/Next Navigation at Bottom of Trip Stop Page per User Request */}
            {isStop && tripStops.length > 0 && (
              <div className="mt-12 pt-8 border-t border-black/10 flex items-center justify-between text-base font-normal clear-both font-sans">
                <div>
                  {prevStop ? (
                    <Link
                      href={`/${prevStop.slug}`}
                      className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline transition-colors no-underline font-medium"
                    >
                      &lt; previous
                    </Link>
                  ) : (
                    <span className="invisible">&lt; previous</span>
                  )}
                </div>
                <div className="text-[#5c5648] font-medium text-base"></div>
                <div>
                  {nextStop ? (
                    <Link
                      href={`/${nextStop.slug}`}
                      className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline transition-colors no-underline font-medium"
                    >
                      next &gt;
                    </Link>
                  ) : (
                    <span className="invisible">next &gt;</span>
                  )}
                </div>
              </div>
            )}
          </article>
        </main>

        {/* RIGHT SIDEBAR: What We Did Activity Log (Fixed Width) */}
        {relevantActivities.length > 0 && (
          <aside className="trip-right-sidebar-column shrink-0 glass-sidebar p-5 sticky top-20">
            <div className="border-b border-[#c1593a]/30 pb-3 mb-4">
              <h3 className="text-lg font-bold text-[#3f5c4c] m-0">
                What we did...
              </h3>
            </div>

            <div className="sidebar-list space-y-3">
              {relevantActivities.map((act, idx) => {
                const actTitle = cleanTitle(act.title || "Highlight");
                const actText = act.narrative || "";
                const actType = act.activity_type || "Highlight";
                const actSlug = actType.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

                // The whole card is the link — it already lifts on hover, so
                // the type label is a span rather than a nested anchor.
                // Activity narratives carry no links of their own.
                return (
                  <Link
                    key={act.nid || idx}
                    href={`/activities/${actSlug}?from=${displayItem.slug}`}
                    aria-label={`${actTitle} — see all ${actType} activities`}
                    className="group glass-card block p-3.5 border-l-4 border-l-[#c1593a]/80 no-underline"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#c1593a] group-hover:text-[#a54a2f] transition-colors">
                        {actType}
                      </span>
                    </div>
                    <h4 className="font-bold text-[#2e2c26] text-sm mt-1 mb-1.5 m-0 leading-snug">
                      {actTitle}
                    </h4>
                    {actText && (
                      <div
                        className="text-xs text-[#5c5648] leading-relaxed mt-1.5 border-t border-black/10 pt-1.5 [&>*:last-child]:mb-0"
                        dangerouslySetInnerHTML={{ __html: cleanDrupalContent(actText, photoTitles) }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
