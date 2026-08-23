import Link from 'next/link';
import { BAR, LABEL, LINK, LINK_PRIMARY, SEPARATOR, HINT } from './signedInBarStyles';

// The contextual edit link the old Drupal site had: when you are signed in,
// every page you are looking at offers a way straight into its editor, so
// fixing a typo you just spotted does not mean navigating the CMS to find the
// record again.
//
// Server-rendered and conditional on the session, so nothing about it reaches
// an anonymous visitor — not the markup, not the href. That is only safe
// because every page rendering this is force-dynamic; on a cached page a
// cookie-dependent branch would leak the bar to whoever warmed the cache.
//
// href may be null: a few pages (synthetic state/category listings) have no
// record behind them, and then the bar still renders to offer the way back
// into the CMS.
export default function AdminEditBar({ href, label, hint }) {
  // The dashboard link is dropped when the primary link already goes there —
  // the trip index, whose "editor" IS the dashboard. Two links side by side to
  // the same place reads as a mistake.
  const showDashboardLink = href !== '/admin';

  return (
    <div className={`${BAR} mb-4 rounded px-3 py-2`}>
      <span className={LABEL}>Signed in</span>

      {href && <Link href={href} className={LINK_PRIMARY}>{label}</Link>}

      {href && showDashboardLink && (
        <span aria-hidden="true" className={SEPARATOR}>|</span>
      )}

      {/* Secondary on purpose — not bold, so editing the page you are looking
          at stays the obvious action and this is just the way out to the rest
          of the CMS. Rendered here rather than passed in, so every page that
          shows the bar gets it without touching the call sites. */}
      {showDashboardLink && (
        <Link href="/admin" className={LINK}>Site Admin</Link>
      )}

      {hint && <span className={HINT}>{hint}</span>}
    </div>
  );
}
