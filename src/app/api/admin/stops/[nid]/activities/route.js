import { NextResponse } from 'next/server';
import { getStop, commitAndPush } from '@/lib/adminData';
import { getActivitiesForStop, createActivity } from '@/lib/adminActivities';
import { validateActivityFields } from '@/lib/adminValidate';

export async function GET(request, { params }) {
  try {
    const { nid } = await params;
    if (!getStop(nid)) {
      return NextResponse.json({ error: 'Stop not found' }, { status: 404 });
    }
    const activities = getActivitiesForStop(nid).map((a) => ({
      nid: a.nid,
      title: a.title,
      narrative: a.narrative || '',
      activity_type: a.activity_type || '',
      rating: a.rating || '',
      published: a.published !== false,
    }));
    return NextResponse.json({ activities });
  } catch (err) {
    console.error('Error listing activities:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { nid } = await params;
    const stop = getStop(nid);
    if (!stop) {
      return NextResponse.json({ error: 'Stop not found' }, { status: 404 });
    }

    const body = await request.json();
    const fields = {};
    for (const key of ['title', 'activity_type', 'narrative', 'rating', 'published']) {
      if (key in body) fields[key] = body[key];
    }

    const { ok, errors, values } = validateActivityFields(fields, { partial: false });
    if (!ok) {
      return NextResponse.json({ error: 'Validation failed', fields: errors }, { status: 400 });
    }

    const activity = createActivity(nid, values);
    const gitResult = await commitAndPush(
      `Add activity: ${activity.title} (nid ${activity.nid}) to stop ${stop.title}`
    );

    return NextResponse.json({ activity, git: gitResult });
  } catch (err) {
    console.error('Error creating activity:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
