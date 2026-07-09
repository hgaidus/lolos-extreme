import React from "react";
import CrossCountryRoadTripsList from "@/components/CrossCountryRoadTripsList";

export const metadata = {
  title: "West Coast Road Trip | Lolo's Extreme Cross Country RV Trips",
  description: "Browse all of Lolo and Herb's West Coast road trips.",
};

export default function WestCoastRoadTripPage() {
  return <CrossCountryRoadTripsList region="westCoast" />;
}
