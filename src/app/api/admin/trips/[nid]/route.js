import { NextResponse } from 'next/server';
import { getTrip, updateTrip, commitAndPush } from '@/lib/adminData';

export async function PATCH(request, { params }) {
  try {
    const { nid } = await params;
    const existing = getTrip(nid);
    if (!existing) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const body = await request.json();
    const fields = {};
    for (const key of ['title', 'year', 'travelogue']) {
      if (key in body) fields[key] = body[key];
    }

    const updated = updateTrip(nid, fields);
    const gitResult = await commitAndPush(`Edit trip: ${updated.title} (nid ${nid})`);

    return NextResponse.json({ trip: updated, git: gitResult });
  } catch (err) {
    console.error('Error updating trip:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
