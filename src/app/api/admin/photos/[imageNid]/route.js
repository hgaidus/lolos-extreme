import { NextResponse } from 'next/server';
import { getStop, commitAndPush } from '@/lib/adminData';
import { getPhoto, updatePhotoRecord } from '@/lib/adminPhotos';
import { findReferencesToImageNid } from '@/lib/adminRefs';

// No DELETE by design: photos are unpublished, never deleted. Unpublishing
// hides a photo from galleries/albums/lightboxes; explicit [img_assist]
// narrative embeds keep rendering, and `references` in the response tells the
// UI to say so.
export async function PATCH(request, { params }) {
  try {
    const { imageNid } = await params;
    const existing = getPhoto(imageNid);
    if (!existing) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const body = await request.json();
    const fields = {};
    if ('title' in body) {
      if (typeof body.title !== 'string' || !body.title.trim()) {
        return NextResponse.json({ error: 'Validation failed', fields: { title: 'Must not be empty.' } }, { status: 400 });
      }
      fields.title = body.title;
    }
    if ('trip_stop_nid' in body) {
      const v = String(body.trip_stop_nid || '').trim();
      if (v && !getStop(v)) {
        return NextResponse.json({ error: 'Validation failed', fields: { trip_stop_nid: 'Stop not found.' } }, { status: 400 });
      }
      fields.trip_stop_nid = v;
    }
    if ('published' in body) {
      if (typeof body.published !== 'boolean') {
        return NextResponse.json({ error: 'Validation failed', fields: { published: 'Must be true or false.' } }, { status: 400 });
      }
      fields.published = body.published;
    }
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'No editable fields in request.' }, { status: 400 });
    }

    const updated = updatePhotoRecord(imageNid, fields);
    const references = findReferencesToImageNid(imageNid);
    const git = await commitAndPush(`Edit photo: ${updated.title} (image_nid ${imageNid})`);

    return NextResponse.json({
      photo: { ...updated, published: updated.published !== false, url: `/photos/${updated.filename}` },
      references,
      git,
    });
  } catch (err) {
    console.error('Error updating photo:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
