import React from "react";
import Link from "next/link";

const crossCountryTrips = [
  { title: "1999 Cross Country Road Trip", slug: "1999-cross-country-road-trip" },
  { title: "2000 Cross Country Road Trip", slug: "2000-cross-country-road-trip" },
  { title: "2001 Cross Country Road Trip", slug: "2001-cross-country-road-trip" },
  { title: "2002 Cross Country Road Trip", slug: "2002-cross-country-road-trip" },
  { title: "2003 Cross Country Road Trip", slug: "2003-cross-country-road-trip" },
  { title: "2005 Cross Country Road Trip", slug: "2005-cross-country-road-trip" },
  { title: "2007 Cross Country Road Trip", slug: "2007-cross-country-road-trip" },
  { title: "2009 Cross Country Camping Trip", slug: "2009-cross-country-camping-trip" },
  { title: "2011 Cross Country Road Trip", slug: "2011-cross-country-road-trip" },
  { title: "2013 Cross Country Road Trip", slug: "2013-cross-country-road-trip" },
  { title: "2015 Herb and Lolo's Migration West", slug: "2015-herb-and-lolos-migration-west" },
  { title: "2016 Bringing the Boat West", slug: "2016-bringing-boat-west" },
];

export default function CrossCountryRoadTripsList() {
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
                        {trip.title}
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
