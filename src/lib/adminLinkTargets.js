// Explicit .js extensions for plain-node script compat (same as adminStore).
import { readDataset } from './adminStore.js';
import { isPubliclyRendered } from './adminPages.js';
import { isPublished } from './publishState.js';

// What the editor's link dialog can point at: trips, stops and pages, found by
// title, by nid, or by the address of their public page.
//
// The dialog writes the link the way the Drupal-era content already does —
// href="internal:node/N" — and every render path (cleanDrupalContent, and
// resolveDrupalLinks on the homepage) turns that into the node's real address
// when the page is shown. So a new link looks exactly like the hundreds of old
// ones beside it, and it keeps working even if the target's address changes.

const KIND_ORDER = { trip: 0, page: 1, stop: 2 };
const LIMIT = 25;

function pathFor(slug) {
  const s = String(slug || '').replace(/^\/+/, '');
  return s ? `/${s}` : '';
}

function allTargets() {
  const trips = readDataset('trips');
  const tripTitle = new Map(trips.map((t) => [String(t.nid), t.title]));
  const out = [];
  for (const t of trips) {
    out.push({ nid: String(t.nid), kind: 'trip', title: t.title, context: '', path: pathFor(t.slug), published: isPublished(t) });
  }
  for (const p of readDataset('pages')) {
    // Tips and Lazy Daze pages exist in the data but have no public page, so a
    // link to one would go nowhere.
    if (!isPubliclyRendered(p)) continue;
    out.push({ nid: String(p.nid), kind: 'page', title: p.title, context: '', path: pathFor(p.slug), published: isPublished(p) });
  }
  for (const s of readDataset('stops')) {
    out.push({
      nid: String(s.nid),
      kind: 'stop',
      title: s.title,
      // Stop titles repeat (there are thirteen Bishops), so say whose stop it is.
      context: tripTitle.get(String(s.parent_trip_nid)) || '',
      path: pathFor(s.slug),
      published: isPublished(s),
    });
  }
  return out;
}

/** "12181", "node/12181", "/node/12181", "internal:node/12181" -> "12181" */
export function nidFromInput(input) {
  const m = String(input || '').trim().match(/^(?:(?:internal:|entity:)?\/?node\/)?(\d+)$/i);
  return m ? m[1] : null;
}

/** "/2026-picking-up-lola" or "https://cross-country-trips.com/2026-picking-up-lola" -> "/2026-picking-up-lola" */
function pathFromInput(input) {
  const s = String(input || '').trim();
  const own = s.match(/^https?:\/\/(?:www\.)?cross-country-trips\.com(\/[^?#\s]*)?/i);
  if (own) return (own[1] || '/').replace(/\/+$/, '') || '/';
  if (/^\/[^\s]*$/.test(s)) return s.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return null;
}

/**
 * Find link targets for what was typed. A nid or a site address that names a
 * trip, stop or page comes back as an exact match first; otherwise every word
 * typed must appear in the title (or, for a stop, its trip's title — so
 * "lola tucson" finds the Tucson stop of Picking up Lola).
 */
export function searchLinkTargets(query) {
  const q = String(query || '').trim();
  if (!q) return { exact: null, results: [] };
  const targets = allTargets();

  const nid = nidFromInput(q);
  const path = nid ? null : pathFromInput(q);
  const exact =
    (nid && targets.find((t) => t.nid === nid)) ||
    (path && targets.find((t) => t.path.toLowerCase() === path.toLowerCase())) ||
    null;

  // Titles are matched even for an all-digits query — "2026" should list the
  // 2026 trips, not only node 2026.
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = path
    ? []
    : targets
        .filter((t) => t !== exact)
        .filter((t) => {
          const hay = `${t.title} ${t.context}`.toLowerCase();
          return words.every((w) => hay.includes(w));
        })
        .sort((a, b) => {
          const aStarts = a.title.toLowerCase().startsWith(words[0]) ? 0 : 1;
          const bStarts = b.title.toLowerCase().startsWith(words[0]) ? 0 : 1;
          return (
            KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
            aStarts - bStarts ||
            // Newest first: the trips and stops being written about are recent.
            Number(b.nid) - Number(a.nid)
          );
        })
        .slice(0, LIMIT);

  // A bare number is ambiguous when titles match it too: "2026" is node 2026
  // (a 2002 trip) AND the year of the trips you probably mean. Then the nid
  // match heads the list for you to pick rather than being picked for you.
  if (exact && /^\d+$/.test(q) && results.length > 0) {
    return { exact: null, results: [exact, ...results].slice(0, LIMIT) };
  }
  return { exact, results };
}
