import { NextResponse } from 'next/server';
import { getTrip, createStop, commitAndPush } from '@/lib/adminData';

export async function POST(request, { params }) {
  try {
    const { nid } = await params;
    const trip = getTrip(nid);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const fields = await request.json();
    const created = createStop(nid, fields);
    const gitResult = await commitAndPush(`Add stop: ${created.title} (nid ${created.nid}) to trip ${trip.title}`);

    return NextResponse.json({ stop: created, git: gitResult });
  } catch (err) {
    console.error('Error creating stop:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
