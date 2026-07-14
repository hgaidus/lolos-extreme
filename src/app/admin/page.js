import Link from 'next/link';
import { getTrips } from '@/lib/adminData';

export default function AdminDashboardPage() {
  const trips = getTrips();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Trips</h1>
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
              <span className="font-medium text-gray-800">{trip.title}</span>
              <span className="text-sm text-gray-400">{trip.year}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
