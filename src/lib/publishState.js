import { cookies } from 'next/headers';
import { isValidSessionToken, ADMIN_COOKIE_NAME } from './adminAuth';

// Draft support (trips, stops, standalone pages). The Drupal status field did
// not survive the export, so this is a new nullable flag with a
// backward-compatible default: a record with no `published` field is live —
// none of the existing records needed touching. Only `published: false`
// means draft.
//
// Visibility rules:
// - Public listings (nav, region lists, sitemap, search, itineraries,
//   album stop-links) hide drafts unconditionally — those surfaces are
//   static/ISR and must not depend on the viewer.
// - The content page itself ([...slug], already a dynamic route) 404s a
//   draft for the public but renders it for a logged-in admin with a DRAFT
//   banner, so drafts can be proofread at their real URL.
// - Activities and photos carry no flag by design; an activity or photo
//   attached to a draft stop simply has no public page to link to until the
//   stop is published.

export function isPublished(record) {
  return !record || record.published !== false;
}

export async function viewerCanSeeDrafts() {
  try {
    const store = await cookies();
    const token = store.get(ADMIN_COOKIE_NAME)?.value;
    return token ? isValidSessionToken(token) : false;
  } catch {
    // cookies() throws outside a request scope (e.g. static generation) —
    // exactly the contexts that must never show drafts.
    return false;
  }
}
