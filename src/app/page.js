import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import TripMapExplorer from '@/components/TripMapExplorer';
import { DATA_DIR } from '@/lib/dataPaths';

function getHomeBody() {
  try {
    const pages = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "standalone_pages.json"), "utf-8"));
    const home = pages.find(p => p.title && p.title.includes("Plan Your Route"));
    return home ? home.body : "";
  } catch { return ""; }
}

function cleanBody(html) {
  return html
    .replace(/<li>\s*<strong>Tips<\/strong>[\s\S]*?<\/li>/i, "")
    .replace(/href="internal:node\/(\d+)"/g, 'href="#"')
    .replace(/href="internal:([^"]+)"/g, 'href="/$1"')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<h2>/g, '<h2 style="color:#f59e0b;font-size:1.2rem;font-weight:700;margin:24px 0 10px">')
    .replace(/<h3>/g, '<h3 style="color:#34d399;font-size:1rem;font-weight:700;margin:18px 0 8px">')
    .replace(/<ul>/g, '<ul style="margin:0 0 12px 18px;line-height:1.9">')
    .replace(/<li>/g, '<li style="margin-bottom:4px">')
    .replace(/<a /g, '<a style="color:#60a5fa;text-decoration:underline" ')
    .replace(/<strong>/g, '<strong style="color:#e2e8f0">');
}

