import fs from "fs";
import path from "path";
import React from "react";
import Link from "next/link";
import { DATA_DIR } from "@/lib/dataPaths";
import { getTripRegion, REGION_INFO } from "@/lib/tripRegions";

function cleanTitle(str = "") {
  return str.replace(/\[img_assist[^\]]*\]/gi, "").trim();
}

function getAllTrips(region) {
  try {
    const trips = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "trips.json"), "utf-8"));
    const byNid = new Map();
    trips.forEach(t => {
      if (t && t.nid && t.slug && !byNid.has(t.nid)) byNid.set(t.nid, t);
    });
    const yearOf = (t) => Number(t.year) || (t.created ? new Date(Number(t.created) * 1000).getFullYear() : 0);
    let list = Array.from(byNid.values());
    if (region) {
      list = list.filter(t => getTripRegion(t.slug) === region);
    }
    return list.sort((a, b) => {
      const yearDiff = yearOf(b) - yearOf(a);
      return yearDiff !== 0 ? yearDiff : (Number(b.created) || 0) - (Number(a.created) || 0);
    }).map(t => ({ ...t, displayYear: yearOf(t) || null }));
  } catch {
    return [];
  }
}

export default function CrossCountryRoadTripsList({ region }) {
  const trips = getAllTrips(region);
  const info = (region && REGION_INFO[region]) || REGION_INFO.crossCountry;

  return (
    <div className="w-full max-w-4xl mx-auto min-w-0 py-6 px-4 sm:px-6 font-sans">
      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex gap-2 items-center text-sm flex-wrap">
        <Link href="/" className="text-[#c1593a] hover:underline font-semibold">Home</Link>
        <span className="text-[#8a8371]">/</span>
        <span className="text-[#5c5847] font-medium">{info.label}</span>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-[#3f5c4c] mb-6 font-heading">
        {info.label}
      </h1>

      <div className="bg-white overflow-hidden border border-[#e4dcc8] rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse font-sans">
            <thead>
              <tr className="bg-[#3f5c4c] text-white">
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-xs">Trip Name</th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-xs text-center w-24">Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4dcc8]">
              {trips.length > 0 ? (
                trips.map((trip, idx) => (
                  <tr key={trip.slug} className={idx % 2 === 0 ? "bg-[#faf6ee] hover:bg-[#f2ede1] transition-colors" : "bg-white hover:bg-[#f2ede1] transition-colors"}>
                    <td className="py-3 px-4 font-semibold">
                      <Link href={`/${trip.slug}`} className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline">
                        {cleanTitle(trip.title)}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-center text-[#5c5847] font-medium">
                      {trip.displayYear || '--'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="py-8 text-center text-[#8a8371]">No trips found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
