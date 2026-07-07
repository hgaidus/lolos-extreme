import fs from 'fs';
import path from 'path';

export const metadata = {
  title: "Interactive Trip Stops Map | Cross-Country Trips",
  description: "Explore 809+ GPS coordinates and campsite locations visited across North America and around the world in our Lazy Daze motorhome and overseas travels.",
};

function getMapData() {
  try {
    const dataPath = path.normalize("y:\\Lolos_Migration_Data\\exported_content\\data\\locations.geojson");
    const geojson = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    const stopsPath = path.normalize("y:\\Lolos_Migration_Data\\exported_content\\data\\stops.json");
    const stops = JSON.parse(fs.readFileSync(stopsPath, "utf-8"));
    
    // Map nid to stop title and travelogue snippet
    const stopMap = {};
    stops.forEach(s => {
      stopMap[s.nid] = s;
    });

    return geojson.features.map(f => {
      const stop = stopMap[f.properties.nid] || {};
      return {
        nid: f.properties.nid,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        url: f.properties.url || `/${stop.slug || ''}`,
        title: stop.title || `Campsite Location #${f.properties.lid}`,
        travelogue: stop.travelogue ? stop.travelogue.substring(0, 140) + "..." : "Historical RV stop location logged via GPS."
      };
    });
  } catch (err) {
    console.warn("Could not load locations.geojson", err);
    return [
      { nid: "2105", lat: 38.5631, lng: -110.7090, title: "Goblin Valley State Park", url: "/goblin-valley-state-park", travelogue: "Amazing sandstone hoodoos and quiet desert camping under starry skies." },
      { nid: "105", lat: 38.7331, lng: -109.5925, title: "Arches National Park - Devils Garden", url: "/arches-national-park-devils-garden", travelogue: "Camped right among the red rock fins at the end of the paved road." },
      { nid: "305", lat: 48.7596, lng: -113.7870, title: "Glacier National Park - Many Glacier", url: "/glacier-national-park", travelogue: "Spectacular mountain views and wildlife right outside our camper door." }
    ];
  }
}

import InteractiveMapWrapper from '../../components/InteractiveMapWrapper';

export default function InteractiveMapPage() {
  const locations = getMapData();

  return (
    <div>
      <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto 36px auto" }}>
        <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "2px", color: "var(--color-gold-primary)", fontWeight: "700" }}>
          🛰️ 66,800+ Miles • North America &amp; Worldwide Adventures
        </span>
        <h1 style={{ fontSize: "3rem", marginTop: "8px", marginBottom: "16px", color: "var(--text-primary)" }}>
          Interactive Trip Stops Map
        </h1>
        <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", lineHeight: "1.7" }}>
          Explore over <strong>{locations.length} GPS waypoint locations</strong> recorded by Lolo and Herb across North America and their international adventures—including <strong>New Zealand</strong>, Europe, Iceland, the Galapagos Islands, and Thailand! Use the interactive world map below to zoom, pan, switch map layers, or select a world region preset, and click any pushpin marker to jump directly to its original trip stop journal.
        </p>
      </div>

      <InteractiveMapWrapper locations={locations} height="640px" enableFilter={true} />
    </div>
  );
}

