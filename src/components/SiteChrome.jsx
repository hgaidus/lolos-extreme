"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import TopNav from "./TopNav";

// Wraps the public-facing chrome (green banner, top nav, footer) around page
// content. Admin routes get their own chrome from src/app/admin/layout.js, so
// this hides the public chrome on /admin/* to avoid two stacked headers.
export default function SiteChrome({ tripTitles, menus, children }) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname?.startsWith("/admin/");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
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
      <TopNav tripTitles={tripTitles} menus={menus} />

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
    </>
  );
}
