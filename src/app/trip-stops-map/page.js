import { getMapLocations } from '@/lib/stopLocations';

export const metadata = {
  title: "Interactive Trip Stops Map | Cross-Country Trips",
  description: "Explore 800+ GPS coordinates and campsite locations visited across North America and around the world in our Lazy Daze motorhome and overseas travels.",
  alternates: { canonical: "/trip-stops-map" },
};

// Rendered per request, like every other content page: a stop given a
// position in the CMS has to appear here without a redeploy. The pins come
// from a cache keyed on the content files, so this costs a lookup, not a parse.
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import InteractiveMapWrapper from '../../components/InteractiveMapWrapper';

export default function InteractiveMapPage() {
  const locations = getMapLocations();

  return (
    <div>
      <div className="mb-6 flex gap-2 items-center text-sm flex-wrap">
        <Link href="/" className="link-chrome">Home</Link>
        <span className="text-[#a89e8a]">/</span>
        <span className="text-[#5c5648] font-medium">Interactive Trip Stops Map</span>
      </div>
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

