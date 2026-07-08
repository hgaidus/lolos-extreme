import fs from "fs";
import path from "path";
import "./globals.css";
import TopNav from "../components/TopNav";
import Link from "next/link";
import { Inter, Outfit } from "next/font/google";
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

const inter  = Inter ({ subsets: ["latin"], variable: "--font-inter",  display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

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
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body style={{
        backgroundColor: "#08150f",
        color: "#f8fafc",
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
          background: "linear-gradient(180deg, #08150f 0%, #0d1f14 100%)",
          borderBottom: "2px solid rgba(245,158,11,0.5)",
          padding: "16px 16px",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}>
          <div style={{ maxWidth: "1380px", margin: "0 auto", padding: "0 8px" }}>
            <Link href="/" style={{ textDecoration: "none", display: "inline-block" }}>
              {/* RV icon + title */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "2rem", lineHeight: 1 }} aria-hidden="true">🚐</span>
                <h1 style={{
                  fontFamily: "var(--font-outfit), system-ui, sans-serif",
                  fontSize: "clamp(1.2rem, 4vw, 2.1rem)",
                  fontWeight: 800,
                  color: "#f59e0b",
                  letterSpacing: "0.3px",
                  margin: 0,
                  lineHeight: 1.2,
                  textAlign: "left",
                }}>
                  Lolo&apos;s Extreme Cross Country RV Trips
                </h1>
              </div>
            </Link>
            <div style={{
              fontSize: "clamp(0.78rem, 2vw, 1rem)",
              color: "#cbd5e1",
              fontStyle: "italic",
              marginTop: "4px",
              fontFamily: "Georgia, serif",
            }}>
              20+ summers of RV road trip travels across the USA and Canada
            </div>
          </div>
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
          borderTop: "1px solid rgba(255,255,255,0.1)",
          color: "#94a3b8",
          fontSize: "0.82rem",
          marginTop: "48px",
          background: "#06100b",
        }}>
          <div style={{ maxWidth: "1380px", margin: "0 auto" }}>
            <p style={{ margin: 0 }}>
              Copyright © 1998–{new Date().getFullYear()}, Lorraine E. &amp; Herbert H. Gaidus — All Rights Reserved.
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "#475569" }}>
              Preserved &amp; modernized from Drupal 6 · Powered by Next.js
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
