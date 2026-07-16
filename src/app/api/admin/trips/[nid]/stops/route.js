import { NextResponse } from 'next/server';
import { getTrip, createStop, commitAndPush } from '@/lib/adminData';
import { validateStopFields } from '@/lib/adminValidate';

const CREATABLE_FIELDS = [
  'title', 'description', 'travelogue', 'miles', 'hours', 'nights',
  'arrival_date', 'author', 'state', 'category', 'published',
];

export async function POST(request, { params }) {
  try {
    const { nid } = await params;
    const trip = getTrip(nid);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const body = await request.json();
    const fields = {};
    for (const key of CREATABLE_FIELDS) {
      if (key in body) fields[key] = body[key];
    }

    // Full (non-partial) validation on create: a stop must have a title —
    // otherwise it lands with the meaningless slug "new-stop" — and a real
    // category, or it silently vanishes from its category listing page.
    const { ok, errors, values } = validateStopFields(fields, { partial: false });
    if (!ok) {
      return NextResponse.json({ error: 'Validation failed', fields: errors }, { status: 400 });
    }

    const created = createStop(nid, values);
    const gitResult = await commitAndPush(`Add stop: ${created.title} (nid ${created.nid}) to trip ${trip.title}`);

    return NextResponse.json({ stop: created, git: gitResult });
  } catch (err) {
    console.error('Error creating stop:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
