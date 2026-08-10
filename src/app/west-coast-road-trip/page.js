import React from "react";
import CrossCountryRoadTripsList from "@/components/CrossCountryRoadTripsList";

// Reflect CMS edits within ~2s rather than freezing to static HTML.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: "West Coast Road Trip | Lolo's Extreme Cross Country RV Trips",
  description: "Browse all of Lolo and Herb's West Coast road trips.",
  alternates: { canonical: "/west-coast-road-trip" },
};

export default function WestCoastRoadTripPage() {
  return <CrossCountryRoadTripsList region="westCoast" />;
}
