import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPage, isPubliclyRendered } from '@/lib/adminPages';
import { getDistinctAuthors } from '@/lib/adminData';
import { currentUserName } from '@/lib/adminSession';
import PageEditForm from './PageEditForm';
import { ViewSiteTarget } from '../../ViewSiteContext';

export const metadata = { title: 'Edit Page — Admin', robots: { index: false, follow: false } };

export default async function AdminPageEditPage({ params }) {
  const { nid } = await params;
  const page = getPage(nid);
  if (!page) notFound();

  return (
    <div>
      <Link href="/admin/pages" className="text-sm text-blue-700 hover:underline">
        &larr; All pages
      </Link>
      {/* Some page types have no public page of their own; those keep the plain link. */}
      {isPubliclyRendered(page) && page.slug && <ViewSiteTarget href={`/${page.slug}`} label="View this page" />}
      <h1 className="text-2xl font-bold mt-2 mb-4 text-gray-800">{page.title}</h1>
      <PageEditForm page={page} publiclyRendered={isPubliclyRendered(page)} authors={Array.from(new Set([...getDistinctAuthors(), await currentUserName()].filter(Boolean)))} />
    </div>
  );
}
