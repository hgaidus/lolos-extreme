import { readDataset } from '@/lib/adminStore';
import PhotoManager from './PhotoManager';

export const metadata = { title: 'Photos — Admin', robots: { index: false, follow: false } };

export default function AdminPhotosPage() {
  // The stop picker needs every stop labeled by its trip for disambiguation
  // (many stops share names like "Yosemite Valley" across trips).
  const trips = readDataset('trips');
  const tripByNid = new Map(trips.map((t) => [String(t.nid), t]));
  const stopOptions = readDataset('stops')
    .map((s) => {
      const trip = tripByNid.get(String(s.parent_trip_nid));
      return {
        nid: String(s.nid),
        label: `${trip ? trip.title + ' — ' : ''}${s.title}`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const orphanCount = readDataset('photos').filter((p) => !p.trip_stop_nid || p.trip_stop_nid === '0').length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-gray-800">Photos</h1>
      <p className="text-sm text-gray-500 mb-6">
        Search the photo registry, retitle photos, assign them to stops, and publish/unpublish.
        Photos are never deleted — unpublishing hides one from galleries and albums.
      </p>
      <PhotoManager stopOptions={stopOptions} orphanCount={orphanCount} />
    </div>
  );
}
