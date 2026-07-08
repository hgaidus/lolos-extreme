import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import InteractiveTravelogue from '@/components/InteractiveTravelogue';
import { cleanDrupalContent } from '@/utils/cleanContent';
import { DATA_DIR } from '@/lib/dataPaths';
import { photoFileExists } from '@/lib/photoExists';

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
  return {
    title: `${title} | Lolo's Extreme Cross Country RV Trips`,
    description: `Read Lolo and Herb's historical RV travelogue for ${title}.`,
  };
}

function cleanTitle(str = "") {
  return str.replace(/\[img_assist[^\]]*\]/gi, "").trim();
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

function getTripMapUrl(trip, photoTitles = []) {
  if (!trip) return null;
  const slug = (trip.slug || "").toLowerCase();
  const yr = (trip.title || trip.slug || "").match(/\b(19\d\d|20\d\d)\b/)?.[1] || String(trip.year || "");

  // Exact / special keyword matches first
  if (slug.includes("galapagos")) return "/photos/8k/galapagos-map.gif";
  if (slug.includes("iceland")) return "/photos/8k/Iceland.gif";
  if (slug.includes("lost-coast")) return "/photos/8k/Lost-Coast.gif";
  if (slug.includes("new-zealand")) return "/photos/8k/New-Zealand.gif";
  if (slug.includes("spain")) return "/photos/8k/Spain.gif";
  if (slug.includes("baja")) return "/photos/8k/baja_map.gif";
  if (slug.includes("greece")) return "/photos/8k/International-greece.gif";
  if (slug.includes("oregon")) return "/photos/8k/oregon.gif";
  if (slug.includes("thailand")) return "/photos/7k/Thailand-Route.gif";
  if (slug.includes("kauai") || slug.includes("maui") || slug.includes("hawaii") || slug.includes("colorado-river-rafting")) return "/photos/8k/Hawaii-2024.gif";
  if (slug.includes("vancouver") || slug.includes("utah-road") || slug.includes("yosemite-fall-2023")) return "/photos/8k/2023-8-14-Vancouver.gif";
  if (slug.includes("martha") || slug.includes("vineyard") || slug.includes("vermont") || yr === "1998") return "/photos/4k/cc2008.gif";
  if (slug.includes("burning")) return "/photos/8k/BRC map.png";
  if (slug.includes("carmel") || slug.includes("big-sur")) return "/photos/8k/2021-Carmel.gif";
  if (slug.includes("mojave")) return "/photos/7k/20181016-mojave.gif";
  if (slug.includes("totality") || slug.includes("eclipse")) return "/photos/8k/oregon.gif";
  
  // Specific multi-trip years
  if (slug === "2013-cross-country-road-trip") return "/photos/4k/cc2013a.gif";
  if (slug.includes("2013-yosemite")) return "/photos/5k/cc2013b.gif";
  if (slug.includes("2013-pacific-northwest")) return "/photos/5k/cc2013c.gif";

  if (slug.includes("2014-pacific-northwest")) return "/photos/5k/cc2014a.gif";
  if (slug.includes("2014-yosemite")) return "/photos/5k/cc2014b.gif";
  if (slug.includes("2014-southwest")) return "/photos/5k/cc2014c.gif";

  if (slug.includes("2015-seattle")) return "/photos/6k/cc2015b.gif";
  if (slug.includes("2015-yosemite-and-northern")) return "/photos/6k/cc2015c.gif";
  if (slug.includes("2015-yosemite-thanksgiving")) return "/photos/6k/cc2015d.gif";
  if (slug.includes("2015-christmas")) return "/photos/6k/cc2015e.gif";
  if (slug.includes("2015-herb") || slug.includes("2015-solo")) return "/photos/6k/cc2015f.gif";

  if (slug.includes("2016-yosemite-eastern") || slug.includes("2016-yosemite-and-pinnacles")) return "/photos/6k/cc2016b.gif";
  if (slug.includes("2016-christmas")) return "/photos/6k/cc2016d.gif";
  if (slug.includes("2016-bringing-boat")) return "/photos/6k/cc2016e.gif";

  if (slug.includes("2017-death-valley") || slug.includes("2017-southern-california")) return "/photos/6k/cc2017a.gif";
  if (slug.includes("2017-european") || slug.includes("2017-4wd")) return "/photos/6k/cc2017b.gif";

  if (slug.includes("2018-tuolumne") || slug.includes("2018-yosemite")) return "/photos/7k/20180822-tuolumne.gif";
  if (slug.includes("2018-trinity")) return "/photos/7k/20180925-trinity.gif";
  if (slug.includes("2018-outlaws") || slug.includes("2018-eastern-sierra")) return "/photos/7k/20181007-outlaws.gif";
  if (slug.includes("2018-mojave")) return "/photos/7k/20181016-mojave.gif";
  if (slug.includes("2018-lake-powell")) return "/photos/7k/20180701-powell.gif";

  if (slug.includes("2019-baja")) return "/photos/8k/baja_map.gif";
  if (slug.includes("2019-spain")) return "/photos/8k/Spain.gif";
  if (slug.includes("2019-central")) return "/photos/8k/oregon.gif";
  if (slug.includes("2019-shasta")) return "/photos/8k/2019-07-07-Shasta.gif";
  if (slug.includes("2019-yosemite")) return "/photos/8k/2019-08-14-yosemite.gif";
  if (slug.includes("2019")) return "/photos/8k/north_america_map_2019-04_final_.gif";

  if (slug.includes("2020-powell") || slug.includes("2020-eastern-sierra") || slug.includes("2020-bishop")) return "/photos/8k/cc2020-powell.gif";
  if (slug.includes("2020-yosemite")) return "/photos/8k/2020-yosemite_0.gif";

  if (slug.includes("2021")) return "/photos/8k/2021-10-26-yosemite.gif";

  // 2022 specific matches
  if (slug.includes("capitola") || slug.includes("pescadero")) return "/photos/8k/2022-capitola.gif";
  if (slug.includes("san-diego") || slug.includes("anza") || slug.includes("joshua")) return "/photos/8k/2022-sandiego-anza.gif";
  if (slug.includes("arizona") || slug.includes("new-mexico") || slug.includes("bisti")) return "/photos/8k/north_america_map_2022bisti_.gif";

  // Standard single year cross country maps
  if (yr === "1999") return "/photos/cc1999s.gif";
  if (yr === "2000") return "/photos/cc2000s.gif";
  if (yr === "2001") return "/photos/cc2001s.gif";
  if (yr === "2002") return "/photos/cc2002s.gif";
  if (yr === "2003") return "/photos/cc2003s.gif";
  if (yr === "2004") return "/photos/cc2004s.gif";
  if (yr === "2005") return "/photos/cc2005s.gif";
  if (yr === "2006") return "/photos/cc2006s.gif";
  if (yr === "2007") return "/photos/cc2007s.gif";
  if (yr === "2008") return "/photos/4k/cc2008.gif";
  if (yr === "2009") return "/photos/4k/cc2009s.gif";
  if (yr === "2010") return "/photos/4k/cc2010s.gif";
  if (yr === "2011") return "/photos/4k/cc2011s.gif";
  if (yr === "2012") return "/photos/4k/cc2012.gif";

  // Dynamic fallback for any other year/trip match in photoTitles
  if (yr && photoTitles && photoTitles.length > 0) {
    const found = photoTitles.filter(p => (p.filename || "").toLowerCase().endsWith(".gif") && (p.filename || "").includes(yr));
    if (found.length > 0) {
      found.sort((a, b) => (a.filename || "").localeCompare(b.filename || ""));
      return `/photos/${found[0].filename}`;
    }
  }

  return "/photos/8k/north_america_map_2019-04_final_.gif";
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
    const photoTitles = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "photo_titles.json"), "utf-8"));
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
  const pages = allPages.filter(p => !((p.slug || '').toLowerCase() === 'tips' || (p.slug || '').toLowerCase().startsWith('tips/')));
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

