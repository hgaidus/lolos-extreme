import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cleanDrupalContent, unescapeDrupalText } from "@/utils/cleanContent";
import { DATA_DIR } from "@/lib/dataPaths";
import { isActivityLive } from "@/lib/liveContent";
import { legacyTarget } from "@/lib/legacyRedirects";
import { getDataVersion, makeVersioned } from "@/lib/dataVersion";
import OriginBreadcrumb from "@/components/OriginBreadcrumb";

// This page used to be dynamic only as a side effect of reading searchParams
// (for the old ?from= breadcrumb). With that gone, generateStaticParams below
// would have it prerendered at build time and a CMS edit would not show up
// until the next deploy. Stated explicitly so the ~2s freshness window the rest
// of the site relies on is not something a future edit can remove by accident.
export const dynamic = 'force-dynamic';

function cleanTitle(str = "") {
  return str.replace(/\[img_assist[^\]]*\]/gi, "").trim();
}

// The one place an activity_type string becomes a URL segment. sitemap.js
// mirrors this — the two must agree or the sitemap advertises 404s.
function slugifyType(t) {
  return String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// slug -> { name, count } across published activities, for generateMetadata.
// Versioned so a CMS publish/unpublish shows up within the same ~2s window as
// the rest of the site, without re-parsing activities.json on every request.
const publishedTypeIndex = makeVersioned(() => {
  const index = {};
  try {
    const activities = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "activities.json"), "utf-8"));
    for (const act of activities) {
      if (!isActivityLive(act)) continue;
      const slug = slugifyType(act.activity_type);
      if (!slug) continue;
      if (!index[slug]) index[slug] = { name: act.activity_type, count: 0 };
      index[slug].count += 1;
    }
  } catch {
    // Missing/unreadable data file — fall through to empty, same as the page.
  }
  return index;
}, getDataVersion);

// Without this these 47 pages inherited the root layout's metadata wholesale:
// the generic site title AND a canonical pointing at the homepage, which told
// Google every activity listing was a duplicate of "/".
export async function generateMetadata({ params }) {
  const { type } = await params;
  const key = String(type).toLowerCase();
  const entry = publishedTypeIndex.get()[key];
  // No published activities of this type — the page calls notFound() below, so
  // there is nothing worth describing.
  if (!entry) return {};
  return {
    title: `${entry.name} Activities | Lolo's Extreme Cross Country RV Trips`,
    description: `${entry.count} ${entry.name.toLowerCase()} activities logged across 20+ years of Lolo and Herb's cross-country RV road trips — where each one happened and on which trip.`,
    alternates: { canonical: `/activities/${key}` },
  };
}

// Prefer the trip's year field, falling back to a year in its title. One trip
// ("2017 Total Solar Eclipse") has an empty year field but carries it in the
// title, so between the two every trip resolves.
function tripYear(trip) {
  if (!trip) return null;
  const y = String(trip.year || "");
  if (/^(19|20)\d{2}$/.test(y)) return y;
  return (cleanTitle(trip.title || "").match(/\b(19|20)\d{2}\b/) || [])[0] || null;
}

// Every trip title leads with its year ("2001 Cross Country Road Trip"), which
// would just repeat the year shown alongside it — so drop the leading year and
// keep the name. Falls back to the full title if that leaves nothing.
function tripName(trip) {
  if (!trip) return null;
  const full = cleanTitle(trip.title || "");
  const stripped = full.replace(/^(19|20)\d{2}\s+/, "").trim();
  return stripped || full || null;
}

// The listing's order, chosen with ?sort=. A–Z is the default (Lolo's choice,
// 2026-11-12) and carries no parameter, so the canonical URL is the page as
// Google sees it. ?sort=az still works, for links made while newest was first.
// Every activity's stop has an arrival_date, so the date sorts are total; ties
// within one stop fall back to the order the activities were written in.
const SORTS = [
  { key: "az", label: "A–Z" },
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
];

function sortKey(raw) {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return SORTS.some((s) => s.key === v) ? v : "az";
}

