import { NextResponse } from 'next/server';
import { getStop, updateStop, commitAndPush } from '@/lib/adminData';
import { validateStopFields } from '@/lib/adminValidate';

const EDITABLE_FIELDS = [
  'title', 'description', 'travelogue', 'miles', 'hours', 'nights',
  'arrival_date', 'author', 'state', 'category', 'published',
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

    const { ok, errors, values } = validateStopFields(fields, { partial: true });
    if (!ok) {
      return NextResponse.json({ error: 'Validation failed', fields: errors }, { status: 400 });
    }

    const updated = updateStop(nid, values);
    const gitResult = await commitAndPush(`Edit stop: ${updated.title} (nid ${nid})`);

    return NextResponse.json({ stop: updated, git: gitResult });
  } catch (err) {
    console.error('Error updating stop:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
