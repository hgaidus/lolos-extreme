import Link from 'next/link';
import { getDistinctAuthors } from '@/lib/adminData';
import NewTripForm from './NewTripForm';

export const metadata = { title: 'New Trip — Admin', robots: { index: false, follow: false } };

export default function AdminNewTripPage() {
  const authors = Array.from(new Set(['Lolo', ...getDistinctAuthors()]));
  return (
    <div>
      <Link href="/admin" className="text-sm text-blue-700 hover:underline">&larr; All trips</Link>
      <h1 className="text-2xl font-bold mt-2 mb-4 text-gray-800">New Trip</h1>
      <NewTripForm authors={authors} />
    </div>
  );
}
