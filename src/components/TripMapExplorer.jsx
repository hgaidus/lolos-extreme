"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ─── All 19 trip highlight panels extracted from the original Dreamweaver box ─── */
const TRIPS = [
  {
    id: "ccmapall", year: "All", label: "All Trips Overview",
    gif: "/maps/ccalltrips.gif", href: "/travel-itineraries",
    title: "All Cross Country Road Trips Overview",
    parks: ["Arches, UT","Badlands, SD","Banff, AB","Bryce Canyon, UT","Black Canyon of the Gunnison, CO","Canyonlands, UT","Capitol Reef, UT","Carlsbad Caverns, NM","Crater Lake, OR","Denali, AK","Death Valley, CA","Devil's Tower, WY","Flaming Gorge, WY/UT","Grand Canyon, AZ","Grand Teton, WY","Great Basin, NV","Jasper, AB","Kenai Fjords, AK","Lake Mead, NV","Mammoth Cave, KY","Mesa Verde, CO","Mont-Tremblant, QC","Mount Rainier, WA","Olympic, WA","Petrified Forest, AZ","Pictured Rocks, MI","Rocky Mountain, CO","Saguaro, AZ","Sequoia, CA","Theodore Roosevelt, ND","White Sands, NM","Wind Cave, SD","Yellowstone, WY","Yosemite, CA","Zion, UT"],
    others: ["Antelope Island SP, UT","Bend, OR","Breckenridge, CO","Goblin Valley SP, UT","Garden of the Gods, CO","Homer Spit, AK","Las Vegas, NV","Mackinac Island, MI","Monument Valley, AZ","Moab, UT","Seattle, WA"]
  },
  {
    id: "cc1999", year: "1999", label: "1999 – Maiden Voyage",
    gif: "/maps/cc1999s.gif", href: "/1999-cross-country-road-trip",
    days: "25", miles: "7,200", title: "1999 Cross Country Road Trip Highlights",
    parks: ["Zion National Park","Grand Canyon (North Rim)","Bryce Canyon National Park","Capitol Reef National Park","Arches National Park","Canyonlands National Park","Monument Valley"],
    others: ["Las Vegas","Hoover Dam","Lake Mead NRA","Cedar Breaks NM","Goblin Valley SP"]
  },
  {
    id: "cc2000", year: "2000", label: "2000 – Northern Loop",
    gif: "/maps/cc2000s.gif", href: "/2000-cross-country-road-trip",
    days: "22", miles: "5,400", title: "2000 Cross Country Road Trip Highlights",
    parks: ["Sleeping Bear Dunes NL","Pictured Rocks NL","Apostle Islands NL","Theodore Roosevelt NP","Badlands NP","Wind Cave NP","Devil's Tower NM","Mount Rushmore NM","Custer State Park"],
    others: ["Mackinac Island","Wall Drug","Deadwood, SD"]
  },
  {
    id: "cc2001", year: "2001", label: "2001 – Pacific Northwest",
    gif: "/maps/cc2001s.gif", href: "/2001-cross-country-road-trip",
    days: "24", miles: "6,800", title: "2001 Cross Country Road Trip Highlights",
    parks: ["Rocky Mountain NP","Dinosaur NM","Flaming Gorge NRA","Capitol Reef NP","Zion NP","Bryce Canyon NP","Grand Canyon (South Rim)","Olympic NP"],
    others: ["Lake McConaughy SP","Antelope Island SP","Bruneau Dunes SP","Oregon Coast","Seattle"]
  },
  {
    id: "cc2002", year: "2002", label: "2002 – Southern Loop",
    gif: "/maps/cc2002s.gif", href: "/2002-cross-country-road-trip",
    days: "22", miles: "6,100", title: "2002 Cross Country Road Trip Highlights",
    parks: ["Mammoth Cave NP","Carlsbad Caverns NP","White Sands NM","Guadalupe Mountains NP","Big Bend NP","Padre Island NS","Saguaro NP","Joshua Tree NP"],
    others: ["Natchez Trace Pkwy","Tinkertown Museum","Roswell, NM","The Alamo"]
  },
  {
    id: "cc2003", year: "2003", label: "2003 – Best of Utah",
    gif: "/maps/cc2003s.gif", href: "/2003-cross-country-road-trip",
    days: "23", miles: "5,500", title: "2003 Cross Country Road Trip Highlights",
    parks: ["Flaming Gorge NRA","Bryce Canyon NP","Cedar Breaks NM","Zion NP"],
    others: ["Lake Anita SP","Lake McConaughy SP","Kodachrome Basin SP","Goblin Valley SP","Moab, UT"]
  },
  {
    id: "cc2004", year: "2004", label: "2004 – Canadian Maritimes",
    gif: "/maps/cc2004s.gif", href: "/2004-maritime-provinces-road-trip",
    days: "29", miles: "7,800", title: "2004 Canadian Maritime Road Trip Highlights",
    parks: ["Acadia NP","Cape Breton Highlands NP","Gros Morne NP","Terra Nova NP","PEI National Park"],
    others: ["Campobello Island","Fundy Trail","Meat Cove, NS","Cabot Trail","Bay of Fundy"]
  },
  {
    id: "cc2005", year: "2005", label: "2005 – Colorado & Utah",
    gif: "/maps/cc2005s.gif", href: "/2005-cross-country-road-trip",
    days: "21", miles: "5,200", title: "2005 Cross Country Road Trip Highlights",
    parks: ["Cuyahoga Valley NP","Black Canyon of the Gunnison NP","Natural Bridges NM","Mesa Verde NP","Arches NP","Canyonlands NP"],
    others: ["Lake McConaughy SP","Garden of the Gods","Telluride, CO","Moab, UT"]
  },
  {
    id: "cc2006", year: "2006", label: "2006 – Alaska RV",
    gif: "/maps/cc2006s.gif", href: "/2006-alaska-rv-road-trip",
    days: "26", miles: "6,900", title: "2006 Alaska Rental RV Road Trip Highlights",
    parks: ["Denali National Park","Kenai Fjords National Park"],
    others: ["Portage Glacier","Ninilchik","Homer Spit","Seward, AK","Talkeetna, AK"]
  },
  {
    id: "cc2007", year: "2007", label: "2007 – Yosemite & Nevada",
    gif: "/maps/cc2007s.gif", href: "/2007-cross-country-road-trip",
    days: "22", miles: "5,600", title: "2007 Cross Country Road Trip Highlights",
    parks: ["Capitol Reef NP","Lake Mead NRA","Death Valley NP","Sequoia NP","Yosemite NP"],
    others: ["Goblin Valley SP","Mono Lake State Reserve","Loneliest Road in America","Las Vegas"]
  },
  {
    id: "cc2008", year: "2008", label: "2008 – Martha's Vineyard",
    gif: "/maps/cc2008.gif", href: "/2008-marthas-vineyard-rv-vacation",
    days: "15", miles: "3,133", title: "2008 Martha's Vineyard Trip Highlights",
    parks: ["Everglades NP","Curry Hammock SP","Bahia Honda SP","John Pennekamp SP"],
    others: ["Martha's Vineyard, MA","Edgartown","Key West","Virginia Beach"]
  },
  {
    id: "cc20b9", year: "2009a", label: "2009 – Cross Country",
    gif: "/maps/cc20b9s.gif", href: "/2009-cross-country-camping-trip",
    days: "24", miles: "6,100", title: "2009 Cross Country Camping Trip Highlights",
    parks: ["Badlands NP","Yellowstone NP","Grand Teton NP","Arches NP"],
    others: ["Beartooth Highway","Monument Valley","Moab, UT","Wall Drug","Devils Tower"]
  },
  {
    id: "cc2009", year: "2009b", label: "2009 – Southeast Coast",
    gif: "/maps/cc2009s.gif", href: "/2009-southeast-coast-trip",
    days: "15", miles: "3,133", title: "2009 Southeast Coast Trip Highlights",
    parks: ["Everglades National Park"],
    others: ["John Pennekamp SP","Curry Hammock SP","Bahia Honda SP","Virginia Beach","Key West"]
  },
  {
    id: "cc2010", year: "2010", label: "2010 – Quebec",
    gif: "/maps/cc2010s.gif", href: "/2010-rv-trip-quebec",
    days: "18", miles: "2,800", title: "2010 Quebec RV Trip Highlights",
    parks: ["Mont-Tremblant National Park"],
    others: ["Isle-aux-Coudres","Tadoussac","Quebec City","Montreal"]
  },
  {
    id: "cc2011", year: "2011", label: "2011 – Cross Country",
    gif: "/maps/cc2011s.gif", href: "/2011-cross-country-road-trip",
    days: "24", miles: "5,800", title: "2011 Cross Country Road Trip Highlights",
    parks: ["Rocky Mountain NP","Peak to Peak Highway"],
    others: ["Boulder","Golden Gate Canyon SP","Golden","Estes Park"]
  },
  {
    id: "cc2012", year: "2012", label: "2012 – Northern California",
    gif: "/maps/cc2012.gif", href: "/2012-northern-california-road-trip",
    days: "20", miles: "3,400", title: "2012 Northern California Road Trip Highlights",
    parks: ["Sequoia NP","Kings Canyon NP","Yosemite NP"],
    others: ["Sebastopol","Mendocino","Lake Tahoe","Big Sur"]
  },
  {
    id: "cc2013", year: "2013", label: "2013 – Cross Country",
    gif: "/maps/cc2013a.gif", href: "/2013-cross-country-road-trip",
    days: "26", miles: "6,200", title: "2013 Cross Country Road Trips Highlights",
    parks: ["Rocky Mountain NP","Mount Rainier NP","Crater Lake NP","Olympic NP","North Cascades NP","Glacier NP","Theodore Roosevelt NP"],
    others: ["Seattle","Bend","Mendocino","Columbia River Gorge"]
  },
  {
    id: "cc2014", year: "2014", label: "2014 – Cross Country",
    gif: "/maps/cc2014a.gif", href: "/2014-cross-country-road-trip",
    days: "25", miles: "5,900", title: "2014 Cross Country Road Trips Highlights",
    parks: ["Yosemite NP","Devils Postpile NM","Mojave National Preserve","Sequoia NP"],
    others: ["Castle Crags SP","Lake Siskiyou","Bend","San Francisco"]
  },
  {
    id: "cc2015", year: "2015", label: "2015 – Migration West",
    gif: "/maps/cc2015b.gif", href: "/2015-herb-and-lolos-migration-west",
    days: "28", miles: "6,800", title: "2015 Cross Country Road Trips Highlights",
    parks: ["Manzanar NHS","Death Valley NP","Yosemite NP"],
    others: ["Seattle","San Francisco","Keough Hot Springs","Lake Tahoe"]
  }
];

