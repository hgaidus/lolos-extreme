import { NextResponse } from 'next/server';
import { getStop, updateStop, commitAndPush } from '@/lib/adminData';

const EDITABLE_FIELDS = [
  'title', 'description', 'travelogue', 'miles', 'hours', 'nights',
  'arrival_date', 'author', 'state', 'category',
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

    const updated = updateStop(nid, fields);
    const gitResult = await commitAndPush(`Edit stop: ${updated.title} (nid ${nid})`);

    return NextResponse.json({ stop: updated, git: gitResult });
  } catch (err) {
    console.error('Error updating stop:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