export default async function CatchAllPage({ params }) {
  const { slug } = await params;
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

  if (displayItem.itemType === 'state_listing' || displayItem.itemType === 'category_listing') {
    const matchingStops = displayItem.itemType === 'state_listing'
      ? stops.filter(s => s.state && (s.state.toUpperCase() === displayItem.stateCode || s.state === displayItem.stateCode)).sort((a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title)))
      : stops.filter(s => s.category && s.category === displayItem.categoryName).sort((a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title)));

    return (
      <div className="w-full max-w-6xl mx-auto min-w-0 py-6 px-4 sm:px-6 font-sans">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#d97706] mb-6 font-sans">
          {displayItem.title}
        </h1>
        <div className="glass-panel overflow-hidden border border-amber-500/30 rounded-lg shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse font-sans">
              <thead>
                <tr className="bg-[#14532d] text-white border-b border-amber-500/30">
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Stop Name</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Trip Name</th>
                  <th className="py-3.5 px-3 text-center font-bold uppercase tracking-wider text-xs whitespace-nowrap w-20">State</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Stop Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-[#07130d]/80">
                {matchingStops.length > 0 ? (
                  matchingStops.map((stop, idx) => {
                    const parentTrip = trips.find(t => String(t.nid) === String(stop.parent_trip_nid));
                    const catSlug = stop.category ? slugifyCategory(stop.category) : '';
                    return (
                      <tr key={stop.nid || idx} className={idx % 2 === 0 ? "bg-white/5 hover:bg-white/10 transition-colors" : "bg-transparent hover:bg-white/10 transition-colors"}>
                        <td className="py-3 px-4 font-semibold">
                          <Link href={`/${stop.slug}`} className="text-[#38bdf8] hover:text-sky-300 hover:underline">
                            {cleanTitle(stop.title)}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          {parentTrip ? (
                            <Link href={`/${parentTrip.slug}`} className="text-[#38bdf8] hover:text-sky-300 hover:underline">
                              {cleanTitle(parentTrip.title)}
                            </Link>
                          ) : '--'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold whitespace-nowrap">
                          {stop.state ? (
                            <Link href={`/state/${stop.state.toLowerCase()}`} className="text-[#38bdf8] hover:text-sky-300 hover:underline">
                              {stop.state}
                            </Link>
                          ) : '--'}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {stop.category ? (
                            <Link href={`/category/${catSlug}`} className="text-[#38bdf8] hover:text-sky-300 hover:underline">
                              {stop.category}
                            </Link>
                          ) : '--'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-400">No stops found.</td>
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
  } else if (displayItem.description && displayItem.travelogue && displayItem.description !== displayItem.travelogue) {
    rawText = displayItem.travelogue + `\n\n<hr />\n\n<div class="trip-description-box bg-[#0c1d15]/80 border-l-4 border-amber-500 rounded text-amber-200/90 italic font-medium leading-relaxed">${displayItem.description}</div>`;
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

  if (displayItem.itemType === 'trip') {
    currentTrip = displayItem;
    tripStops = stops.filter(s => String(s.parent_trip_nid) === String(displayItem.nid));
    relevantActivities = [];
  } else if (displayItem.itemType === 'stop') {
    currentTrip = trips.find(t => String(t.nid) === String(displayItem.parent_trip_nid));
    if (currentTrip) {
      tripStops = stops.filter(s => String(s.parent_trip_nid) === String(currentTrip.nid));
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

  return (
    <div className="w-full">
      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex gap-2 items-center text-sm flex-wrap">
        <Link href="/" className="text-amber-400 font-semibold hover:underline">Home</Link>
        <span className="text-gray-500">/</span>
        {currentTrip && displayItem.itemType === 'stop' && (
          <>
            <Link href={`/${currentTrip.slug}`} className="text-amber-400 font-semibold hover:underline">
              {cleanTitle(currentTrip.title)}
            </Link>
            <span className="text-gray-500">/</span>
          </>
        )}
        <span className="text-gray-300 font-medium truncate">{displayTitle}</span>
      </div>

      {/* Unified 3-Column Layout: Fixed Left & Right Sidebars, Fluid Center Content */}
      <div className="trip-page-layout flex flex-row gap-4 sm:gap-6 lg:gap-8 items-start w-full">
        {/* LEFT SIDEBAR: Route Map & Itinerary Table (Fixed Width) - ONLY FOR TRIPS, STOPS, AND ABOUT US */}
        {(displayItem.itemType === 'trip' || displayItem.itemType === 'stop' || displayItem.slug === 'about-lolo-and-herb' || String(displayItem.nid) === '2') && (
          <aside 
            className={`${displayItem.itemType === 'trip' ? 'trip-overview-sidebar-column' : 'trip-sidebar-column'} shrink-0 glass-sidebar p-3 sm:p-4 md:p-5 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin`}
          >
            <div>
              {/* About Lolo & Herb Sidebar Photo per Original Drupal Site */}
              {(displayItem.slug === 'about-lolo-and-herb' || String(displayItem.nid) === '2') ? (
                <div className="trip-sidebar-map-box text-center bg-[#0a1c13] p-3 rounded-lg border border-amber-500/30 font-sans mb-4">
                  <img 
                    src="/photos/HL_Yosemite.jpg" 
                    alt="Herb and Lolo Backpacking in Yosemite circa 1986" 
                    title="Herb and Lolo Backpacking in Yosemite circa 1986"
                    className="w-full h-auto rounded shadow-md border border-white/10 mx-auto"
                  />
                  <div className="mt-2.5 text-xs text-amber-200/90 font-medium leading-relaxed">
                    <strong>Herb and Lolo Backpacking in Yosemite circa 1986</strong>
                  </div>
                </div>
              ) : (
                <>
                  {/* Route Map Image - ONLY ON TRIP OVERVIEWS THAT HAVE A ROUTE MAP */}
                  {displayItem.itemType === 'trip' && getTripMapUrl(displayItem, photoTitles) && (
                    <div className="trip-sidebar-map-box">
                      <img 
                        src={getTripMapUrl(displayItem, photoTitles)} 
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
                      <div className="bg-[#14532d] text-white font-bold p-2.5 text-xs uppercase tracking-wider text-center border-b border-amber-500/30">
                        {currentTrip ? cleanTitle(currentTrip.title) : displayTitle} Itinerary
                      </div>
                      <div className="overflow-x-auto">
                        {isStop ? (
                          <table className="w-full text-left text-xs border-collapse font-sans">
                            <tbody className="divide-y divide-white/5">
                              {tripStops.length > 0 ? (
                                tripStops.map((stop, idx) => {
                                  const isCurrentStop = String(stop.nid) === String(displayItem.nid);
                                  return (
                                    <tr key={stop.nid || idx} className={isCurrentStop ? "bg-amber-500/25 font-bold text-amber-300" : (idx % 2 === 0 ? "bg-white/5 hover:bg-white/10 transition-colors" : "bg-transparent hover:bg-white/10 transition-colors")}>
                                      <td className="py-2.5 px-3 font-medium">
                                        <Link href={`/${stop.slug}`} className={`${isCurrentStop ? 'text-amber-300 font-extrabold underline' : 'text-[#38bdf8] hover:underline no-underline'} block truncate`}>
                                          {cleanTitle(stop.title)}
                                        </Link>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td className="py-6 text-center text-gray-400">No stops logged.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse font-sans table-fixed">
                            <thead>
                              <tr className="bg-[#0a1c13] text-amber-400 border-b border-white/10">
                                <th className="py-2.5 px-2 text-center w-[26px] font-bold whitespace-nowrap">#</th>
                                <th className="py-2.5 px-2 font-bold">Itinerary</th>
                                <th className="py-2.5 px-1 text-center w-[38px] font-bold whitespace-nowrap">State</th>
                                <th className="py-2.5 px-1 text-right w-[44px] font-bold whitespace-nowrap">Miles</th>
                                <th className="py-2.5 px-2 text-right w-[46px] font-bold whitespace-nowrap">Hours</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {tripStops.length > 0 ? (
                                tripStops.map((stop, idx) => {
                                  return (
                                    <tr key={stop.nid || idx} className={idx % 2 === 0 ? "bg-white/5 hover:bg-white/10 transition-colors" : "bg-transparent hover:bg-white/10 transition-colors"}>
                                      <td className="py-2.5 px-2 text-center font-bold text-gray-400 whitespace-nowrap">{idx + 1}</td>
                                      <td className="py-2.5 px-2 font-medium">
                                        <Link href={`/${stop.slug}`} className="text-[#38bdf8] hover:underline no-underline block truncate max-w-[240px]">
                                          {cleanTitle(stop.title)}
                                        </Link>
                                      </td>
                                      <td className="py-2.5 px-1 text-center font-semibold text-gray-300 whitespace-nowrap">{stop.state || '--'}</td>
                                      <td className="py-2.5 px-1 text-right text-gray-300 whitespace-nowrap">{stop.miles ?? '--'}</td>
                                      <td className="py-2.5 px-2 text-right text-gray-300 whitespace-nowrap">{stop.hours ?? '--'}</td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan="5" className="py-6 text-center text-gray-400">No stops logged.</td>
                                </tr>
                              )}
                            </tbody>
                            {tripStops.length > 0 && (
                              <tfoot>
                                <tr className="bg-[#14532d]/90 text-white font-bold border-t border-amber-500/30">
                                  <td colSpan="2" className="py-2.5 px-2 text-right uppercase tracking-wider text-[11px] whitespace-nowrap">Total: {tripStops.length} Stops</td>
                                  <td className="py-2.5 px-1 text-center whitespace-nowrap">--</td>
                                  <td className="py-2.5 px-1 text-right text-amber-300 whitespace-nowrap">
                                    {tripStops.reduce((acc, s) => acc + (Number(s.miles) || 0), 0)}
                                  </td>
                                  <td className="py-2.5 px-2 text-right text-amber-300 whitespace-nowrap">
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
          <article className="glass-panel p-6 md:p-8 mb-8">
            <div className="border-b border-white/10 pb-5 mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-white m-0">
                {displayTitle}{isStop && displayItem.state && !displayTitle.includes(displayItem.state) ? `, ${displayItem.state}` : ''}
              </h1>
              {!isStop ? (
                <div className="mt-3 font-sans">
                  <div className="flex flex-wrap items-center justify-between text-sm gap-2 text-gray-400 border-t border-white/5 pt-3">
                    <div>
                      {tripStops.length > 0 ? `${formatStopDateOnly(tripStops[0].arrival_date || tripStops[0].created)} to ${formatStopDateOnly(tripStops[tripStops.length-1].arrival_date || tripStops[tripStops.length-1].created)} by Lolo` : (yr ? `${yr} by Lolo` : 'by Lolo')}
                    </div>
                    <Link href="/cross-country-road-trip" className="text-sky-400 hover:text-sky-300 hover:underline font-medium transition-colors">
                      Cross Country Road Trip
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-3 font-sans">
                  <div className="flex flex-wrap items-center justify-between text-sm gap-2 text-gray-400">
                    <div>
                      {formatStopDate(displayItem.arrival_date || displayItem.created)}
                      {displayItem.author ? ` by ${displayItem.author}` : ' by Lolo'}
                    </div>
                    {(displayItem.state || displayItem.category) && (
                      <div className="flex items-center gap-2 text-[#38bdf8] font-medium">
                        {displayItem.state && (
                          <Link href={`/state/${displayItem.state.toLowerCase()}`} className="hover:text-sky-300 hover:underline transition-colors">
                            {displayItem.state}
                          </Link>
                        )}
                        {displayItem.state && displayItem.category && (
                          <span className="text-gray-500">|</span>
                        )}
                        {displayItem.category && (
                          <Link href={`/category/${slugifyCategory(displayItem.category)}`} className="hover:text-sky-300 hover:underline transition-colors">
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

            {/* Prev/Next Navigation at Bottom of Trip Stop Page per User Request */}
            {isStop && tripStops.length > 0 && (
              <div className="mt-12 pt-8 border-t border-white/10 flex items-center justify-between text-base font-normal clear-both font-sans">
                <div>
                  {prevStop ? (
                    <Link
                      href={`/${prevStop.slug}`}
                      className="text-[#38bdf8] hover:underline transition-colors no-underline font-medium"
                    >
                      &lt; previous
                    </Link>
                  ) : (
                    <span className="invisible">&lt; previous</span>
                  )}
                </div>
                <div className="text-gray-200 font-medium text-base"></div>
                <div>
                  {nextStop ? (
                    <Link
                      href={`/${nextStop.slug}`}
                      className="text-[#38bdf8] hover:underline transition-colors no-underline font-medium"
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
          <aside className="trip-right-sidebar-column shrink-0 glass-sidebar p-5 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin">
            <div className="border-b border-amber-500/30 pb-3 mb-4">
              <span className="text-[11px] uppercase tracking-wider text-amber-400 font-extrabold block">
                ⭐ Activity Log
              </span>
              <h3 className="text-base font-bold text-white mt-1 m-0">
                What we did...
              </h3>
            </div>

            <div className="sidebar-list space-y-3">
              {relevantActivities.map((act, idx) => {
                const actTitle = cleanTitle(act.title || "Highlight");
                const actText = act.narrative || "";
                const actType = act.activity_type || "Highlight";
                const actSlug = actType.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                const rating = act.rating || "";

                return (
                  <div key={act.nid || idx} className="glass-card p-3.5 border-l-4 border-l-amber-500/80">
                    <div className="flex items-center justify-between mb-1">
                      <Link
                        href={`/activities/${actSlug}`}
                        className="text-xs font-extrabold uppercase tracking-wider text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                      >
                        {actType}
                      </Link>
                      {rating && (
                        <span className="text-xs text-amber-300 font-bold tracking-widest" title={`Rating: ${rating}`}>
                          {rating}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-sm mt-1 mb-1.5 m-0 leading-snug">
                      {actTitle}
                    </h4>
                    {actText && (
                      <div 
                        className="text-xs text-gray-200 leading-relaxed mt-1.5 border-t border-white/10 pt-1.5"
                        dangerouslySetInnerHTML={{ __html: cleanDrupalContent(actText, photoTitles) }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
