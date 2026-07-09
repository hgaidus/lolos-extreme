import React from "react";
import CrossCountryRoadTripsList from "@/components/CrossCountryRoadTripsList";

export const metadata = {
  title: "East Coast Road Trip | Lolo's Extreme Cross Country RV Trips",
  description: "Browse all of Lolo and Herb's East Coast road trips.",
};

export default function EastCoastRoadTripPage() {
  return <CrossCountryRoadTripsList region="eastCoast" />;
}
