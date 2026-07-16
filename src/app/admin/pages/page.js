import Link from 'next/link';
import { getPages, isPubliclyRendered } from '@/lib/adminPages';

export const metadata = { title: 'Pages — Admin', robots: { index: false, follow: false } };

const TYPE_LABELS = {
  page: 'Pages',
  story: 'Stories',
  tips: 'Tips (not shown on the public site)',
};

export default function AdminPagesPage() {
  const pages = getPages();
  const groups = { page: [], story: [], tips: [] };
  for (const p of pages) groups[p.type]?.push(p);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Standalone Pages</h1>
        <Link
          href="/admin/pages/new"
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-semibold hover:bg-blue-700"
        >
          + New Page
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {pages.length} pages — About, Contact, the homepage planner text, stories, and the legacy
        tips collection. Click one to edit it.
      </p>

      {['page', 'story', 'tips'].map((type) => (
        <section key={type} className="mb-8">
          <h2 className="text-lg font-bold text-gray-700 mb-2">{TYPE_LABELS[type]}</h2>
          <ul className="bg-white rounded-lg shadow divide-y divide-gray-200">
            {groups[type].map((p) => (
              <li key={p.nid}>
                <Link href={`/admin/pages/${p.nid}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                  <span className="flex-1 font-medium text-gray-800">
                    {p.title}
                    {p.published === false && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 align-middle">
                        Draft
                      </span>
                    )}
                  </span>
                  {!isPubliclyRendered(p) && type !== 'tips' && (
                    <span className="text-xs text-gray-400 italic shrink-0">not rendered publicly</span>
                  )}
                  <span className="text-xs text-gray-400 shrink-0">/{p.slug}</span>
                </Link>
              </li>
            ))}
            {groups[type].length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-400 italic">None.</li>
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
