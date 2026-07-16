import { getRegionBySlug } from "./tripMeta.js";

// Region labels and listing-page hrefs. Which region a trip belongs to now
// comes from the trip record's own `region` field (via tripMeta) rather than
// the deleted hardcoded menu tables; unknown slugs keep the original
// crossCountry fallback.
export const REGION_INFO = {
  crossCountry: { label: "Cross Country Road Trip", href: "/cross-country-road-trip" },
  eastCoast: { label: "East Coast Road Trip", href: "/east-coast-road-trip" },
  westCoast: { label: "West Coast Road Trip", href: "/west-coast-road-trip" },
  international: { label: "International", href: "/international-trips" },
};

export function getTripRegion(slug) {
  return getRegionBySlug(slug);
}

export function getTripRegionInfo(slug) {
  return REGION_INFO[getTripRegion(slug)] || REGION_INFO.crossCountry;
}
