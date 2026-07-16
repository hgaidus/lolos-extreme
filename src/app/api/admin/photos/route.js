import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { UPLOADS_DIR } from '@/lib/dataPaths';
import { readDataset } from '@/lib/adminStore';
import { getStop, getTrip, commitAndPush, commitAndPushUploads } from '@/lib/adminData';
import {
  sanitizeUploadFilename,
  checkDuplicate,
  suggestRename,
  createPhotoRecord,
  appendToTripAlbum,
} from '@/lib/adminPhotos';
import { invalidatePhotoIndex } from '@/lib/photoExists';
import { findReferencesToImageNid } from '@/lib/adminRefs';

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

// First bytes must actually look like the claimed image type — a mislabeled
// file would otherwise be served with an image content type forever.
function sniffMatchesExtension(buf, ext) {
  if (buf.length < 12) return false;
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case '.png':
      return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    case '.gif':
      return buf.slice(0, 3).toString('ascii') === 'GIF';
    case '.webp':
      return buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP';
    default:
      return false;
  }
}

// Photo listing for the manager and the editor's picker.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const stopNid = searchParams.get('stop');
    const tripNid = searchParams.get('trip');
    const orphans = searchParams.get('orphans') === '1';
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const limit = Math.min(Number(searchParams.get('limit')) || 200, 500);

    const stops = readDataset('stops');
    const stopByNid = new Map(stops.map((s) => [String(s.nid), s]));
    const stopNidsOfTrip = tripNid
      ? new Set(stops.filter((s) => String(s.parent_trip_nid) === String(tripNid)).map((s) => String(s.nid)))
      : null;

    let photos = readDataset('photos');
    if (stopNid) photos = photos.filter((p) => String(p.trip_stop_nid) === String(stopNid));
    else if (stopNidsOfTrip) photos = photos.filter((p) => stopNidsOfTrip.has(String(p.trip_stop_nid)));
    else if (orphans) photos = photos.filter((p) => !p.trip_stop_nid || p.trip_stop_nid === '0');
    if (q) {
      photos = photos.filter(
        (p) => (p.title || '').toLowerCase().includes(q) || (p.filename || '').toLowerCase().includes(q)
      );
    }

    const total = photos.length;
    const results = photos.slice(0, limit).map((p) => {
      const stop = stopByNid.get(String(p.trip_stop_nid));
      return {
        image_nid: p.image_nid,
        filename: p.filename,
        title: p.title,
        trip_stop_nid: p.trip_stop_nid || '',
        published: p.published !== false,
        stopTitle: stop ? stop.title : null,
        stopSlug: stop ? stop.slug : null,
        url: `/photos/${p.filename}`,
        references: undefined, // filled on demand below for small result sets
      };
    });

    // Reference counts are cheap (<100ms full scan) but only worth attaching
    // for manager-sized pages, not the full 7k dump.
    if (results.length <= 60) {
      for (const r of results) {
        r.references = findReferencesToImageNid(r.image_nid).length;
      }
    }

    return NextResponse.json({ total, results });
  } catch (err) {
    console.error('Error listing photos:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Upload: multipart form-data { file, title, trip_stop_nid, allowSimilar? }.
export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const title = String(form.get('title') || '').trim();
    const tripStopNid = String(form.get('trip_stop_nid') || '').trim();
    const allowSimilar = form.get('allowSimilar') === 'yes';

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'Validation failed', fields: { title: 'Required.' } }, { status: 400 });
    }
    const stop = tripStopNid ? getStop(tripStopNid) : null;
    if (tripStopNid && !stop) {
      return NextResponse.json({ error: 'Validation failed', fields: { trip_stop_nid: 'Stop not found.' } }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File is ${(file.size / 1048576).toFixed(1)}MB — the limit is 30MB.` },
        { status: 413 }
      );
    }

    const sanitized = sanitizeUploadFilename(file.name);
    if (sanitized.error) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }
    const filename = sanitized.filename;

    const buf = Buffer.from(await file.arrayBuffer());
    if (!sniffMatchesExtension(buf, path.extname(filename).toLowerCase())) {
      return NextResponse.json(
        { error: 'File contents do not match the file type — is this really an image?' },
        { status: 400 }
      );
    }

    const dup = checkDuplicate(filename);
    if (dup.fileExists) {
      return NextResponse.json(
        { error: 'file_exists', message: `A file named ${filename} already exists.`, suggestion: suggestRename(filename) },
        { status: 409 }
      );
    }
    if (dup.similarRecords.length > 0 && !allowSimilar) {
      return NextResponse.json(
        {
          error: 'possible_duplicate',
          message: 'A photo with a very similar filename already exists — this may be the same picture.',
          matches: dup.similarRecords.map((m) => ({ ...m, url: `/photos/${m.filename}` })),
        },
        { status: 409 }
      );
    }

    // Binary first, record second: the existence gate hides records whose
    // file is missing, so this order can never publish a broken image.
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const dest = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(dest, buf);
    if (fs.statSync(dest).size !== file.size) {
      fs.rmSync(dest, { force: true });
      return NextResponse.json({ error: 'Write verification failed — upload aborted.' }, { status: 500 });
    }

    const photo = createPhotoRecord({ filename, title, tripStopNid });

    let albumResult = null;
    if (stop) {
      const trip = getTrip(stop.parent_trip_nid);
      if (trip) {
        albumResult = appendToTripAlbum(trip, {
          url: `/photos/uploads/${filename}`,
          title,
          filename: `uploads/${filename}`,
          image_nid: photo.image_nid,
        });
      }
    }

    invalidatePhotoIndex();

    const gitUploads = await commitAndPushUploads(`Add photo: ${filename} (image_nid ${photo.image_nid})`);
    const gitData = await commitAndPush(
      `Add photo record: ${title} (image_nid ${photo.image_nid}${stop ? `, stop ${stop.title}` : ''})`
    );

    return NextResponse.json({
      photo: { ...photo, url: `/photos/${photo.filename}` },
      album: albumResult,
      git: gitData,
      gitUploads,
    });
  } catch (err) {
    console.error('Error uploading photo:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
