import { NextResponse } from 'next/server';
import { getTrip, updateTrip, commitAndPush } from '@/lib/adminData';
import { validateTripFields, tripDateOrderError } from '@/lib/adminValidate';
import { publishTripAlbum } from '@/lib/adminPhotos';

export async function PATCH(request, { params }) {
  try {
    const { nid } = await params;
    const existing = getTrip(nid);
    if (!existing) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const body = await request.json();
    const fields = {};
    for (const key of ['title', 'author', 'year', 'travelogue', 'published', 'menu_label', 'menu_hover', 'region', 'start_date', 'end_date']) {
      if (key in body) fields[key] = body[key];
    }

    const { ok: fieldsOk, errors, values } = validateTripFields(fields, { partial: true });
    const orderError = tripDateOrderError(
      values.start_date ?? existing.start_date,
      values.end_date ?? existing.end_date
    );
    if (orderError) errors.end_date = orderError;
    const ok = fieldsOk && !orderError;
    if (!ok) {
      return NextResponse.json({ error: 'Validation failed', fields: errors }, { status: 400 });
    }

    const updated = updateTrip(nid, values);
    if (values.published === true) publishTripAlbum(updated);
    const gitResult = await commitAndPush(`Edit trip: ${updated.title} (nid ${nid})`);

    return NextResponse.json({ trip: updated, git: gitResult });
  } catch (err) {
    console.error('Error updating trip:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
