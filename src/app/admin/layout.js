import Link from 'next/link';
import LogoutButton from './LogoutButton';
import { SURFACE, ROW, LABEL, LINK, LINK_PRIMARY, SEPARATOR } from '@/components/signedInBarStyles';

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

// Every admin page must render from the CURRENT content files on every
// request. Without this, listing pages that use no request-scoped API
// (/admin, /admin/albums, /admin/pages, /admin/trips/new) get statically
// prerendered at BUILD time and show a frozen snapshot: an edited trip's
// year looked unsaved on the dashboard even though the record was correct.
// Cascades to all child routes from this layout.
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Deliberately the same bar as the one on public pages: same tinted
          surface, same SIGNED IN label, same terracotta links, so moving
          between the site and the CMS does not feel like two applications.
          Links left, Log out right. */}
      <header className={`${SURFACE} ${ROW} justify-between border-b px-6 py-2.5`}>
        <div className={ROW}>
          <span className={LABEL}>Signed in</span>
          <Link href="/admin" className={LINK_PRIMARY}>Site Admin</Link>
          <span aria-hidden="true" className={SEPARATOR}>|</span>
          <Link href="/" className={LINK}>View site &rarr;</Link>
        </div>
        <LogoutButton />
      </header>
      <main className="p-6 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}
