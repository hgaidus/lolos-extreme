import fs from "fs";
import path from "path";
import "./globals.css";
import SiteChrome from "../components/SiteChrome";
import { Inter, Lora } from "next/font/google";
import { DATA_DIR } from "@/lib/dataPaths";
import { isPublished } from "@/lib/publishState";
import { getMenuGroups } from "@/lib/tripMeta";

function cleanTitle(str = "") {
  return str.replace(/\[img_assist[^\]]*\]/gi, "").trim();
}

function getTripTitlesBySlug() {
  try {
    const trips = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "trips.json"), "utf-8"));
    const map = {};
    trips.forEach(t => {
      if (t && t.slug && isPublished(t)) map[t.slug] = cleanTitle(t.title);
    });
    return map;
  } catch {
    return {};
  }
}

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const lora  = Lora ({ subsets: ["latin"], variable: "--font-heading", display: "swap" });

export const metadata = {
  // Resolves all relative canonical/OpenGraph URLs to this canonical origin
  // (non-www — the live domain). Also fixes the previously hardcoded www og:url.
  metadataBase: new URL("https://cross-country-trips.com"),
  title: "Lolo's Extreme Cross Country RV Trips",
  description: "20+ summers of RV road-trip travels across the USA & Canada in our Lazy Daze motorhome — cross-country routes, campsites, national parks, and trip-planning photos for your own adventure.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Lolo's Extreme Cross Country RV Trips",
    description: "20+ summers of RV road-trip travels across the USA & Canada in our Lazy Daze motorhome — cross-country routes, campsites, national parks, and trip-planning photos.",
    url: "/",
    siteName: "Lolo's Extreme Cross Country RV Trips",
    type: "website",
    images: ["/photos/logo.gif"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  const tripTitles = getTripTitlesBySlug();
  // Nav dropdowns are derived server-side from the trip records (tripMeta)
  // and passed down — TopNav is a client component and can't read the JSON.
  const menus = getMenuGroups();
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body style={{
        backgroundColor: "#faf6ee",
        color: "#2e2c26",
        fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif',
        margin: 0,
        padding: 0,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}>
        {/* Public chrome (banner/nav/footer) lives in SiteChrome, which hides
            itself on /admin/* so the admin UI uses only its own header. */}
        <SiteChrome tripTitles={tripTitles} menus={menus}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
