'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STOP_ORIGIN_KEY } from './StopOriginRecorder';

// The middle breadcrumb segment on a listing page: the stop whose badge you
// clicked to get here. StopOriginRecorder writes it at the moment of the click.
//
// Read once and delete — the value describes one navigation, not a standing
// "last stop I visited". Without that, arriving here later by any other route
// would show a breadcrumb that looks authoritative and is wrong. The cost is
// that reloading this page drops the segment, which the old ?from= parameter
// survived; that is the right trade for not lying about where you came from.
//
// Renders null on the server and fills in after mount, so there is no hydration
// mismatch. Nothing to show is also the correct output for a direct visit, a
// search result, or an external link.
export default function OriginBreadcrumb({ linkClassName, separatorClassName }) {
  const [origin, setOrigin] = useState(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STOP_ORIGIN_KEY);
      if (!raw) return;
      window.sessionStorage.removeItem(STOP_ORIGIN_KEY);
      const stored = JSON.parse(raw);
      if (stored?.title && typeof stored.path === 'string' && stored.path.startsWith('/')) {
        setOrigin(stored);
      }
    } catch {
      // Missing, unreadable or malformed — show nothing.
    }
  }, []);

  if (!origin) return null;

  return (
    <>
      <Link href={origin.path} className={linkClassName}>{origin.title}</Link>
      <span className={separatorClassName}>/</span>
    </>
  );
}
