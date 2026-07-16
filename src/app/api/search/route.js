import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { DATA_DIR } from "@/lib/dataPaths";
import { makeVersioned, getDataVersion } from "@/lib/dataVersion";
import { isPublished } from "@/lib/publishState";

function cleanTitle(str = "") {
  return str.replace(/\[img_assist[^\]]*\]/gi, "").trim();
}

function stripToText(html = "") {
  return html
    .replace(/\[img_assist[^\]]*\]/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\\r\\n|\\n|\\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadJSON(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf-8"));
  } catch {
    return [];
  }
}

function buildSnippet(text, query) {
  if (!text) return "";
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 140) + (text.length > 140 ? "…" : "");
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + query.length + 80);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}

// Rebuilt when the content JSON changes on disk, so CMS edits are searchable
// within seconds instead of waiting for a deploy/restart.
const indexCache = makeVersioned(buildIndex, getDataVersion);

function getIndex() {
  return indexCache.get();
}

function buildIndex() {
  // Drafts never enter the index — their pages 404 for the public.
  const trips = loadJSON("trips.json").filter(isPublished);
  const stops = loadJSON("stops.json").filter(isPublished);
  const pages = loadJSON("standalone_pages.json").filter(isPublished);
  const tripByNid = new Map(trips.filter(t => t.nid).map(t => [String(t.nid), t]));

  const tripEntries = trips
    .filter(t => t.nid && t.slug)
    .map(t => {
      const text = stripToText(t.travelogue || t.body || "");
      return {
        title: cleanTitle(t.title),
        slug: t.slug,
        type: "trip",
        year: t.year || null,
        text,
        haystack: [cleanTitle(t.title), text].join(" ").toLowerCase(),
      };
    });

  const stopEntries = stops
    .filter(s => s.nid && s.slug)
    .map(s => {
      const parentTrip = tripByNid.get(String(s.parent_trip_nid));
      const text = stripToText(s.travelogue || s.description || s.body || "");
      return {
        title: cleanTitle(s.title),
        slug: s.slug,
        type: "stop",
        state: s.state || null,
        category: s.category || null,
        tripTitle: parentTrip ? cleanTitle(parentTrip.title) : null,
        text,
        haystack: [cleanTitle(s.title), s.state, s.category, parentTrip ? cleanTitle(parentTrip.title) : "", text].filter(Boolean).join(" ").toLowerCase(),
      };
    });

  const pageEntries = pages
    .filter(p => p.nid && p.slug)
    .filter(p => p.type !== "amazon_node")
    .filter(p => {
      const s = (p.slug || "").toLowerCase();
      return !s.includes("lazy-daze") && s !== "tips" && !s.startsWith("tips/");
    })
    .map(p => {
      const text = stripToText(p.body || "");
      return {
        title: cleanTitle(p.title),
        slug: p.slug,
        type: "page",
        text,
        haystack: [cleanTitle(p.title), text].join(" ").toLowerCase(),
      };
    });

  return [...tripEntries, ...stopEntries, ...pageEntries];
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ query: q, results: [] });
  }

  const query = q.toLowerCase();
  const index = getIndex();

  const matches = index.filter(item => item.haystack.includes(query));

  matches.sort((a, b) => {
    const aTitle = a.title.toLowerCase().includes(query) ? 0 : 1;
    const bTitle = b.title.toLowerCase().includes(query) ? 0 : 1;
    if (aTitle !== bTitle) return aTitle - bTitle;
    const aStarts = a.title.toLowerCase().startsWith(query) ? 0 : 1;
    const bStarts = b.title.toLowerCase().startsWith(query) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.title.localeCompare(b.title);
  });

  const results = matches.slice(0, 75).map(({ title, slug, type, state, category, tripTitle, year, text }) => ({
    title, slug, type, state, category, tripTitle, year,
    snippet: !title.toLowerCase().includes(query) ? buildSnippet(text, query) : null,
  }));

  return NextResponse.json({ query: q, total: matches.length, results });
}
