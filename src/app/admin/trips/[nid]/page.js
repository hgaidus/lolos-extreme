import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTrip, getStopsForTrip } from '@/lib/adminData';
import TripEditForm from './TripEditForm';

export default async function AdminTripEditPage({ params }) {
  const { nid } = await params;
  const trip = getTrip(nid);
  if (!trip) notFound();

  const stops = getStopsForTrip(nid).sort((a, b) => (a.arrival_date || 0) - (b.arrival_date || 0));

  return (
    <div>
      <Link href="/admin" className="text-sm text-blue-700 hover:underline">
        &larr; All trips
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-4 text-gray-800">{trip.title}</h1>

      <TripEditForm trip={trip} />

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Stops ({stops.length})</h2>
          <Link
            href={`/admin/trips/${trip.nid}/stops/new`}
            className="bg-green-600 text-white rounded px-3 py-1.5 text-sm font-semibold"
          >
            + Add Stop
          </Link>
        </div>
        <ul className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {stops.map((stop) => (
            <li key={stop.nid}>
              <Link
                href={`/admin/trips/${trip.nid}/stops/${stop.nid}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <span className="font-medium text-gray-800">
                  {stop.title}
                  {stop.published === false && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 align-middle">
                      Draft
                    </span>
                  )}
                </span>
                <span className="text-sm text-gray-400">{stop.state}</span>
              </Link>
            </li>
          ))}
          {stops.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-400">No stops yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
