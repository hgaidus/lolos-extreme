import React from "react";
import CrossCountryRoadTripsList from "@/components/CrossCountryRoadTripsList";

// Reflect CMS edits within ~2s rather than freezing to static HTML.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: "All Driving Routes & Itineraries | Lolo's Extreme Cross Country RV Trips",
  description: "Browse all of Lolo and Herb's cross country road trips across the USA.",
};

export default function TravelItinerariesPage() {
  return <CrossCountryRoadTripsList />;
}
