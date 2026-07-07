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
      <div style={{ marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <h1 style={{ fontSize: "clamp(1.4rem,4vw,2rem)", fontWeight: 700, color: "#fff", margin: 0 }}>
          Photo Albums
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.88rem", margin: "6px 0 0" }}>
          {albums.length} collections — browse 20+ years of family RV travel photography
        </p>
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

