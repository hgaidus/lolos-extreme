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
    });
  } catch {
    return [];
  }
}

export default function CrossCountryRoadTripsList() {
  const crossCountryTrips = getAllTrips();
  return (
    <div className="w-full">
      {/* Breadcrumb Navigation */}
      <div className="max-w-4xl mx-auto mb-4 text-sm flex items-center gap-2 px-2 sm:px-0">
        <Link href="/" className="text-amber-400 hover:underline font-semibold" style={{ color: '#fbbf24', fontWeight: '600' }}>Home</Link>
        <span style={{ color: '#6b7280' }}>/</span>
        <span style={{ color: '#d1d5db', fontWeight: '500' }}>Cross Country Road Trip</span>
      </div>

      {/* Main White Content Box (Replicating Drupal Garland Theme Table View) */}
      <div
        className="w-full max-w-4xl mx-auto shadow-xl font-sans"
        style={{
          backgroundColor: '#ffffff',
          color: '#1f2937',
          padding: '36px',
          borderRadius: '8px',
          margin: '20px auto',
          maxWidth: '896px',
          fontFamily: 'sans-serif'
        }}
      >
        <h1
          className="font-serif font-normal"
          style={{
            color: '#c67a5c',
            fontSize: '1.875rem',
            fontFamily: 'serif',
            fontWeight: 'normal',
            marginBottom: '6px',
            marginTop: '0'
          }}
        >
          Cross Country Road Trip
        </h1>
        <div style={{ borderBottom: '1px solid #d6c5af', marginBottom: '24px' }}></div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d3e7eb' }}>
            <tbody>
              {crossCountryTrips.map((trip, idx) => {
                const isEven = idx % 2 === 0; // 0 (1999), 2 (2001), etc.
                const bgColor = isEven ? '#eef7f9' : '#ffffff';
                return (
                  <tr key={trip.slug} style={{ backgroundColor: bgColor, border: '1px solid #d3e7eb' }}>
                    <td style={{ padding: '12px 16px', width: '70%', border: '1px solid #d3e7eb' }}>
                      <Link
                        href={`/${trip.slug}`}
                        className="hover:underline font-sans"
                        style={{
                          color: '#0071b3',
                          textDecoration: 'none',
                          fontSize: '16px',
                          fontFamily: 'sans-serif',
                          fontWeight: 'normal',
                          display: 'block'
                        }}
                      >
                        {cleanTitle(trip.title)}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', width: '30%', border: '1px solid #d3e7eb' }}>
                      {/* Empty 2nd column matching original Drupal taxonomy view */}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
