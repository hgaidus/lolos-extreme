import Link from 'next/link';
import { readDataset } from '@/lib/adminStore';

export const metadata = { title: 'Albums — Admin', robots: { index: false, follow: false } };

export default function AdminAlbumsPage() {
  const trips = readDataset('trips');
  const tripBySlugTail = new Map(trips.map((t) => [t.slug, t]));

  const albums = readDataset('albums')
    .filter((a) => !(a.slug || '').includes('/feed'))
    .map((a) => {
      const tail = (a.slug || '').replace(/^photo-albums\//, '');
      const trip = tripBySlugTail.get(tail) || trips.find((t) => t.title === a.title) || null;
      const cover = (a.images || [])[0];
      return {
        tid: String(a.tid),
        title: a.title,
        count: (a.images || []).length,
        coverUrl: cover?.filename ? `/api/admin/photos/thumb?f=${encodeURIComponent(cover.filename)}` : null,
        tripTitle: trip ? trip.title : null,
      };
    })
    .sort((a, b) => b.title.localeCompare(a.title));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-gray-800">Photo Albums</h1>
      <p className="text-sm text-gray-500 mb-6">
        {albums.length} albums. Open one to retitle it, reorder photos, set the cover, or remove photos from the album.
      </p>
      <ul className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {albums.map((a) => (
          <li key={a.tid}>
            <Link href={`/admin/albums/${a.tid}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
              {a.coverUrl ? (
                <img src={a.coverUrl} alt="" loading="lazy" className="h-10 w-14 object-cover rounded bg-gray-100 shrink-0" />
              ) : (
                <div className="h-10 w-14 rounded bg-gray-100 shrink-0" />
              )}
              <span className="flex-1 font-medium text-gray-800">{a.title}</span>
              <span className="text-sm text-gray-400">{a.count} photos</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
