import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTrip, STOP_CATEGORIES, getDistinctStates, getDistinctAuthors } from '@/lib/adminData';
import StopForm from '../StopForm';

export default async function AdminNewStopPage({ params }) {
  const { nid } = await params;
  const trip = getTrip(nid);
  if (!trip) notFound();

  return (
    <div>
      <Link href={`/admin/trips/${trip.nid}`} className="text-sm text-blue-700 hover:underline">
        &larr; {trip.title}
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-4 text-gray-800">Add a stop to &ldquo;{trip.title}&rdquo;</h1>
      <StopForm
        mode="create"
        tripNid={trip.nid}
        stop={null}
        categories={STOP_CATEGORIES}
        states={getDistinctStates()}
        authors={getDistinctAuthors()}
      />
    </div>
  );
}
