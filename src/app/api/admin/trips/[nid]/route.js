import { NextResponse } from 'next/server';
import { getTrip, updateTrip, commitAndPush } from '@/lib/adminData';
import { validateTripFields } from '@/lib/adminValidate';

export async function PATCH(request, { params }) {
  try {
    const { nid } = await params;
    const existing = getTrip(nid);
    if (!existing) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const body = await request.json();
    const fields = {};
    for (const key of ['title', 'year', 'travelogue', 'published']) {
      if (key in body) fields[key] = body[key];
    }

    const { ok, errors, values } = validateTripFields(fields, { partial: true });
    if (!ok) {
      return NextResponse.json({ error: 'Validation failed', fields: errors }, { status: 400 });
    }

    const updated = updateTrip(nid, values);
    const gitResult = await commitAndPush(`Edit trip: ${updated.title} (nid ${nid})`);

    return NextResponse.json({ trip: updated, git: gitResult });
  } catch (err) {
    console.error('Error updating trip:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
