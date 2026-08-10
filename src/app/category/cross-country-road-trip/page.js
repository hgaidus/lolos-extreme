import React from "react";
import CrossCountryRoadTripsList from "@/components/CrossCountryRoadTripsList";

// Reflect CMS edits within ~2s rather than freezing to static HTML.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Cross Country Road Trip | Lolo's Extreme Cross Country RV Trips",
  description: "Browse all of Lolo and Herb's cross country road trips across the USA.",
  // This route renders the exact same component as /cross-country-road-trip —
  // it's a legacy Drupal path kept alive for old inbound links. Point the
  // canonical at the real page rather than letting it self-canonicalize as a
  // second copy. (It is deliberately absent from the sitemap for the same
  // reason.)
  alternates: { canonical: "/cross-country-road-trip" },
};

export default function CategoryCrossCountryRoadTripPage() {
  return <CrossCountryRoadTripsList region="crossCountry" />;
}
