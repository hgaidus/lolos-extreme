import Link from 'next/link';
import { getTrips } from '@/lib/adminData';

export default function AdminDashboardPage() {
  const trips = getTrips();

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-8 sm:max-w-md">
        <Link href="/admin/photos" className="bg-white rounded-lg shadow px-4 py-3 hover:bg-gray-50">
          <span className="block font-bold text-gray-800">Photos</span>
          <span className="block text-xs text-gray-500">Upload, retitle, assign to stops</span>
        </Link>
        <Link href="/admin/albums" className="bg-white rounded-lg shadow px-4 py-3 hover:bg-gray-50">
          <span className="block font-bold text-gray-800">Albums</span>
          <span className="block text-xs text-gray-500">Reorder, covers, membership</span>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Trips</h1>
        <Link
          href="/admin/trips/new"
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-semibold hover:bg-blue-700"
        >
          + New Trip
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {trips.length} trips. Click one to edit its details or add a stop.
      </p>
      <ul className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {trips.map((trip) => (
          <li key={trip.nid}>
            <Link
              href={`/admin/trips/${trip.nid}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <span className="font-medium text-gray-800">
                {trip.title}
                {trip.published === false && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 align-middle">
                    Draft
                  </span>
                )}
              </span>
              <span className="text-sm text-gray-400">{trip.year}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
