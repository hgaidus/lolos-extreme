"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const TYPE_LABEL = { trip: "Trip", stop: "Stop", page: "Page" };
const TYPE_BADGE_CLASS = {
  trip: "bg-[#c1593a]/10 text-[#c1593a] border-[#c1593a]/30",
  stop: "bg-[#3f5c4c]/10 text-[#3f5c4c] border-[#3f5c4c]/30",
  page: "bg-[#7c9880]/15 text-[#3f5c4c] border-[#7c9880]/40",
};

export default function SearchClient({ searchIndex, menus = {} }) {
  // Region browse groups arrive as a server-derived prop (tripMeta), same
  // shape the nav dropdowns use.
  const REGIONS = [
    { key: "crossCountry", label: "Cross Country Trips", items: menus.crossCountry || [] },
    { key: "east", label: "East Coast Trips", items: menus.eastCoast || [] },
    { key: "west", label: "West Coast Trips", items: menus.westCoast || [] },
    { key: "intl", label: "International Trips", items: menus.international || [] },
  ];
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
    <div className="w-full font-sans">
      <div className="mb-6 flex gap-2 items-center text-sm flex-wrap">
        <Link href="/" className="text-[#c1593a] hover:underline font-semibold">Home</Link>
        <span className="text-[#8a8371]">/</span>
        <span className="text-[#5c5847] font-medium">Search</span>
      </div>

      <div className="trip-page-layout flex flex-row gap-4 sm:gap-6 lg:gap-8 items-start w-full">
        <aside className="photo-sidebar-column shrink-0 glass-sidebar">
          <div className="trip-sidebar-map-box standalone-photo-box text-center bg-white p-3 rounded-lg border border-[#c1593a]/25 font-sans">
            <img
              src="/photos/bad_lolo.jpg"
              alt="Lolo, ready for the trail"
              title="Lolo, ready for the trail"
              style={{ maxWidth: "219px" }}
              className="w-full h-auto rounded shadow-md border border-black/10 mx-auto"
            />
          </div>
        </aside>

        <main className="trip-main-column flex-1 min-w-0">
          <article className="glass-panel p-6 md:p-8 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[#2e2c26] mb-2">Search the Complete Guano of Lolo!</h1>
            <p className="text-sm text-[#5c5847] mb-6">
              Search across {searchIndex.filter(i => i.type === "trip").length} trips, {searchIndex.filter(i => i.type === "stop").length}+ stops, and articles — including trip and stop narratives.
            </p>

            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2 mb-4 flex-wrap">
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Enter keywords, e.g. Yellowstone, Bishop, State Park..."
                className="flex-1 min-w-[220px] bg-white border border-[#c1593a]/30 rounded-lg px-4 py-2.5 text-sm text-[#2e2c26] placeholder:text-[#8a8371] focus:outline-none focus:border-[#c1593a]/70"
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
                      ? "bg-[#c1593a] text-white border-[#c1593a]"
                      : "bg-white text-[#3f5c4c] border-[#c1593a]/30 hover:bg-[#faf6ee]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="border-t border-[#e4dcc8] pt-5">
              {trimmedQuery.length > 0 && trimmedQuery.length < 2 && (
                <p className="text-sm text-[#8a8371]">Keep typing — enter at least 2 characters.</p>
              )}

              {trimmedQuery.length >= 2 && loading && (
                <p className="text-sm text-[#8a8371]">Searching…</p>
              )}

              {trimmedQuery.length >= 2 && !loading && (
                results.length > 0 ? (
                  <>
                    <p className="text-xs uppercase tracking-wider text-[#8a8371] mb-3">
                      {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{trimmedQuery}&rdquo;
                    </p>
                    <ul className="divide-y divide-[#e4dcc8]">
                      {results.map((item) => (
                        <li key={`${item.type}-${item.slug}`} className="py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${TYPE_BADGE_CLASS[item.type]}`}>
                              {TYPE_LABEL[item.type]}
                            </span>
                            <Link href={`/${item.slug}`} className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline font-medium">
                              {item.title}
                            </Link>
                            {item.type === "stop" && (item.tripTitle || item.state) && (
                              <span className="text-xs text-[#8a8371]">
                                {item.tripTitle}{item.tripTitle && item.state ? " • " : ""}{item.state}
                              </span>
                            )}
                            {item.type === "trip" && item.year && (
                              <span className="text-xs text-[#8a8371]">{item.year}</span>
                            )}
                          </div>
                          {item.snippet && (
                            <p className="text-xs text-[#8a8371] mt-1 leading-relaxed">{item.snippet}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-[#8a8371]">No results found for &ldquo;{trimmedQuery}&rdquo;.</p>
                )
              )}

              {showingRegion && (
                regionItems.length > 0 ? (
                  <ul className="divide-y divide-[#e4dcc8]">
                    {regionItems.map((item) => {
                      const slug = item.href.replace(/^\//, "");
                      const fullTitle = tripTitleBySlug.get(slug) || item.title;
                      return (
                        <li key={item.href} className="py-3">
                          <Link href={item.href} title={fullTitle} className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline font-medium">
                            {fullTitle}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-[#8a8371]">No trips found for this region.</p>
                )
              )}

              {!trimmedQuery && !showingRegion && (
                <p className="text-sm text-[#8a8371]">Type a keyword above, or browse trips by region.</p>
              )}
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}
