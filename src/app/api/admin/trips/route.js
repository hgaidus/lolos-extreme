import { NextResponse } from 'next/server';
import { createTrip, commitAndPush } from '@/lib/adminData';
import { validateNewTripFields } from '@/lib/adminValidate';

// Create a new trip. It is born as a DRAFT (published: false): invisible to
// the public everywhere, but already holding its computed slot in the nav
// menu and trip index, which it takes the moment it's published.
export async function POST(request) {
  try {
    const body = await request.json();
    const fields = {};
    for (const key of ['title', 'year', 'region', 'menu_label', 'menu_hover', 'author', 'map_image', 'travelogue']) {
      if (key in body) fields[key] = body[key];
    }

    const { ok, errors, values } = validateNewTripFields(fields);
    if (!ok) {
      return NextResponse.json({ error: 'Validation failed', fields: errors }, { status: 400 });
    }

    const trip = createTrip(values);
    const gitResult = await commitAndPush(`Add trip (draft): ${trip.title} (nid ${trip.nid})`);

    return NextResponse.json({ trip, git: gitResult });
  } catch (err) {
    console.error('Error creating trip:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
