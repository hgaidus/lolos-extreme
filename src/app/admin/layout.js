import Link from 'next/link';
import LogoutButton from './LogoutButton';

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <Link href="/admin" className="font-bold">
          Site Admin
        </Link>
        <LogoutButton />
      </header>
      <main className="p-6 max-w-4xl mx-auto">{children}</main>
    </div>
  );
}
