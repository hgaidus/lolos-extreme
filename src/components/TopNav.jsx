"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { menuTrips } from "@/data/menuTrips";

const MENUS = [
  { key: "trips", label: "Cross Country Trips", items: menuTrips.crossCountry, top: { href: "/travel-itineraries", label: "All Routes & Itineraries" } },
  { key: "east",  label: "East Coast",          items: menuTrips.eastCoast },
  { key: "west",  label: "West Coast",           items: menuTrips.westCoast },
  { key: "intl",  label: "International",        items: menuTrips.international },
];

export default function TopNav({ tripTitles = {} }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu]     = useState(null);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const closeTimer = useRef(null);
  const navRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const enter = (key) => { clearTimeout(closeTimer.current); setOpenMenu(key); };
  const leave = ()    => { closeTimer.current = setTimeout(() => setOpenMenu(null), 220); };
  const toggle = (key, e) => { e.preventDefault(); setOpenMenu(p => p === key ? null : key); };
  const close  = ()   => { setOpenMenu(null); setMobileOpen(false); setMobileExpanded(null); };

  const ddStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    minWidth: "240px",
    background: "#ffffff",
    border: "1px solid #c1593a",
    borderTop: "none",
    borderRadius: "0 0 10px 10px",
    boxShadow: "0 16px 32px rgba(62,50,30,0.28)",
    listStyle: "none",
    padding: "6px 0",
    margin: 0,
    zIndex: 1000,
    maxHeight: "75vh",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  };

  const linkStyle = {
    display: "block",
    padding: "11px 18px",
    color: "#5c5648",
    fontSize: "0.9rem",
    textDecoration: "none",
    borderBottom: "1px solid rgba(62,50,30,0.07)",
    transition: "background 0.12s",
    minHeight: "44px",
    lineHeight: "22px",
  };

  const navLinkStyle = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "10px 12px",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.92rem",
    textDecoration: "none",
    cursor: "pointer",
    background: "none",
    border: "none",
    borderRadius: "4px",
    minHeight: "44px",
    whiteSpace: "nowrap",
  };

  return (
    <nav
      ref={navRef}
      style={{
        background: "rgba(63,92,76,0.97)",
        borderBottom: "2px solid #c1593a",
        position: "sticky",
        top: 0,
        zIndex: 200,
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{
        maxWidth: "1380px",
        margin: "0 auto",
        padding: "0 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: "48px",
      }}>

        {/* Mobile: site name + hamburger */}
        <Link href="/" onClick={close} style={{
          color: "#faf6ee",
          fontWeight: 700,
          fontSize: "0.95rem",
          textDecoration: "none",
          display: "none",
        }} className="mobile-logo">
          Lolo &amp; Herb&apos;s RV
        </Link>

        <button
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
          className="hamburger-btn"
          style={{
            background: "transparent",
            border: "1px solid rgba(193,89,58,0.7)",
            color: "#d1704f",
            padding: "8px 14px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "1rem",
            display: "none",
            minWidth: "44px",
            minHeight: "44px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>

        {/* Desktop nav links (hidden on mobile) */}
        <ul
          className="desktop-nav"
          style={{
            display: "flex",
            listStyle: "none",
            margin: 0,
            padding: 0,
            gap: "2px",
            flexWrap: "nowrap",
            alignItems: "center",
          }}
        >
          <li>
            <Link href="/" onClick={close} style={navLinkStyle}>Home</Link>
          </li>
          <li>
            <Link href="/about-lolo-and-herb" onClick={close} style={navLinkStyle}>About</Link>
          </li>

          {MENUS.map(m => (
            <li key={m.key} style={{ position: "relative" }}
              onMouseEnter={() => enter(m.key)}
              onMouseLeave={leave}
            >
              <button
                onClick={(e) => toggle(m.key, e)}
                style={{ ...navLinkStyle, background: openMenu === m.key ? "rgba(193,89,58,0.18)" : "none" }}
              >
                {m.label} <span style={{ fontSize: "0.65rem", color: "#d1704f", marginLeft: "2px" }}>▼</span>
              </button>
              {openMenu === m.key && (
                <ul style={ddStyle}
                  onMouseEnter={() => enter(m.key)}
                  onMouseLeave={leave}
                >
                  {m.top && (
                    <li><Link href={m.top.href} onClick={close} style={{ ...linkStyle, color: "#c1593a", fontWeight: 700 }}>{m.top.label}</Link></li>
                  )}
                  {m.items.map((item, i) => (
                    <li key={i}>
                      <Link href={item.href} onClick={close} title={tripTitles[item.href.replace(/^\//, "")] || item.title} style={linkStyle}>
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}

          <li><Link href="/photo-albums"  onClick={close} style={navLinkStyle}>Photos</Link></li>
          <li><Link href="/trip-stops-map" onClick={close} style={navLinkStyle}>Map</Link></li>
          <li><Link href="/search"         onClick={close} style={navLinkStyle}>Search</Link></li>
          <li><Link href="/contact-us"     onClick={close} style={navLinkStyle}>Contact</Link></li>
          <li><Link href="/admin"          onClick={close} style={{ ...navLinkStyle, color: "#d1704f" }}>CMS Admin</Link></li>
        </ul>
      </div>

      {/* ── Mobile slide-down menu ── */}
      {mobileOpen && (
        <div style={{
          background: "#33493c",
          borderTop: "1px solid rgba(193,89,58,0.3)",
          overflowY: "auto",
          maxHeight: "80vh",
          WebkitOverflowScrolling: "touch",
        }}>
          {/* Simple links */}
          {[
            { href: "/", label: "Home" },
            { href: "/about-lolo-and-herb", label: "About Lolo & Herb" },
          ].map(l => (
            <Link key={l.href} href={l.href} onClick={close} style={{
              display: "block",
              padding: "14px 20px",
              color: "#faf6ee",
              fontWeight: 600,
              fontSize: "1rem",
              textDecoration: "none",
              borderBottom: "1px solid rgba(250,246,238,0.08)",
              minHeight: "48px",
            }}>
              {l.label}
            </Link>
          ))}

          {/* Expandable dropdown groups */}
          {MENUS.map(m => (
            <div key={m.key}>
              <button
                onClick={() => setMobileExpanded(p => p === m.key ? null : m.key)}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  color: "#d1704f",
                  fontWeight: 700,
                  fontSize: "1rem",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid rgba(250,246,238,0.08)",
                  cursor: "pointer",
                  minHeight: "48px",
                  textAlign: "left",
                }}
              >
                {m.label}
                <span style={{ fontSize: "0.75rem", marginLeft: "8px" }}>{mobileExpanded === m.key ? "▲" : "▼"}</span>
              </button>
              {mobileExpanded === m.key && (
                <div style={{ background: "#2b3d31" }}>
                  {m.top && (
                    <Link href={m.top.href} onClick={close} style={{
                      display: "block",
                      padding: "12px 28px",
                      color: "#d1704f",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      textDecoration: "none",
                      borderBottom: "1px solid rgba(250,246,238,0.06)",
                      minHeight: "44px",
                    }}>
                      {m.top.label}
                    </Link>
                  )}
                  {m.items.map((item, i) => (
                    <Link key={i} href={item.href} onClick={close} title={tripTitles[item.href.replace(/^\//, "")] || item.title} style={{
                      display: "block",
                      padding: "12px 28px",
                      color: "#d7e3d9",
                      fontSize: "0.88rem",
                      textDecoration: "none",
                      borderBottom: "1px solid rgba(250,246,238,0.06)",
                      minHeight: "44px",
                      lineHeight: "20px",
                    }}>
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Photos + Map + Search + Contact */}
          {[
            { href: "/photo-albums",   label: "Photos" },
            { href: "/trip-stops-map", label: "Map" },
            { href: "/search",         label: "Search" },
            { href: "/contact-us",     label: "Contact" },
          ].map(l => (
            <Link key={l.href} href={l.href} onClick={close} style={{
              display: "block",
              padding: "14px 20px",
              color: "#faf6ee",
              fontWeight: 600,
              fontSize: "1rem",
              textDecoration: "none",
              borderBottom: "1px solid rgba(250,246,238,0.08)",
              minHeight: "48px",
            }}>
              {l.label}
            </Link>
          ))}
        </div>
      )}

      {/* Responsive visibility styles */}
      <style>{`
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: flex !important; }
          .mobile-logo { display: block !important; }
        }
        @media (min-width: 901px) {
          .hamburger-btn { display: none !important; }
          .mobile-logo { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
