import Link from 'next/link';
import NewPageForm from './NewPageForm';

export const metadata = { title: 'New Page — Admin', robots: { index: false, follow: false } };

export default function AdminNewPagePage() {
  return (
    <div>
      <Link href="/admin/pages" className="text-sm text-blue-700 hover:underline">&larr; All pages</Link>
      <h1 className="text-2xl font-bold mt-2 mb-4 text-gray-800">New Page</h1>
      <NewPageForm />
    </div>
  );
}
