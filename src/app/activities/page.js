import fs from "fs";
import path from "path";
import Link from "next/link";
import { DATA_DIR } from "@/lib/dataPaths";

// The type list and counts come from activities.json, which changes when
// content is edited. Without this the page is prerendered once at build time
// and its counts go stale until the next deploy. Hourly regeneration keeps it
// fast while letting content edits land on their own — same approach as
// app/sitemap.js.
export const revalidate = 3600;

export const metadata = {
  title: "Activities | Lolo's Extreme Cross Country RV Trips",
  description:
    "Every kind of activity from 20+ years of RV road trips — hikes, campgrounds, scenic drives, museums, rafting and more. Pick an activity to see where we did it.",
  alternates: { canonical: "/activities" },
};

function slugifyType(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getActivityTypes() {
  try {
    const activities = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, "activities.json"), "utf-8")
    );
    const counts = {};
    const names = {};
    for (const act of activities) {
      const t = act.activity_type;
      if (!t) continue;
      const slug = slugifyType(t);
      if (!slug) continue;
      counts[slug] = (counts[slug] || 0) + 1;
      names[slug] = t;
    }
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .map((slug) => ({ slug, name: names[slug], count: counts[slug] }));
  } catch {
    return [];
  }
}

export default function ActivitiesIndexPage() {
  const types = getActivityTypes();
  const total = types.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="w-full pb-16">
      <div className="mb-6 flex gap-2 items-center text-sm flex-wrap">
        <Link href="/" className="text-[#c1593a] font-semibold hover:underline">Home</Link>
        <span className="text-[#a89e8a]">/</span>
        <span className="text-[#5c5648] font-medium">Activities</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#2e2c26] m-0">Activities</h1>
        <p className="text-sm text-[#8a8272] mt-1">
          {total.toLocaleString()} activities logged across 20+ years of motorhome travel.
          Pick one to see every place we did it.
        </p>
      </div>

      {/* A chooser rather than a redirect into one arbitrary type: landing
          straight on a type buries the type list under hundreds of cards,
          which on a phone is ~179 screens of scrolling away. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {types.map((t) => (
          <Link
            key={t.slug}
            href={`/activities/${t.slug}`}
            className="group glass-card block p-4 border-l-4 border-l-[#c1593a]/80 no-underline"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-bold text-[#3f5c4c] group-hover:text-[#c1593a] transition-colors leading-snug">
                {t.name}
              </span>
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#c1593a]/10 text-[#c1593a] text-[11px] font-extrabold tabular-nums">
                {t.count}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {types.length === 0 && (
        <div className="glass-card p-12 text-center text-[#8a8272]">
          <p className="text-base italic">No activities found.</p>
        </div>
      )}
    </div>
  );
}
