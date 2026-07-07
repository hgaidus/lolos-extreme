import Link from 'next/link';
import LightboxViewer from '@/components/LightboxViewer';
import { getPhotosForAlbum } from '@/utils/albumPhotos';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return {
    title: `${title} | 35mm Photo Album`,
    description: `View historical 35mm slides and travel photography from the ${title}.`,
  };
}

export default async function AlbumDetailPage({ params }) {
  const { slug } = await params;
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).replace(/Photos$/i, '').replace(/Rv/g, 'RV').trim();
  const photos = getPhotosForAlbum(slug);

  return (
    <div className="w-full">
      <div className="mb-6 pb-4 border-b border-white/10">
        <Link href="/photo-albums" className="text-amber-400 hover:underline font-semibold text-sm inline-flex items-center gap-1.5 mb-3">
          &larr; Back to All 35mm Albums
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white m-0">
          {title}
        </h1>
        <p className="text-base md:text-lg text-gray-300 mt-2 m-0">
          Preserved Kodak &amp; Fujifilm 35mm Slide Archive ({photos.length} photos) — Click any slide below to launch the interactive slideshow.
        </p>
      </div>

      <div className="glass-panel p-6 md:p-8">
        <LightboxViewer photos={photos} albumTitle={title} use35mmSlides={true} />
      </div>
    </div>
  );
}

