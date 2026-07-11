import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import CrossCountryTimeline from '@/components/CrossCountryTimeline';
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
    .replace(/<h2>/g, '<h2 style="color:#3f5c4c;font-size:1.05rem;font-weight:700;margin:22px 0 10px">')
    .replace(/<h3>/g, '<h3 style="color:#3f5c4c;font-size:0.95rem;font-weight:700;margin:16px 0 8px">')
    .replace(/<ul>/g, '<ul style="margin:0 0 12px 18px;line-height:1.8">')
    .replace(/<li>/g, '<li style="margin-bottom:4px">')
    .replace(/<a /g, '<a style="color:#a54a2f;text-decoration:underline" ')
    .replace(/<strong>/g, '<strong style="color:#2e2c26">');
}

export default function HomePage() {
  const rawBody = getHomeBody();
  const cleanedBody = cleanBody(rawBody);

  // The raw body has its own "Contents of this site" list between the intro
  // and the news update — we render that section ourselves below (deduped
  // list + themed card), so it's cut out here rather than shown twice.
  const contentsIdx = cleanedBody.indexOf('<h2 style="color:#3f5c4c;font-size:1.05rem;font-weight:700;margin:22px 0 10px">Contents of this');
  const updateIdx = cleanedBody.indexOf('<h2 style="color:#3f5c4c;font-size:1.05rem;font-weight:700;margin:22px 0 10px">January 2026 Update');
  const introPart = contentsIdx > 0 ? cleanedBody.substring(0, contentsIdx) : cleanedBody;
  const newsPart  = updateIdx > 0 ? cleanedBody.substring(updateIdx) : "";

  return (
    <div>
      {/* ── Hero ribbon ── */}
      <div style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(160deg, #3f5c4c 0%, #34705D 55%, #2a5c4b 100%)",
        borderRadius: "12px",
        padding: "14px 22px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
        boxShadow: "0 4px 20px rgba(30,25,15,0.2)",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle at 78% 30%, rgba(193,89,58,0.16) 0%, transparent 45%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.09em", color: "#DAA795", fontWeight: 700, marginBottom: "2px" }}>
            1998–2026
          </div>
          <h1 style={{
            fontFamily: "var(--font-heading), Georgia, serif",
            fontSize: "clamp(1.05rem, 3vw, 1.4rem)",
            fontWeight: 700,
            color: "#faf6ee",
            margin: 0,
            lineHeight: 1.2,
          }}>
            20+ Summers on the Road
          </h1>
        </div>
        <div style={{ position: "relative", display: "flex", gap: "22px", flexWrap: "wrap" }}>
          {[
            { v: "49", l: "States" },
            { v: "61", l: "Parks" },
            { v: "2,000+", l: "Pages" },
          ].map(s => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <div style={{ color: "#faf6ee", fontWeight: 800, fontSize: "1rem", fontFamily: "var(--font-heading), Georgia, serif" }}>{s.v}</div>
              <div style={{ color: "rgba(250,246,238,0.65)", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cross Country trip timeline ── */}
      <CrossCountryTimeline />

      <hr style={{ border: "none", borderTop: "1px solid rgba(90,74,50,0.15)", margin: "20px 0" }} />

      {/* ── Intro ── */}
      <div dangerouslySetInnerHTML={{ __html: introPart }} />

      {/* ── Contents of site ── */}
      <div className="glass-card" style={{ marginTop: "18px", overflow: "hidden" }}>
        <div style={{
          background: "#3f5c4c", color: "#faf6ee", fontWeight: 700, fontSize: "0.78rem",
          letterSpacing: "0.04em", textTransform: "uppercase", padding: "10px 16px",
        }}>
          Contents of this 2,000+ page site
        </div>
        <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px 20px", fontSize: "0.88rem", color: "#3d3a30" }}>
          <div>• <Link href="/travel-itineraries" style={{ color: "#3f5c4c", fontWeight: 600 }}>Best Driving Routes &amp; Itineraries</Link> — stops &amp; mileages</div>
          <div>• <Link href="/travel-itineraries" style={{ color: "#3f5c4c", fontWeight: 600 }}>Travelogues</Link> — personal experiences at each stop</div>
          <div>• <Link href="/trip-stops-map" style={{ color: "#3f5c4c", fontWeight: 600 }}>Overview Map</Link> — 809+ push-pin GPS stops</div>
          <div>• Activities — hikes, mountain biking, fishing &amp; rafting</div>
          <div>• <Link href="/photo-albums" style={{ color: "#3f5c4c", fontWeight: 600 }}>Photographs</Link> — 85 collections of 35mm slides</div>
          <div>• <Link href="/about-lolo-and-herb" style={{ color: "#3f5c4c", fontWeight: 600 }}>About Lolo &amp; Herb</Link> — our story &amp; the Lazy Daze</div>
          <div>• <Link href="/activities/highlight" style={{ color: "#3f5c4c", fontWeight: 600 }}>Top Highlights</Link> — places not to be missed</div>
        </div>
      </div>

      {/* ── News journal ── */}
      {newsPart && (
        <div style={{ marginTop: "20px" }} dangerouslySetInnerHTML={{ __html: newsPart }} />
      )}
    </div>
  );
}
