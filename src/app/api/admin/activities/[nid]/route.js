import { NextResponse } from 'next/server';
import { commitAndPush } from '@/lib/adminData';
import { getActivity, updateActivity } from '@/lib/adminActivities';
import { validateActivityFields } from '@/lib/adminValidate';

// PATCH only — activities are never deletable from the CMS; unpublish instead.
export async function PATCH(request, { params }) {
  try {
    const { nid } = await params;
    if (!getActivity(nid)) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const body = await request.json();
    const fields = {};
    for (const key of ['title', 'activity_type', 'narrative', 'rating', 'published']) {
      if (key in body) fields[key] = body[key];
    }

    const { ok, errors, values } = validateActivityFields(fields, { partial: true });
    if (!ok) {
      return NextResponse.json({ error: 'Validation failed', fields: errors }, { status: 400 });
    }

    const updated = updateActivity(nid, values);
    const gitResult = await commitAndPush(`Edit activity: ${updated.title} (nid ${nid})`);

    return NextResponse.json({ activity: updated, git: gitResult });
  } catch (err) {
    console.error('Error updating activity:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
