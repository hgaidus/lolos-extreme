import fs from "fs";
import path from "path";
import React from "react";
import Link from "next/link";
import { DATA_DIR } from "@/lib/dataPaths";

function cleanTitle(str = "") {
  return str.replace(/\[img_assist[^\]]*\]/gi, "").trim();
}

function getAllTrips() {
  try {
    const trips = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "trips.json"), "utf-8"));
    const byNid = new Map();
    trips.forEach(t => {
      if (t && t.nid && t.slug && !byNid.has(t.nid)) byNid.set(t.nid, t);
    });
    const yearOf = (t) => Number(t.year) || (t.created ? new Date(Number(t.created) * 1000).getFullYear() : 0);
    return Array.from(byNid.values()).sort((a, b) => {
      const yearDiff = yearOf(a) - yearOf(b);
      return yearDiff !== 0 ? yearDiff : (Number(a.created) || 0) - (Number(b.created) || 0);
    }).map(t => ({ ...t, displayYear: yearOf(t) || null }));
  } catch {
    return [];
  }
}

export default function CrossCountryRoadTripsList() {
  const crossCountryTrips = getAllTrips();
  return (
    <div className="w-full max-w-4xl mx-auto min-w-0 py-6 px-4 sm:px-6 font-sans">
      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex gap-2 items-center text-sm flex-wrap">
        <Link href="/" className="text-amber-400 hover:underline font-semibold">Home</Link>
        <span className="text-gray-500">/</span>
        <span className="text-gray-300 font-medium">Cross Country Road Trip</span>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold text-[#d97706] mb-6 font-sans">
        Cross Country Road Trip
      </h1>

      <div className="glass-panel overflow-hidden border border-amber-500/30 rounded-lg shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse font-sans">
            <thead>
              <tr className="bg-[#14532d] text-white border-b border-amber-500/30">
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-xs">Trip Name</th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-xs text-center w-24">Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-[#07130d]/80">
              {crossCountryTrips.length > 0 ? (
                crossCountryTrips.map((trip, idx) => (
                  <tr key={trip.slug} className={idx % 2 === 0 ? "bg-white/5 hover:bg-white/10 transition-colors" : "bg-transparent hover:bg-white/10 transition-colors"}>
                    <td className="py-3 px-4 font-semibold">
                      <Link href={`/${trip.slug}`} className="text-[#38bdf8] hover:text-sky-300 hover:underline">
                        {cleanTitle(trip.title)}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-300 font-medium">
                      {trip.displayYear || '--'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="py-8 text-center text-gray-400">No trips found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
