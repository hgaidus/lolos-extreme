import fs from "fs";
import path from "path";
import "./globals.css";
import TopNav from "../components/TopNav";
import Link from "next/link";
import { Inter, Lora } from "next/font/google";
import { DATA_DIR } from "@/lib/dataPaths";

function cleanTitle(str = "") {
  return str.replace(/\[img_assist[^\]]*\]/gi, "").trim();
}

function getTripTitlesBySlug() {
  try {
    const trips = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "trips.json"), "utf-8"));
    const map = {};
    trips.forEach(t => {
      if (t && t.slug) map[t.slug] = cleanTitle(t.title);
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

        {/* ── Classic Header Banner ── */}
        <header style={{
          background: "linear-gradient(180deg, #34705D 0%, #2a5c4b 100%)",
          borderBottom: "2px solid rgba(193,89,58,0.55)",
          padding: "12px 20px",
          boxShadow: "0 4px 20px rgba(30,25,15,0.25)",
        }}>
          <Link href="/" style={{
            maxWidth: "1380px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            textDecoration: "none",
          }}>
            <div>
              {/* Site name is a styled div, NOT an <h1>: the site-wide banner
                  shouldn't compete with each page's own topical <h1> for SEO.
                  Verified every page/component supplies its own <h1>. */}
              <div style={{
                fontFamily: "var(--font-inter), Helvetica, Arial, sans-serif",
                fontSize: "clamp(1.2rem, 4vw, 2.1rem)",
                fontWeight: 700,
                color: "#faf6ee",
                letterSpacing: "0.3px",
                margin: 0,
                lineHeight: 1.2,
              }}>
                Lolo&apos;s Extreme Cross Country RV Trips
              </div>
              <div className="site-tagline" style={{
                fontSize: "clamp(0.8rem, 2vw, 1.05rem)",
                color: "#DAA795",
                fontWeight: 700,
                marginTop: "3px",
                fontFamily: "var(--font-inter), Helvetica, Arial, sans-serif",
              }}>
                20+ summers of RV road trip travels across the USA and Canada
              </div>
            </div>
            <img
              src="/photos/logo.gif"
              alt="Lolo's Extreme Cross Country RV Trips logo"
              width="186"
              height="100"
              style={{ height: "clamp(44px, 9vw, 70px)", width: "auto", flexShrink: 0 }}
            />
          </Link>
        </header>

        {/* ── Sticky Navigation Bar ── */}
        <TopNav tripTitles={tripTitles} />

        {/* ── Main Content ── */}
        <main style={{
          maxWidth: "1380px",
          margin: "0 auto",
          width: "100%",
          padding: "24px 16px",
          flex: 1,
          boxSizing: "border-box",
          overflowX: "hidden",
        }}>
          {children}
        </main>

        {/* ── Footer ── */}
        <footer style={{
          textAlign: "center",
          padding: "16px 16px",
          borderTop: "1px solid rgba(193,89,58,0.3)",
          color: "#ffffff",
          fontSize: "0.82rem",
          marginTop: "48px",
          background: "#58B195",
        }}>
          <div style={{ maxWidth: "1380px", margin: "0 auto" }}>
            <p style={{ margin: 0 }}>
              Copyright © 1998–{new Date().getFullYear()}, Lorraine E. &amp; Herbert H. Gaidus — All Rights Reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
