import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTrip, getStop, STOP_CATEGORIES, getDistinctStates, getDistinctAuthors } from '@/lib/adminData';
import StopForm from '../StopForm';

export default async function AdminStopEditPage({ params }) {
  const { nid, stopNid } = await params;
  const trip = getTrip(nid);
  if (!trip) notFound();
  const stop = getStop(stopNid);
  if (!stop || String(stop.parent_trip_nid) !== String(nid)) notFound();

  return (
    <div>
      <Link href={`/admin/trips/${trip.nid}`} className="text-sm text-blue-700 hover:underline">
        &larr; {trip.title}
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-4 text-gray-800">{stop.title}</h1>
      <StopForm
        mode="edit"
        tripNid={trip.nid}
        stop={stop}
        categories={STOP_CATEGORIES}
        states={getDistinctStates()}
        authors={getDistinctAuthors()}
      />
    </div>
  );
}
