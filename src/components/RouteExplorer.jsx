"use client";

import React, { useState } from 'react';
import InteractiveMapWrapper from './InteractiveMapWrapper';

export default function RouteExplorer({ trips = [], allStops = [] }) {
  // Default to the first trip or 1999
  const defaultTrip = trips.length > 0 ? trips[0] : { title: "1999 Maiden Voyage", nid: "61", summary: "Cross country trip visiting 12 National Parks..." };
  const [selectedTrip, setSelectedTrip] = useState(defaultTrip);

  // Filter stops belonging to the selected trip
  const tripStops = allStops.filter(s => String(s.parent_trip_nid) === String(selectedTrip.nid));

  // Clean title of any accidental shortcodes
  const cleanTitle = (str = "") => str.replace(/\[img_assist[^\]]*\]/gi, "").trim();

  // Safely extract 4-digit year (prevents Drupal ETL database bug where body text was dumped into year property)
  const getTripYear = (trip) => {
    if (!trip) return "";
    const match = (trip.title || trip.slug || "").match(/\b(19\d\d|20\d\d)\b/);
    if (match) return match[1];
    if (trip.year && String(trip.year).length === 4 && /^\d{4}$/.test(String(trip.year))) {
      return String(trip.year);
    }
    return "";
  };

  const activeYear = getTripYear(selectedTrip);
  const displayTitle = activeYear ? `${activeYear} RV Journey` : cleanTitle(selectedTrip.title);

  return (
    <div className="glass-panel p-6 md:p-8 mt-8 border-t-2 border-amber-500/50" style={{ marginTop: '32px', padding: '32px', background: 'rgba(15, 35, 25, 0.85)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', borderTop: '3px solid #f59e0b' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/10" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div>
          <span className="text-xs uppercase tracking-widest text-amber-400 font-bold block" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#f59e0b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
            Interactive Route Explorer
          </span>
          <h2 className="text-2xl font-bold text-white mt-1 m-0" style={{ fontSize: '1.8rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>
            {displayTitle}
          </h2>
        </div>
        <a href={`/${selectedTrip.slug}`} className="btn-gold text-sm font-semibold" style={{ background: '#f59e0b', color: '#000', padding: '10px 20px', borderRadius: '6px', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }}>
          Read Full {activeYear || 'Trip'} Journal &rarr;
        </a>
      </div>

      {/* Yearly Timeline Selector Pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-white/10 scrollbar-thin" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {trips.map((trip, idx) => {
          const isSelected = String(trip.nid) === String(selectedTrip.nid);
          const tripYr = getTripYear(trip) || `Trip ${idx+1}`;
          return (
            <button
              key={`${trip.nid || 'trip'}-${idx}`}
              onClick={() => setSelectedTrip(trip)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#14532d] text-white border-2 border-amber-500 shadow-md"
                  : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
              }`}
              style={{
                padding: '6px 16px',
                borderRadius: '99px',
                border: isSelected ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.2)',
                background: isSelected ? '#14532d' : 'rgba(255,255,255,0.05)',
                color: isSelected ? '#ffffff' : '#e2e8f0',
                fontWeight: isSelected ? '700' : '500',
                fontSize: '0.9rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🚐 {tripYr}
            </button>
          );
        })}
      </div>

      {/* Map & Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        {/* Left: Route Map Preview Card */}
        <div className="bg-black/40 rounded-xl overflow-hidden border border-white/10 shadow-inner" style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="px-4 py-3 bg-[#0a1912] border-b border-white/10 flex justify-between items-center" style={{ padding: '12px 16px', background: '#0a1912', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-sm font-semibold text-gray-200" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#e2e8f0' }}>
              📍 Route Map: {activeYear}
            </span>
            <span className="text-xs text-amber-300 bg-white/10 px-2.5 py-0.5 rounded" style={{ fontSize: '0.75rem', color: '#fcd34d', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              {tripStops.length} Stops Logged
            </span>
          </div>
          <div className="w-full relative bg-[#07130d]" style={{ width: '100%', position: 'relative', background: '#07130d' }}>
            {tripStops.length > 0 ? (
              <InteractiveMapWrapper locations={tripStops} height="320px" enableFilter={false} />
            ) : (
              <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0', padding: '20px', textAlign: 'center' }}>
                <p>📍 No GPS coordinates logged for this specific trip year.</p>
              </div>
            )}
            <div className="bg-[#0a1912]/90 p-3 border-t border-white/10" style={{ background: 'rgba(10, 25, 18, 0.95)', padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              <p className="text-xs md:text-sm text-gray-200 m-0 truncate" style={{ fontSize: '0.85rem', color: '#e2e8f0', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <strong style={{ color: '#f59e0b' }}>Highlights:</strong> {cleanTitle(selectedTrip.title)}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Instant Trip Stops Dropdown (<select>) & List */}
        <div>
          <h3 className="text-lg font-bold text-amber-400 mb-2 flex items-center gap-2 m-0" style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f59e0b', margin: '0 0 8px 0' }}>
            ⛺ {activeYear} Trip Stops &amp; Campgrounds
          </h3>
          <p className="text-sm text-gray-400 mb-4" style={{ fontSize: '0.9rem', color: '#a0aec0', marginBottom: '16px' }}>
            Pick any stop from the dropdown menu below to jump directly to its travelogue and photo gallery:
          </p>

          {/* Classic Box 9 Interactive Select Dropdown */}
          <div className="mb-4 bg-[#0a1912] p-3 rounded-lg border border-amber-500/40 shadow" style={{ marginBottom: '16px', background: '#0a1912', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
            <label htmlFor="stop-select" className="block text-xs uppercase font-bold text-amber-400 mb-1.5" style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '700', color: '#f59e0b', marginBottom: '6px' }}>
              🚀 Fast Jump Dropdown:
            </label>
            <select
              id="stop-select"
              className="gold-select w-full"
              style={{ width: '100%', padding: '10px 12px', background: '#0f231a', color: '#ffffff', border: '1px solid #f59e0b', borderRadius: '6px', fontSize: '0.95rem', cursor: 'pointer' }}
              onChange={(e) => {
                if (e.target.value) window.location.href = e.target.value;
              }}
              defaultValue=""
            >
              <option value="" disabled>
                -- Select a destination ({tripStops.length} stops available) --
              </option>
              {tripStops.map((stop, idx) => (
                <option key={`${stop.nid || 'stop'}-${idx}`} value={`/${stop.slug}`}>
                  {idx + 1}. {cleanTitle(stop.title)}
                </option>
              ))}
            </select>
          </div>

          {/* Scrollable List of Stops */}
          <div className="max-h-[180px] overflow-y-auto pr-2 flex flex-col gap-2 scrollbar-thin" style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {tripStops.length > 0 ? (
              tripStops.map((stop, idx) => (
                <a 
                  key={`${stop.nid || 'stop'}-${idx}`} 
                  href={`/${stop.slug}`}
                  className="p-2.5 bg-white/5 border border-white/10 rounded-lg flex justify-between items-center text-sm hover:bg-white/10 hover:border-amber-500/50 transition-all no-underline text-gray-200"
                  style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: '#e2e8f0', fontSize: '0.9rem' }}
                >
                  <span className="font-medium truncate pr-2" style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '8px' }}>
                    {idx + 1}. {cleanTitle(stop.title)}
                  </span>
                  <span className="text-amber-400 text-xs shrink-0 font-semibold" style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: '600', flexShrink: 0 }}>
                    View &rarr;
                  </span>
                </a>
              ))
            ) : (
              <div className="p-6 text-center text-gray-400 bg-white/5 rounded-lg text-sm" style={{ padding: '24px', textAlign: 'center', color: '#a0aec0', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                No stops logged for this trip summary yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
