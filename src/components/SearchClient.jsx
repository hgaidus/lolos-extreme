"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { menuTrips } from "@/data/menuTrips";

const REGIONS = [
  { key: "crossCountry", label: "Cross Country Trips", items: menuTrips.crossCountry },
  { key: "east", label: "East Coast Trips", items: menuTrips.eastCoast },
  { key: "west", label: "West Coast Trips", items: menuTrips.westCoast },
  { key: "intl", label: "International Trips", items: menuTrips.international },
];

const TYPE_LABEL = { trip: "Trip", stop: "Stop", page: "Page" };
const TYPE_BADGE_CLASS = {
  trip: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  stop: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  page: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
};

export default function SearchClient({ searchIndex }) {
  const [query, setQuery] = useState("");
  const [activeRegion, setActiveRegion] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const tripTitleBySlug = useMemo(() => {
    const map = new Map();
    searchIndex.filter(i => i.type === "trip").forEach(t => map.set(t.slug, t.title));
    return map;
  }, [searchIndex]);

  const trimmedQuery = query.trim();

  const handleQueryChange = (value) => {
    setQuery(value);
    setActiveRegion(null);
    if (value.trim().length < 2) {
      setResults([]);
      setLoading(false);
    } else {
      setLoading(true);
    }
  };

  useEffect(() => {
    if (trimmedQuery.length < 2) return;
    clearTimeout(debounceRef.current);
    const thisRequestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`);
        const data = await res.json();
        if (requestIdRef.current === thisRequestId) {
          setResults(data.results || []);
          setLoading(false);
        }
      } catch {
        if (requestIdRef.current === thisRequestId) {
          setResults([]);
          setLoading(false);
        }
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [trimmedQuery]);

  const showingRegion = !trimmedQuery && activeRegion;
  const regionItems = showingRegion ? REGIONS.find(r => r.key === activeRegion)?.items || [] : [];

  return (
    <div className="w-full max-w-6xl mx-auto min-w-0 py-6 px-4 sm:px-6 font-sans">
      <div className="mb-4 flex gap-2 items-center text-sm flex-wrap">
        <Link href="/" className="text-amber-400 hover:underline font-semibold">Home</Link>
        <span className="text-gray-500">/</span>
        <span className="text-gray-300 font-medium">Search</span>
      </div>

      <div className="trip-page-layout flex flex-row gap-4 sm:gap-6 lg:gap-8 items-start w-full">
        <aside className="trip-sidebar-column shrink-0 glass-sidebar p-3 sm:p-4 md:p-5">
          <div className="trip-sidebar-map-box text-center bg-[#0a1c13] p-3 rounded-lg border border-amber-500/30 font-sans">
            <img
              src="/photos/bad_lolo.jpg"
              alt="Lolo, ready for the trail"
              title="Lolo, ready for the trail"
              className="w-full h-auto rounded shadow-md border border-white/10 mx-auto"
            />
          </div>
        </aside>

        <main className="trip-main-column flex-1 min-w-0">
          <article className="glass-panel p-6 md:p-8 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Search the Site</h1>
            <p className="text-sm text-gray-400 mb-6">
              Search across {searchIndex.filter(i => i.type === "trip").length} trips, {searchIndex.filter(i => i.type === "stop").length}+ stops, and articles — including trip and stop narratives.
            </p>

            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2 mb-4 flex-wrap">
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Enter keywords, e.g. Yellowstone, Bishop, State Park..."
                className="flex-1 min-w-[220px] bg-[#0a1c13] border border-amber-500/30 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-amber-500/70"
              />
              <button type="submit" className="btn-gold">Search</button>
            </form>

            <div className="flex gap-2 flex-wrap mb-6">
              {REGIONS.map(r => (
                <button
                  key={r.key}
                  onClick={() => { setActiveRegion(prev => prev === r.key ? null : r.key); setQuery(""); }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    activeRegion === r.key
                      ? "bg-amber-500 text-[#08150f] border-amber-500"
                      : "bg-white/5 text-amber-300 border-amber-500/30 hover:bg-white/10"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="border-t border-white/10 pt-5">
              {trimmedQuery.length > 0 && trimmedQuery.length < 2 && (
                <p className="text-sm text-gray-400">Keep typing — enter at least 2 characters.</p>
              )}

              {trimmedQuery.length >= 2 && loading && (
                <p className="text-sm text-gray-400">Searching…</p>
              )}

              {trimmedQuery.length >= 2 && !loading && (
                results.length > 0 ? (
                  <>
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">
                      {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{trimmedQuery}&rdquo;
                    </p>
                    <ul className="divide-y divide-white/5">
                      {results.map((item) => (
                        <li key={`${item.type}-${item.slug}`} className="py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${TYPE_BADGE_CLASS[item.type]}`}>
                              {TYPE_LABEL[item.type]}
                            </span>
                            <Link href={`/${item.slug}`} className="text-[#38bdf8] hover:text-sky-300 hover:underline font-medium">
                              {item.title}
                            </Link>
                            {item.type === "stop" && (item.tripTitle || item.state) && (
                              <span className="text-xs text-gray-400">
                                {item.tripTitle}{item.tripTitle && item.state ? " • " : ""}{item.state}
                              </span>
                            )}
                            {item.type === "trip" && item.year && (
                              <span className="text-xs text-gray-400">{item.year}</span>
                            )}
                          </div>
                          {item.snippet && (
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{item.snippet}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No results found for &ldquo;{trimmedQuery}&rdquo;.</p>
                )
              )}

              {showingRegion && (
                regionItems.length > 0 ? (
                  <ul className="divide-y divide-white/5">
                    {regionItems.map((item) => {
                      const slug = item.href.replace(/^\//, "");
                      const fullTitle = tripTitleBySlug.get(slug) || item.title;
                      return (
                        <li key={item.href} className="py-3">
                          <Link href={item.href} title={fullTitle} className="text-[#38bdf8] hover:text-sky-300 hover:underline font-medium">
                            {fullTitle}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">No trips found for this region.</p>
                )
              )}

              {!trimmedQuery && !showingRegion && (
                <p className="text-sm text-gray-400">Type a keyword above, or browse trips by region.</p>
              )}
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}
