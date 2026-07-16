import { NextResponse } from 'next/server';
import { readDataset, writeDataset } from '@/lib/adminStore';
import { commitAndPush } from '@/lib/adminData';

// Album maintenance: retitle, and replace the images[] array wholesale
// (reorder / set cover = move to front / remove from album). Removing a photo
// from an album never touches its photo_titles record or the file — it just
// leaves this album's list.
export async function PATCH(request, { params }) {
  try {
    const { tid } = await params;
    const albums = readDataset('albums');
    const album = albums.find((a) => String(a.tid) === String(tid));
    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const body = await request.json();

    if ('title' in body) {
      if (typeof body.title !== 'string' || !body.title.trim()) {
        return NextResponse.json({ error: 'Validation failed', fields: { title: 'Must not be empty.' } }, { status: 400 });
      }
      album.title = body.title;
    }

    if ('images' in body) {
      if (!Array.isArray(body.images)) {
        return NextResponse.json({ error: 'Validation failed', fields: { images: 'Must be an array.' } }, { status: 400 });
      }
      // Only accept a permutation/subset of the album's existing entries,
      // identified by image_nid — the client can reorder and remove, never
      // inject records that don't belong to this album.
      const existingByNid = new Map((album.images || []).map((i) => [String(i.image_nid), i]));
      const next = [];
      const seen = new Set();
      for (const item of body.images) {
        const nid = String(item?.image_nid ?? '');
        const entry = existingByNid.get(nid);
        if (!entry) {
          return NextResponse.json(
            { error: 'Validation failed', fields: { images: `image_nid ${nid} is not in this album.` } },
            { status: 400 }
          );
        }
        if (seen.has(nid)) continue;
        seen.add(nid);
        next.push(entry);
      }
      album.images = next;
    }

    writeDataset('albums', albums);
    const git = await commitAndPush(`Edit album: ${album.title} (tid ${tid})`);

    return NextResponse.json({
      album: { tid: album.tid, title: album.title, count: (album.images || []).length },
      git,
    });
  } catch (err) {
    console.error('Error updating album:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