export default function TripMapExplorer() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isAuto, setIsAuto] = useState(true);
  const intervalRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!isAuto) return;
    intervalRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % TRIPS.length);
    }, 3500);
    return () => clearInterval(intervalRef.current);
  }, [isAuto]);

  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector(".tme-active");
      if (active) active.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }
  }, [activeIdx]);

  function selectTrip(idx) {
    setIsAuto(false);
    clearInterval(intervalRef.current);
    setActiveIdx(idx);
  }

  const trip = TRIPS[activeIdx];

  return (
    <section style={{
      background: "rgba(6,18,12,0.96)",
      borderRadius: "14px",
      border: "1px solid rgba(245,158,11,0.35)",
      overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,0.7)"
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(90deg,#0a1f12,#122a18)",
        borderBottom: "2px solid #f59e0b",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "8px",
      }}>
        <h2 style={{ margin: 0, color: "#f59e0b", fontSize: "clamp(0.9rem,2.5vw,1.1rem)", fontWeight: 700 }}>
          🗺️ Interactive Trip Map Explorer
        </h2>
        <button
          onClick={() => setIsAuto(v => !v)}
          style={{
            background: isAuto ? "rgba(245,158,11,0.18)" : "transparent",
            border: "1px solid #f59e0b",
            color: "#f59e0b",
            padding: "5px 12px",
            borderRadius: "20px",
            cursor: "pointer",
            fontSize: "0.78rem",
            fontWeight: 600,
            minHeight: "36px",
          }}
        >
          {isAuto ? "⏸ Pause" : "▶ Auto-Scroll"}
        </button>
      </div>

      {/* Body: year-list + map/info — flex-row on desktop, flex-col on mobile (via CSS .tme-outer) */}
      <div className="tme-outer">

        {/* Year selector */}
        <div
          ref={listRef}
          className="tme-year-list"
          style={{
            width: "130px",
            flexShrink: 0,
            background: "#060e09",
            borderRight: "1px solid rgba(245,158,11,0.2)",
            overflowY: "auto",
            maxHeight: "600px",
          }}
        >
          {TRIPS.map((t, i) => (
            <button
              key={t.id}
              className={`tme-year-btn${i === activeIdx ? " tme-active" : ""}`}
              onClick={() => selectTrip(i)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 10px",
                background: i === activeIdx
                  ? "linear-gradient(90deg,rgba(245,158,11,0.22),rgba(245,158,11,0.06))"
                  : "transparent",
                border: "none",
                borderLeft: i === activeIdx ? "3px solid #f59e0b" : "3px solid transparent",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                color: i === activeIdx ? "#f59e0b" : "#94a3b8",
                fontSize: "0.8rem",
                fontWeight: i === activeIdx ? 700 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
                lineHeight: 1.3,
              }}
            >
              {t.year}
              <div style={{ fontSize: "0.67rem", opacity: 0.65, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {t.label.replace(/^\d{4}[ab]? – /, "")}
              </div>
            </button>
          ))}
        </div>

        {/* Center: map + info */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Map image */}
          <div
            className="tme-map-img-wrap"
            style={{
              background: "#0a1a0e",
              borderBottom: "1px solid rgba(245,158,11,0.2)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "10px",
              position: "relative",
              minHeight: "260px",
            }}
          >
            <img
              key={trip.gif}
              src={trip.gif}
              alt={`${trip.label} route map`}
              width={450}
              height={300}
              style={{
                display: "block",
                maxWidth: "100%",
                width: "100%",
                height: "auto",
                borderRadius: "6px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                animation: "fadeInMap 0.35s ease",
              }}
            />
            {/* Title badge */}
            <div style={{
              position: "absolute",
              bottom: "18px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.82)",
              border: "1px solid rgba(245,158,11,0.5)",
              borderRadius: "6px",
              padding: "3px 12px",
              color: "#f59e0b",
              fontSize: "clamp(0.72rem,2vw,0.85rem)",
              fontWeight: 700,
              whiteSpace: "nowrap",
              backdropFilter: "blur(6px)",
              maxWidth: "90%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {trip.label}
            </div>
            {/* Arrows */}
            <button onClick={() => selectTrip((activeIdx - 1 + TRIPS.length) % TRIPS.length)} style={arrowStyle("left")}>◀</button>
            <button onClick={() => selectTrip((activeIdx + 1) % TRIPS.length)} style={arrowStyle("right")}>▶</button>
          </div>

          {/* Stats row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "#091510",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexWrap: "wrap",
            gap: "8px",
          }}>
            <Link href={trip.href} style={{ color: "#34d399", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
              → Full Trip Details
            </Link>
            <div style={{ display: "flex", gap: "16px" }}>
              {trip.days && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#f59e0b", fontWeight: 800, fontSize: "1.1rem" }}>{trip.days}</div>
                  <div style={{ color: "#64748b", fontSize: "0.68rem" }}>Days</div>
                </div>
              )}
              {trip.miles && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#f59e0b", fontWeight: 800, fontSize: "1.1rem" }}>{trip.miles}</div>
                  <div style={{ color: "#64748b", fontSize: "0.68rem" }}>Miles</div>
                </div>
              )}
            </div>
          </div>

          {/* Parks + Others — 2 col on desktop, 1 col on mobile */}
          <div className="tme-highlights-grid" style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            flex: 1,
          }}>
            <div style={{ padding: "12px 14px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ color: "#34d399", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                🏔 Parks & Rec Areas
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 14px", color: "#cbd5e1", fontSize: "0.78rem", lineHeight: 1.85 }}>
                {trip.parks.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                📍 Other Points of Interest
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 14px", color: "#cbd5e1", fontSize: "0.78rem", lineHeight: 1.85 }}>
                {trip.others.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInMap {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </section>
  );
}

function arrowStyle(side) {
  return {
    position: "absolute",
    top: "50%",
    [side]: "6px",
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.65)",
    border: "1px solid rgba(245,158,11,0.5)",
    color: "#f59e0b",
    borderRadius: "50%",
    width: "30px",
    height: "30px",
    minHeight: "30px",
    cursor: "pointer",
    fontSize: "0.8rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };
}
