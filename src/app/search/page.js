import fs from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/dataPaths";
import SearchClient from "@/components/SearchClient";

export const metadata = {
  title: "Search | Lolo's Extreme Cross Country RV Trips",
  description: "Search across all of Lolo and Herb's RV trips, stops, and pages.",
};

function cleanTitle(str = "") {
  return str.replace(/\[img_assist[^\]]*\]/gi, "").trim();
}

function loadJSON(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf-8"));
  } catch {
    return [];
  }
}

function buildSearchIndex() {
  const trips = loadJSON("trips.json");
  const stops = loadJSON("stops.json");
  const pages = loadJSON("standalone_pages.json");

  const tripByNid = new Map(trips.filter(t => t.nid).map(t => [String(t.nid), t]));

  const tripEntries = trips
    .filter(t => t.nid && t.slug)
    .map(t => ({
      title: cleanTitle(t.title),
      slug: t.slug,
      type: "trip",
      year: t.year || null,
    }));

  const stopEntries = stops
    .filter(s => s.nid && s.slug)
    .map(s => {
      const parentTrip = tripByNid.get(String(s.parent_trip_nid));
      return {
        title: cleanTitle(s.title),
        slug: s.slug,
        type: "stop",
        state: s.state || null,
        category: s.category || null,
        tripTitle: parentTrip ? cleanTitle(parentTrip.title) : null,
      };
    });

  const pageEntries = pages
    .filter(p => p.nid && p.slug)
    .filter(p => {
      const s = (p.slug || "").toLowerCase();
      return !s.includes("lazy-daze") && s !== "tips" && !s.startsWith("tips/");
    })
    .map(p => ({
      title: cleanTitle(p.title),
      slug: p.slug,
      type: "page",
    }));

  return [...tripEntries, ...stopEntries, ...pageEntries];
}

export default function SearchPage() {
  const searchIndex = buildSearchIndex();
  return <SearchClient searchIndex={searchIndex} />;
}
