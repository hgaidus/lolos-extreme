import Link from 'next/link';
import SlideCard from '@/components/SlideCard';
import { getCleanAlbums, getAlbumPreviewPhoto } from '@/utils/albumPhotos';

export const metadata = {
  title: "Photo Albums | Lolo's Extreme Cross Country RV Trips",
  description: "Browse over 20 years of family RV travel photography collections.",
};

export default function PhotoAlbumsIndexPage() {
  const albums = getCleanAlbums();

  return (
    <div style={{ width: "100%" }}>
      <div className="mb-4 flex gap-2 items-center text-sm flex-wrap">
        <Link href="/" className="text-[#c1593a] font-semibold hover:underline">Home</Link>
        <span className="text-[#a89e8a]">/</span>
        <span className="text-[#5c5648] font-medium">Photo Albums</span>
      </div>
      <div style={{ marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid rgba(62,50,30,0.12)" }}>
        <h1 style={{ fontSize: "clamp(1.4rem,4vw,2rem)", fontWeight: 700, color: "#2e2c26", margin: 0 }}>
          Photo Albums
        </h1>
      </div>

      <div className="photo-album-grid">
        {albums.map((album, idx) => {
          const cleanTitle = album.title.replace(/\s+photos$/i, '').replace(/\s+rv$/i, ' RV').trim();
          const imgUrl = getAlbumPreviewPhoto(album);

          return (
            <SlideCard
              key={idx}
              title={cleanTitle}
              imageUrl={imgUrl}
              href={`/${album.slug}`}
            />
          );
        })}
      </div>
    </div>
  );
}

