import { readDataset } from './adminStore.js';

// Reference scanner: before anything is deleted (a photo record, an activity,
// a stop), find every narrative that points at it. An unresolved reference
// doesn't error — [img_assist] shortcodes are silently stripped and node
// links go dead — which is exactly how removing a duplicate photo record once
// silently deleted a figure from a stop's narrative. Deletes must check here
// first and either block or repoint.
//
// Scanned fields are the authored ones; `body` mirrors travelogue/description
// by invariant and would only duplicate hits.

const SCAN_FIELDS = {
  trips: ['travelogue'],
  stops: ['travelogue', 'description'],
  pages: ['body'],
  activities: ['narrative'],
};

function scan(pattern) {
  const hits = [];
  for (const [dataset, fields] of Object.entries(SCAN_FIELDS)) {
    for (const rec of readDataset(dataset)) {
      for (const field of fields) {
        const text = rec[field];
        if (typeof text !== 'string' || !text) continue;
        if (pattern.test(text)) {
          hits.push({
            dataset,
            nid: String(rec.nid),
            title: rec.title || rec.slug || `nid ${rec.nid}`,
            field,
          });
          break; // one hit per record is enough for the caller's decision
        }
      }
    }
  }
  return hits;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Narratives embedding this image via [img_assist|nid=N|…]. */
export function findReferencesToImageNid(imageNid) {
  const n = escapeRegex(String(imageNid));
  return scan(new RegExp(`\\[img_assist\\|nid=${n}[\\|\\]]`, 'i'));
}

/** Narratives linking to this node via node/N href forms (internal:node/N,
 *  entity:node/N, /node/N, node/N) — with a lookahead so node/12 doesn't
 *  match node/123. */
export function findReferencesToNodeNid(nid) {
  const n = escapeRegex(String(nid));
  return scan(new RegExp(`(?:internal:|entity:)?\\/?node\\/${n}(?!\\d)`, 'i'));
}
