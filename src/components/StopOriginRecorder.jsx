'use client';

import { useEffect } from 'react';

// Remembers "you got to this listing by clicking a badge on stop X", so the
// listing page can show that stop as a breadcrumb segment.
//
// This replaces the ?from=<slug> query parameter that used to carry it. That
// parameter turned 47 activity pages into 2,707 crawlable URLs — plus the
// /state and /category variants — none in the sitemap, all canonicalising back
// to a handful of real pages. It is what filled Search Console's "Alternate
// page with proper canonical tag" (1,233) and much of "Crawled - currently not
// indexed" (4,919).
//
// Why the CLICK and not the page view or the referrer:
//
//   - document.referrer is useless here. next/link navigates via the History
//     API, so no HTTP request happens and the referrer still describes whatever
//     document was originally loaded. Measured: clicking a badge landed on the
//     listing with document.referrer === "". It would have missed every in-app
//     navigation, which is the only case this feature exists for.
//
//   - Recording on stop-page view instead would leave the value lying around,
//     so reaching a listing later by another route (the /activities index, the
//     type list in a listing sidebar) would show a stale, confident, wrong
//     breadcrumb. Writing only on the click that actually leads there means the
//     stored value can only ever describe the navigation that just happened.
//
// One delegated listener rather than wrapping each badge: the three link sites
// are in server components, and this keeps them as plain <Link>s.
export const STOP_ORIGIN_KEY = 'ccrv:lastStop';

const LISTING_LINK_SELECTOR = 'a[href^="/activities/"], a[href^="/state/"], a[href^="/category/"]';

export default function StopOriginRecorder({ path, title }) {
  useEffect(() => {
    if (!path || !title) return;

    const onClick = (event) => {
      const link = event.target?.closest?.(LISTING_LINK_SELECTOR);
      if (!link) return;
      try {
        window.sessionStorage.setItem(STOP_ORIGIN_KEY, JSON.stringify({ path, title }));
      } catch {
        // Private mode or storage disabled — the breadcrumb just won't appear.
      }
    };

    // Capture phase, so it still records if the router handles the click first.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [path, title]);

  return null;
}
