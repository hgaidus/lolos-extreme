import fs from "fs";
import path from "path";
import Link from "next/link";
import { cleanDrupalContent } from "@/utils/cleanContent";
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

export default async function ActivityTypePage({ params }) {
  const { type } = await params;
  const activities = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "activities.json"), "utf-8"));
  const stops = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "stops.json"), "utf-8"));
  const trips = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "trips.json"), "utf-8"));
  const photoTitles = fs.existsSync(path.join(DATA_DIR, "photo_titles.json"))
    ? JSON.parse(fs.readFileSync(path.join(DATA_DIR, "photo_titles.json"), "utf-8"))
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

  return (
    <div className="w-full pb-16">
      {/* Header Banner */}
      <section className="relative overflow-hidden py-12 px-6 rounded-3xl mb-8 text-center bg-gradient-to-r from-amber-900/40 via-slate-900/60 to-amber-900/40 border border-amber-500/30 shadow-2xl">
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="inline-block py-1 px-3.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold tracking-wider uppercase mb-3">
            ⭐ Activity Category Archive
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md m-0">
            {displayTypeName} Activities
          </h1>
          <p className="text-sm md:text-base text-gray-300 mt-2 max-w-2xl mx-auto">
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
                <div key={act.nid || idx} className="glass-card p-6 border-l-4 border-l-amber-500/80 hover:border-l-amber-400 transition-all shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                      🎯 {displayTypeName}
                    </span>
                    {rating && (
                      <span className="text-sm text-amber-300 font-bold tracking-widest bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30" title={`Rating: ${rating}`}>
                        {rating}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg md:text-xl font-bold text-white mb-2 m-0 leading-snug">
                    {actTitle}
                  </h3>

                  {actText && (
                    <div 
                      className="text-sm text-gray-200 leading-relaxed mb-4 prose prose-invert max-w-none flow-root"
                      dangerouslySetInnerHTML={{ __html: cleanDrupalContent(actText, photoTitles) }}
                    />
                  )}


                  {/* Clickable Link Back to Parent Stop */}
                  {stop && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/20 -mx-6 -mb-6 p-4 rounded-b-xl">
                      <div className="text-xs text-gray-300">
                        <span className="text-gray-400">Logged at stop:</span>{" "}
                        <strong className="text-white">{cleanTitle(stop.title)}</strong>
                        {trip && <span className="text-gray-400"> ({cleanTitle(trip.title)})</span>}
                      </div>
                      <Link
                        href={`/${stop.slug}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-amber-500/20 transition-all"
                      >
                        🚐 View Stop &amp; Photos →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="glass-card p-12 text-center text-gray-400">
              <p className="text-base italic">No activities found matching category "{displayTypeName}".</p>
            </div>
          )}
        </div>

        {/* Right Sidebar: All Activity Categories */}
        <aside className="w-full lg:w-80 glass-sidebar p-5 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin shrink-0">
          <div className="border-b border-amber-500/30 pb-3 mb-4">
            <span className="text-[11px] uppercase tracking-wider text-amber-400 font-extrabold block">
              🏷️ Filter by Type
            </span>
            <h3 className="text-base font-bold text-white mt-1 m-0">
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
                  href={`/activities/${slug}`}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="truncate pr-2">{name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${isCurrent ? "bg-slate-950/20 text-slate-950 font-black" : "bg-white/10 text-amber-400"}`}>
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
