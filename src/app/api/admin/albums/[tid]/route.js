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

    // Adding is a separate field from `images` on purpose. `images` stays a
    // strict permutation/subset of what the album already holds, so the
    // reorder/remove path cannot be used to inject anything. New photos come
    // in here as bare nids and the entry is built server-side from the
    // canonical photo record — the client never supplies url/title/filename,
    // so it cannot fabricate an entry pointing at a file that isn't there.
    // Applied after `images` so additions land at the end regardless of order.
    let added = 0;
    if ('addImageNids' in body) {
      if (!Array.isArray(body.addImageNids)) {
        return NextResponse.json(
          { error: 'Validation failed', fields: { addImageNids: 'Must be an array.' } },
          { status: 400 }
        );
      }
      const photos = readDataset('photos');
      if (!Array.isArray(album.images)) album.images = [];
      const present = new Set(album.images.map((i) => String(i.image_nid)));

      for (const raw of body.addImageNids) {
        const nid = String(raw ?? '');
        const photo = photos.find((p) => String(p.image_nid) === nid);
        if (!photo) {
          return NextResponse.json(
            { error: 'Validation failed', fields: { addImageNids: `No photo with image_nid ${nid}.` } },
            { status: 400 }
          );
        }
        // Silently skip duplicates rather than erroring: adding a photo the
        // album already has is a no-op the user meant, not a mistake.
        if (present.has(nid)) continue;
        present.add(nid);
        album.images.push({
          url: `/photos/${photo.filename}`,
          title: photo.title || '',
          filename: photo.filename,
          image_nid: String(photo.image_nid),
        });
        added += 1;
      }
    }

    writeDataset('albums', albums);
    const git = await commitAndPush(
      added > 0
        ? `Add ${added} photo${added === 1 ? '' : 's'} to album: ${album.title} (tid ${tid})`
        : `Edit album: ${album.title} (tid ${tid})`
    );

    return NextResponse.json({
      album: { tid: album.tid, title: album.title, count: (album.images || []).length },
      added,
      git,
    });
  } catch (err) {
    console.error('Error updating album:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