export default function HomePage() {
  const rawBody = getHomeBody();
  const cleanedBody = cleanBody(rawBody);

  const updateIdx = cleanedBody.indexOf('<h2 style="color:#f59e0b;font-size:1.2rem;font-weight:700;margin:24px 0 10px">January 2026 Update');
  const introPart = updateIdx > 0 ? cleanedBody.substring(0, updateIdx) : cleanedBody;
  const newsPart  = updateIdx > 0 ? cleanedBody.substring(updateIdx) : "";

  return (
    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>

      {/* ── Hero Banner ── */}
      <div style={{
        position: "relative",
        width: "100%",
        borderRadius: "12px",
        overflow: "hidden",
        marginBottom: "28px",
        minHeight: "180px",
        background: "linear-gradient(135deg, #0a1f12 0%, #122a18 40%, #1a3a20 100%)",
        display: "flex",
        alignItems: "center",
        padding: "28px 32px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        border: "1px solid rgba(245,158,11,0.25)",
      }}>
        {/* Background texture overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle at 70% 50%, rgba(245,158,11,0.08) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(52,211,153,0.05) 0%, transparent 50%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: "700px" }}>
          <div style={{ fontSize: "clamp(0.7rem,1.8vw,0.82rem)", color: "#f59e0b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "8px" }}>
            🚐 Our RV Adventures — 1998 to Present
          </div>
          <h1 style={{
            fontFamily: "var(--font-outfit), system-ui, sans-serif",
            fontSize: "clamp(1.2rem,4vw,2rem)",
            fontWeight: 800,
            color: "#ffffff",
            margin: "0 0 10px",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}>
            Cross Country RV Road Trip Planner
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "clamp(0.85rem,2vw,1rem)", margin: "0 0 16px", lineHeight: 1.6 }}>
            20+ summers driving 114,000+ miles across the USA and Canada in our Lazy Daze motorhome.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link href="/travel-itineraries" style={{
              background: "linear-gradient(135deg,#d97706,#92400e)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              padding: "9px 18px",
              borderRadius: "8px",
              textDecoration: "none",
              display: "inline-block",
              minHeight: "38px",
              lineHeight: "20px",
            }}>
              Browse All Trips →
            </Link>
            <Link href="/photo-albums" style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#e2e8f0",
              fontWeight: 600,
              fontSize: "0.85rem",
              padding: "9px 18px",
              borderRadius: "8px",
              textDecoration: "none",
              display: "inline-block",
              minHeight: "38px",
              lineHeight: "20px",
            }}>
              📸 Photo Albums
            </Link>
          </div>
        </div>
        {/* Decorative emoji RV on right — hidden on very small screens via inline media-less trick */}
        <div style={{
          position: "absolute",
          right: "5%",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "clamp(3rem,10vw,6.5rem)",
          opacity: 0.12,
          pointerEvents: "none",
          userSelect: "none",
        }} aria-hidden="true">🏕️</div>
      </div>

      {/* ── Stats strip ── */}
      <div className="stats-grid-4" style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px",
        marginBottom: "28px",
        textAlign: "center",
      }}>
        {[
          { value: "114,000+", label: "Miles Traveled",    icon: "🛣️" },
          { value: "49",       label: "US States",         icon: "🗺️" },
          { value: "61",       label: "National Parks",    icon: "🏔" },
          { value: "2,000+",   label: "Pages of Content",  icon: "📄" },
        ].map(s => (
          <div key={s.label} style={{
            background: "rgba(10,25,18,0.85)",
            borderRadius: "10px",
            border: "1px solid rgba(245,158,11,0.25)",
            padding: "12px 6px",
            backdropFilter: "blur(8px)",
          }}>
            <div style={{ fontSize: "1.35rem", marginBottom: "2px" }}>{s.icon}</div>
            <div style={{ color: "#f59e0b", fontWeight: 800, fontSize: "clamp(1rem,3vw,1.4rem)" }}>{s.value}</div>
            <div style={{ color: "#64748b", fontSize: "0.72rem", marginTop: "2px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Two-column body: Map Explorer | Content ── */}
      <div className="home-grid" style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
        gap: "24px",
        alignItems: "start",
        marginBottom: "32px",
      }}>

        {/* LEFT: Interactive trip map */}
        <TripMapExplorer />

        {/* RIGHT: Intro + News */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <section style={{
            background: "rgba(14,35,25,0.7)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderLeft: "4px solid #f59e0b",
            padding: "18px 20px",
            fontSize: "0.92rem",
          }}>
            <div dangerouslySetInnerHTML={{ __html: introPart }} />
          </section>

          {newsPart && (
            <section style={{
              background: "rgba(6,18,12,0.85)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "18px 20px",
              fontSize: "0.9rem",
              lineHeight: 1.85,
              maxHeight: "520px",
              overflowY: "auto",
            }}>
              <div dangerouslySetInnerHTML={{ __html: newsPart }} />
            </section>
          )}
        </div>
      </div>

      {/* ── Site contents quick-links ── */}
      <section style={{
        padding: "18px 22px",
        background: "#091711",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <h3 style={{ color: "#f59e0b", fontSize: "1rem", fontWeight: 700, margin: "0 0 12px" }}>
          📚 Contents of this 2,000+ page site include:
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "8px",
          fontSize: "0.88rem",
          color: "#cbd5e1",
        }}>
          <div>• <Link href="/travel-itineraries" style={{ color: "#fff", fontWeight: 600 }}>Best Driving Routes &amp; Itineraries</Link> — stops &amp; mileages</div>
          <div>• <Link href="/travel-itineraries" style={{ color: "#fff", fontWeight: 600 }}>Travelogues</Link> — personal experiences at each stop</div>
          <div>• <Link href="/trip-stops-map"     style={{ color: "#fff", fontWeight: 600 }}>Overview Map</Link> — 809+ push-pin GPS stops</div>
          <div>• Activities — hikes, mountain biking, fishing &amp; rafting</div>
          <div>• <Link href="/photo-albums"        style={{ color: "#fff", fontWeight: 600 }}>Photographs</Link> — 85 collections of 35mm slides</div>
          <div>• <Link href="/about-lolo-and-herb" style={{ color: "#fff", fontWeight: 600 }}>About Lolo &amp; Herb</Link> — our story &amp; the Lazy Daze</div>
          <div>• <Link href="/activities/highlight" style={{ color: "#fff", fontWeight: 600 }}>Top Highlights</Link> — places not to be missed</div>
        </div>
      </section>
    </div>
  );
}
