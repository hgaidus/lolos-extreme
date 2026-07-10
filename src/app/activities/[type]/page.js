import fs from "fs";
import path from "path";
import Link from "next/link";
import { cleanDrupalContent, unescapeDrupalText } from "@/utils/cleanContent";
import { DATA_DIR } from "@/lib/dataPaths";

function cleanTitle(str = "") {
  return str.replace(/\[img_assist[^\]]*\]/gi, "").trim();
}

export async function generateStaticParams() {
  const activitiesPath = path.join(DATA_DIR, "activities.json");
  if (!fs.existsSync(activitiesPath)) return [];

  const activities = JSON.parse(fs.readFileSync(activitiesPath, "utf-8"));
  const typesSet = new Set();

  activities.forEach(act => {
    if (act.activity_type) {
      const slug = act.activity_type.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (slug) typesSet.add(slug);
    }
  });

  return Array.from(typesSet).map(type => ({ type }));
}

export default async function ActivityTypePage({ params, searchParams }) {
  const { type } = await params;
  const { from } = await searchParams;
  const activities = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "activities.json"), "utf-8"));
  const stops = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "stops.json"), "utf-8"));
  const trips = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "trips.json"), "utf-8"));
  const photoTitles = fs.existsSync(path.join(DATA_DIR, "photo_titles.json"))
    ? JSON.parse(fs.readFileSync(path.join(DATA_DIR, "photo_titles.json"), "utf-8"))
        .map(p => ({ ...p, title: unescapeDrupalText(p.title) }))
    : [];

  // Build lookup maps
  const stopMap = {};
  stops.forEach(s => stopMap[String(s.nid)] = s);
  const tripMap = {};
  trips.forEach(t => tripMap[String(t.nid)] = t);

  // Count all activity types for the sidebar filter
  const typeCounts = {};
  const typeNames = {};
  activities.forEach(act => {
    const t = act.activity_type || "Other";
    const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) return;
    typeCounts[slug] = (typeCounts[slug] || 0) + 1;
    typeNames[slug] = t;
  });

  // Sort activity types by frequency descending
  const sortedTypes = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]);

  // Filter matching activities
  const matchingActivities = activities.filter(act => {
    const slug = (act.activity_type || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return slug === type.toLowerCase();
  });

  const displayTypeName = typeNames[type.toLowerCase()] || type.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  // If we arrived here from a stop's activity badge, show that stop as a
  // middle breadcrumb segment so it's easy to navigate back to it.
  const originStop = from ? stops.find(s => s.slug === from) : null;

  return (
    <div className="w-full pb-16">
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
        <span className="text-[#5c5648] font-medium truncate">{displayTypeName} Activities</span>
      </div>
      {/* Header Banner */}
      <section className="relative overflow-hidden py-12 px-6 rounded-3xl mb-8 text-center bg-gradient-to-r from-[#7c9880]/20 via-[#faf6ee] to-[#c1593a]/15 border border-[#c1593a]/30 shadow-xl">
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="inline-block py-1 px-3.5 rounded-full bg-[#c1593a]/15 text-[#a54a2f] border border-[#c1593a]/35 text-xs font-bold tracking-wider uppercase mb-3">
            ⭐ Activity Category Archive
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-[#2e2c26] tracking-tight m-0">
            {displayTypeName} Activities
          </h1>
          <p className="text-sm md:text-base text-[#6b6459] mt-2 max-w-2xl mx-auto">
            Showing {matchingActivities.length} {displayTypeName.toLowerCase()} activities logged during our motorhome cross-country adventures.
          </p>
        </div>
      </section>

      {/* Main Grid Layout: Activities List + Category Sidebar */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Side: Activity Cards */}
        <div className="flex-1 w-full space-y-6">
          {matchingActivities.length > 0 ? (
            matchingActivities.map((act, idx) => {
              const stop = stopMap[String(act.parent_stop_nid)];
              const trip = stop ? tripMap[String(stop.parent_trip_nid)] : null;
              const actTitle = cleanTitle(act.title || displayTypeName);
              const actText = act.narrative || "";
              const rating = act.rating || "";

              return (
                <div key={act.nid || idx} className="glass-card p-6 border-l-4 border-l-[#c1593a]/80 hover:border-l-[#a54a2f] transition-all shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-3 mb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#c1593a]">
                      🎯 {displayTypeName}
                    </span>
                    {rating && (
                      <span className="text-sm text-[#c1593a] font-bold tracking-widest bg-[#c1593a]/10 px-2.5 py-0.5 rounded border border-[#c1593a]/30" title={`Rating: ${rating}`}>
                        {rating}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg md:text-xl font-bold text-[#2e2c26] mb-2 m-0 leading-snug">
                    {actTitle}
                  </h3>

                  {actText && (
                    <div
                      className="text-sm text-[#4a4437] leading-relaxed mb-4 max-w-none flow-root"
                      dangerouslySetInnerHTML={{ __html: cleanDrupalContent(actText, photoTitles) }}
                    />
                  )}


                  {/* Clickable Link Back to Parent Stop */}
                  {stop && (
                    <div className="mt-4 pt-3 border-t border-black/10 flex flex-wrap items-center justify-between gap-3 bg-black/[0.03] -mx-6 -mb-6 p-4 rounded-b-xl">
                      <div className="text-xs text-[#6b6459]">
                        <span className="text-[#8a8272]">Logged at stop:</span>{" "}
                        <strong className="text-[#2e2c26]">{cleanTitle(stop.title)}</strong>
                        {trip && <span className="text-[#8a8272]"> ({cleanTitle(trip.title)})</span>}
                      </div>
                      <Link
                        href={`/${stop.slug}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#c1593a] hover:bg-[#a54a2f] text-[#faf6ee] font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-[#c1593a]/20 transition-all"
                      >
                        🚐 View Stop &amp; Photos →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="glass-card p-12 text-center text-[#8a8272]">
              <p className="text-base italic">No activities found matching category &quot;{displayTypeName}&quot;.</p>
            </div>
          )}
        </div>

        {/* Right Sidebar: All Activity Categories */}
        <aside className="w-full lg:w-80 glass-sidebar p-5 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin shrink-0">
          <div className="border-b border-[#c1593a]/30 pb-3 mb-4">
            <span className="text-[11px] uppercase tracking-wider text-[#c1593a] font-extrabold block">
              🏷️ Filter by Type
            </span>
            <h3 className="text-base font-bold text-[#2e2c26] mt-1 m-0">
              All Activity Types
            </h3>
          </div>

          <div className="space-y-1.5">
            {sortedTypes.map(slug => {
              const isCurrent = slug === type.toLowerCase();
              const name = typeNames[slug] || slug;
              const count = typeCounts[slug];
              return (
                <Link
                  key={slug}
                  href={originStop ? `/activities/${slug}?from=${originStop.slug}` : `/activities/${slug}`}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-[#7c9880] text-white shadow-md shadow-[#7c9880]/25"
                      : "text-[#5c5648] hover:bg-[#c1593a]/8 hover:text-[#2e2c26]"
                  }`}
                >
                  <span className="truncate pr-2">{name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${isCurrent ? "bg-white/25 text-white font-black" : "bg-black/5 text-[#c1593a]"}`}>
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </aside>

      </div>
    </div>
  );
}
