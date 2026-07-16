import Link from 'next/link';
import LogoutButton from './LogoutButton';

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
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <Link href="/admin" className="font-bold">
          Site Admin
        </Link>
        <LogoutButton />
      </header>
      <main className="p-6 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}
