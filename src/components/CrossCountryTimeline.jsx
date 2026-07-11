import Link from "next/link";
import { menuTrips } from "@/data/menuTrips";

// Route-map GIFs only exist for the trips that had one in the original
// Drupal theme; newer Cross Country trips fall back to a plain tile.
const GIF_BY_HREF = {
  "/1999-cross-country-road-trip": "cc1999s.gif",
  "/2000-cross-country-road-trip": "cc2000s.gif",
  "/2001-cross-country-road-trip": "cc2001s.gif",
  "/2002-cross-country-road-trip": "cc2002s.gif",
  "/2003-cross-country-road-trip": "cc2003s.gif",
  "/2005-cross-country-road-trip": "cc2005s.gif",
  "/2007-cross-country-road-trip": "cc2007s.gif",
  "/2009-cross-country-camping-trip": "cc20b9s.gif",
  "/2011-cross-country-road-trip": "cc2011s.gif",
  "/2013-cross-country-road-trip": "cc2013a.gif",
  "/2015-herb-and-lolos-migration-west": "cc2015b.gif",
};

function getYear(trip) {
  const m = (trip.hover || trip.title || "").match(/^(\d{4})/);
  return m ? m[1] : "";
}

export default function CrossCountryTimeline() {
  const trips = [...menuTrips.crossCountry].reverse(); // oldest -> newest

  return (
    <div className="mt-2">
      <h2 className="text-base font-bold mb-2" style={{ color: "#3f5c4c" }}>
        Our Cross Country trips
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {trips.map((trip) => {
          const gif = GIF_BY_HREF[trip.href];
          const year = getYear(trip);
          return (
            <Link
              key={trip.href}
              href={trip.href}
              className="glass-card shrink-0"
              style={{ width: "128px", overflow: "hidden", textDecoration: "none" }}
            >
              <div
                style={{
                  height: "68px",
                  background: gif
                    ? `#dce8de url(/maps/${gif}) center / cover no-repeat`
                    : "linear-gradient(135deg,#cfe0d3,#9fb6a2 55%,#f0b49a)",
                  position: "relative",
                }}
              >
                {!gif && (
                  <span
                    style={{
                      position: "absolute", left: "50%", top: "50%",
                      width: "7px", height: "7px", borderRadius: "50%",
                      background: "#c1593a", transform: "translate(-50%,-50%)",
                      boxShadow: "0 0 0 3px rgba(193,89,58,0.25)",
                    }}
                  />
                )}
              </div>
              <div style={{ padding: "7px 9px" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#3f5c4c" }}>{year}</div>
                <div style={{ fontSize: "0.68rem", color: "#8a8272", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {trip.title}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div style={{ fontSize: "0.78rem", color: "#8a8272" }}>
        Scrolls through each Cross Country trip, oldest to newest &middot;{" "}
        <Link href="/travel-itineraries" style={{ color: "#a54a2f", fontWeight: 600 }}>
          see East Coast, West Coast &amp; International trips →
        </Link>
      </div>
    </div>
  );
}
