import Link from 'next/link';
import LightboxViewer from '@/components/LightboxViewer';
import { getPhotosForAlbum, findAlbumBySlug } from '@/utils/albumPhotos';

function fallbackTitle(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).replace(/Photos$/i, '').replace(/Rv/g, 'RV').trim();
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const album = findAlbumBySlug(slug);
  const title = album?.title || fallbackTitle(slug);
  return {
    title: `${title} | 35mm Photo Album`,
    description: `View historical 35mm slides and travel photography from the ${title}.`,
  };
}

export default async function AlbumDetailPage({ params }) {
  const { slug } = await params;
  const album = findAlbumBySlug(slug);
  const title = album?.title || fallbackTitle(slug);
  const photos = getPhotosForAlbum(slug);

  return (
    <div className="w-full">
      <div className="mb-6 pb-4 border-b border-black/10">
        <div className="mb-3 flex gap-2 items-center text-sm flex-wrap">
          <Link href="/" className="text-[#c1593a] font-semibold hover:underline">Home</Link>
          <span className="text-[#a89e8a]">/</span>
          <Link href="/photo-albums" className="text-[#c1593a] font-semibold hover:underline">Photo Albums</Link>
          <span className="text-[#a89e8a]">/</span>
          <span className="text-[#5c5648] font-medium truncate">{title}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#2e2c26] m-0">
          {title}
        </h1>
      </div>

      <div className="glass-panel p-6 md:p-8">
        <LightboxViewer photos={photos} albumTitle={title} use35mmSlides={true} />
      </div>
    </div>
  );
}