function sortHref(slug, key) {
  return key === "az" ? `/activities/${slug}` : `/activities/${slug}?sort=${key}`;
}

// Leading quotes and punctuation would otherwise file "'Ohe'o Gulch" ahead of
// the A's.
function titleForSort(t) {
  return t.replace(/^[^\p{L}\p{N}]+/u, "");
}

export async function generateStaticParams() {
  const activitiesPath = path.join(DATA_DIR, "activities.json");
  if (!fs.existsSync(activitiesPath)) return [];

  const activities = JSON.parse(fs.readFileSync(activitiesPath, "utf-8"));
  const typesSet = new Set();

  activities.forEach(act => {
    const slug = slugifyType(act.activity_type);
    if (slug) typesSet.add(slug);
  });

  return Array.from(typesSet).map(type => ({ type }));
}

export default async function ActivityTypePage({ params, searchParams }) {
  const { type } = await params;
  const sort = sortKey((await searchParams).sort);
  // Unpublished activities are hidden from the cards AND the sidebar counts.
  const activities = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "activities.json"), "utf-8"))
    .filter(a => isActivityLive(a));
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
    const slug = slugifyType(t);
    if (!slug) return;
    typeCounts[slug] = (typeCounts[slug] || 0) + 1;
    typeNames[slug] = t;
  });

  // Sort activity types by frequency descending
  const sortedTypes = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]);

  // Filter matching activities
  const matchingActivities = activities.filter(
    act => slugifyType(act.activity_type) === type.toLowerCase()
  );

  // A type with no activities is not a page — without this, any made-up
  // /activities/<word> URL rendered an empty listing with a 200, which
  // Google rightly flags as a soft 404 (old Drupal paths were hitting it).
  if (matchingActivities.length === 0) {
    // Drupal's old per-activity pages shared this path; those go to their stop.
    const target = await legacyTarget('activities', type);
    if (target) permanentRedirect(target);
    notFound();
  }

  const arrival = (act) => Number(stopMap[String(act.parent_stop_nid)]?.arrival_date) || 0;
  const byWritten = (a, b) => Number(a.nid) - Number(b.nid);
  if (sort === "az") {
    matchingActivities.sort((a, b) =>
      titleForSort(cleanTitle(a.title)).localeCompare(titleForSort(cleanTitle(b.title)), "en", { sensitivity: "base", numeric: true })
      || arrival(b) - arrival(a));
  } else {
    const dir = sort === "oldest" ? 1 : -1;
    matchingActivities.sort((a, b) => dir * (arrival(a) - arrival(b)) || byWritten(a, b));
  }

  const displayTypeName = typeNames[type.toLowerCase()] || type.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="w-full pb-16">
      <div className="mb-6 flex gap-2 items-center text-sm flex-wrap">
        <Link href="/" className="link-chrome">Home</Link>
        <span className="text-[#a89e8a]">/</span>
        <Link href="/activities" className="link-chrome">Activities</Link>
        <span className="text-[#a89e8a]">/</span>
        <OriginBreadcrumb linkClassName="link-chrome" separatorClassName="text-[#a89e8a]" />
        <span className="text-[#5c5648] font-medium truncate">{displayTypeName} Activities</span>
      </div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#2e2c26] m-0">
          {displayTypeName} Activities
        </h1>
        <p className="text-sm text-[#6b6455] mt-1">
          Showing {matchingActivities.length} {displayTypeName.toLowerCase()} activities logged during our motorhome cross-country adventures.
        </p>
        {/* Plain links rather than a client-side control: the order is applied
            on the server, so it works without JavaScript and a sorted listing
            can be bookmarked or shared. */}
        <nav aria-label="Sort activities" className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-[#c1593a] font-extrabold mr-1">Sort</span>
          {SORTS.map(({ key, label }) => {
            const isCurrent = key === sort;
            return (
              <Link
                key={key}
                href={sortHref(type.toLowerCase(), key)}
                aria-current={isCurrent ? "true" : undefined}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold no-underline transition-all ${
                  isCurrent
                    ? "bg-[#7c9880] text-white shadow-md shadow-[#7c9880]/25"
                    : "bg-black/5 text-[#5c5648] hover:bg-[#c1593a]/10 hover:text-[#2e2c26]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Grid Layout: Activities List + Category Sidebar */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Side: Activity Cards */}
        <div className="flex-1 w-full space-y-4">
          {matchingActivities.length > 0 ? (
            matchingActivities.map((act, idx) => {
              const stop = stopMap[String(act.parent_stop_nid)];
              const trip = stop ? tripMap[String(stop.parent_trip_nid)] : null;
              const actTitle = cleanTitle(act.title || displayTypeName);
              const actText = act.narrative || "";
              const year = tripYear(trip);
              const tripLabel = tripName(trip);

              // Activity narratives carry no links or images of their own
              // (verified across all records), so the whole card can be a
              // single anchor — the hover lift then means what it looks like.
              const cardClass = "glass-card block p-4 md:p-5 border-l-4 border-l-[#c1593a]/80 transition-all no-underline";

              const body = (
                <>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#c1593a] mb-1">
                    {displayTypeName}
                  </div>

                  <h3 className="text-base md:text-lg font-bold text-[#2e2c26] mb-1.5 m-0 leading-snug">
                    {actTitle}
                  </h3>

                  {/* cleanDrupalContent gives every <p> a bottom margin, which on
                      the last one just pads the card out — flow-root keeps it
                      inside rather than collapsing it away. Zero it out so the
                      footer sits close to the text. */}
                  {actText && (
                    <div
                      className="text-sm text-[#4a4437] leading-relaxed mb-3 max-w-none flow-root [&>*:last-child]:mb-0 content-prose"
                      dangerouslySetInnerHTML={{ __html: cleanDrupalContent(actText, photoTitles) }}
                    />
                  )}

                  {stop && (
                    <div className="mt-3 pt-2.5 border-t border-black/10 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-bold text-[#2e2c26] group-hover:text-[#a54a2f] transition-colors">
                        {cleanTitle(stop.title)}
                      </span>
                      {/* No separator glyph: it strands at the end of the line
                          when this wraps on narrow screens, and the weight and
                          colour already separate stop from trip. */}
                      {tripLabel && (
                        <span className="text-xs text-[#6b6455]">{tripLabel}</span>
                      )}
                      {year && (
                        <span className="px-2 py-0.5 rounded-full bg-[#c1593a]/10 text-[#c1593a] text-[11px] font-extrabold tabular-nums">
                          {year}
                        </span>
                      )}
                    </div>
                  )}
                </>
              );

              return stop ? (
                <Link
                  key={act.nid || idx}
                  href={`/${stop.slug}`}
                  aria-label={`${actTitle} — view stop ${cleanTitle(stop.title)}`}
                  className={`group ${cardClass} hover:border-l-[#a54a2f]`}
                >
                  {body}
                </Link>
              ) : (
                <div key={act.nid || idx} className={cardClass}>
                  {body}
                </div>
              );
            })
          ) : (
            <div className="glass-card p-12 text-center text-[#6b6455]">
              <p className="text-base italic">No activities found matching category &quot;{displayTypeName}&quot;.</p>
            </div>
          )}
        </div>

        {/* Right Sidebar: All Activity Categories */}
        {/* Ordered above the cards on mobile: stacked below them the type list
            sits past every card — ~179 phone screens down on a busy type — so
            switching activity was effectively impossible. Sticky only applies
            once it becomes a real sidebar at lg. */}
        <aside className="w-full lg:w-80 glass-sidebar p-5 lg:sticky lg:top-20 shrink-0 order-first lg:order-last">
          <div className="border-b border-[#c1593a]/30 pb-3 mb-4">
            <span className="text-[11px] uppercase tracking-wider text-[#c1593a] font-extrabold block">
              Filter by Type
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
                  href={sortHref(slug, sort)}
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
