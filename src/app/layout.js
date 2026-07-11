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
  title: "Lolo's Extreme Cross Country RV Trips",
  description: "20+ summers of RV road trip travels across the USA and Canada in our Lazy Daze motorhome.",
  openGraph: {
    title: "Lolo's Extreme Cross Country RV Trips",
    description: "20+ summers of RV road trip travels across the USA and Canada in our Lazy Daze motorhome.",
    url: "https://www.cross-country-trips.com/",
    siteName: "Lolo's Extreme Cross Country RV Trips",
    type: "website",
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
          padding: "16px 20px",
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
              <h1 style={{
                fontFamily: "var(--font-inter), Helvetica, Arial, sans-serif",
                fontSize: "clamp(1.2rem, 4vw, 2.1rem)",
                fontWeight: 700,
                color: "#faf6ee",
                letterSpacing: "0.3px",
                margin: 0,
                lineHeight: 1.2,
              }}>
                Lolo&apos;s Extreme Cross Country RV Trips
              </h1>
              <div className="site-tagline" style={{
                fontSize: "clamp(0.8rem, 2vw, 1.05rem)",
                color: "#d1704f",
                fontWeight: 700,
                marginTop: "4px",
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
              style={{ height: "clamp(44px, 9vw, 64px)", width: "auto", flexShrink: 0 }}
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
          padding: "28px 16px",
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
            <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "rgba(255,255,255,0.75)" }}>
              Preserved &amp; modernized from Drupal 6 · Powered by Next.js
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
