import { NextResponse } from 'next/server';
import { currentUserName } from '@/lib/adminSession';
import { createTrip, commitAndPush } from '@/lib/adminData';
import { validateNewTripFields, tripDateOrderError } from '@/lib/adminValidate';

// Create a new trip. It is born as a DRAFT (published: false): invisible to
// the public everywhere, but already holding its computed slot in the nav
// menu and trip index, which it takes the moment it's published.
export async function POST(request) {
  try {
    const body = await request.json();
    const fields = {};
    for (const key of ['title', 'year', 'start_date', 'end_date', 'region', 'menu_label', 'menu_hover', 'author', 'map_image', 'travelogue']) {
      if (key in body) fields[key] = body[key];
    }

    // Attribute new content to whoever is signed in unless they said otherwise.
    if (!fields.author) fields.author = await currentUserName();

    // The form asks for dates, not a year; the year every menu and index sorts
    // on is simply the year the trip started.
    if (!fields.year && typeof fields.start_date === 'string') fields.year = fields.start_date.slice(0, 4);

    const { ok: fieldsOk, errors, values } = validateNewTripFields(fields);
    const orderError = tripDateOrderError(values.start_date, values.end_date);
    if (orderError) errors.end_date = orderError;
    // Year is derived, so its error would point at a field the form doesn't have.
    if (errors.start_date) delete errors.year;
    const ok = fieldsOk && !orderError;
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
