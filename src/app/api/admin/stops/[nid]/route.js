import { NextResponse } from 'next/server';
import { getStop, getTrip, updateStop, commitAndPush } from '@/lib/adminData';
import { claimEmbeddedPhotos } from '@/lib/adminPhotos';
import { validateStopFields, coordinatePairError } from '@/lib/adminValidate';

const EDITABLE_FIELDS = [
  'title', 'description', 'travelogue', 'miles', 'hours', 'nights',
  'arrival_date', 'author', 'state', 'category', 'published', 'lat', 'lng',
];

export async function PATCH(request, { params }) {
  try {
    const { nid } = await params;
    const existing = getStop(nid);
    if (!existing) {
      return NextResponse.json({ error: 'Stop not found' }, { status: 404 });
    }

    const body = await request.json();
    const fields = {};
    for (const key of EDITABLE_FIELDS) {
      if (key in body) fields[key] = body[key];
    }

    const { ok: fieldsOk, errors, values } = validateStopFields(fields, { partial: true });
    // Only when each half is individually valid — otherwise this would bury
    // "must be between -90 and 90" under "needed along with the longitude".
    const pairError = errors.lat || errors.lng ? {} : coordinatePairError(
      'lat' in values ? values.lat : existing.lat,
      'lng' in values ? values.lng : existing.lng
    );
    Object.assign(errors, pairError);
    const ok = fieldsOk && !Object.keys(pairError).length;
    if (!ok) {
      return NextResponse.json({ error: 'Validation failed', fields: errors }, { status: 400 });
    }

    const updated = updateStop(nid, values);
    // Before the commit, so the stop and its photo links land together.
    claimEmbeddedPhotos(updated, getTrip(updated.parent_trip_nid));
    const gitResult = await commitAndPush(`Edit stop: ${updated.title} (nid ${nid})`);

    return NextResponse.json({ stop: updated, git: gitResult });
  } catch (err) {
    console.error('Error updating stop:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
