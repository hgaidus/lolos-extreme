import { menuTrips } from "@/data/menuTrips";

// Single source of truth for which region (crossCountry/eastCoast/westCoast/
// international) each trip belongs to, and where its "browse all" listing
// page and trip-page region tag point. Derived from the same grouping
// already used for the nav dropdowns, since no region field exists in the
// migrated trip data itself.
export const REGION_INFO = {
  crossCountry: { label: "Cross Country Road Trip", href: "/cross-country-road-trip" },
  eastCoast: { label: "East Coast Road Trip", href: "/east-coast-road-trip" },
  westCoast: { label: "West Coast Road Trip", href: "/west-coast-road-trip" },
  international: { label: "International", href: "/international-trips" },
};

const REGION_BY_SLUG = Object.fromEntries(
  Object.entries(menuTrips).flatMap(([region, items]) =>
    items.map(item => [item.href.replace(/^\//, ""), region])
  )
);

export function getTripRegion(slug) {
  return REGION_BY_SLUG[(slug || "").replace(/^\//, "")] || "crossCountry";
}

export function getTripRegionInfo(slug) {
  return REGION_INFO[getTripRegion(slug)] || REGION_INFO.crossCountry;
}
