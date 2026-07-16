import { notFound } from 'next/navigation';
import Link from 'next/link';
import { readDataset } from '@/lib/adminStore';
import AlbumEditor from './AlbumEditor';

export const metadata = { title: 'Album — Admin', robots: { index: false, follow: false } };

export default async function AdminAlbumPage({ params }) {
  const { tid } = await params;
  const album = readDataset('albums').find((a) => String(a.tid) === String(tid));
  if (!album) notFound();

  const images = (album.images || []).map((img) => ({
    image_nid: String(img.image_nid),
    title: img.title || '',
    filename: img.filename || '',
    url: img.url?.startsWith('/') ? img.url : `/photos/${img.filename}`,
  }));

  return (
    <div>
      <Link href="/admin/albums" className="text-sm text-blue-700 hover:underline">
        &larr; All albums
      </Link>
      <AlbumEditor tid={String(album.tid)} initialTitle={album.title} initialImages={images} slug={album.slug} />
    </div>
  );
}
