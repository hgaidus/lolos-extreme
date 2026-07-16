import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { FILES_DIR, UPLOADS_DIR } from '@/lib/dataPaths';

// Small-image endpoint for admin grids. The public /photos route deliberately
// UPGRADES thumbnail requests to the full original (right for the site, fatal
// for a 60-row manager grid: 60 × ~4MB). This admin-only route goes the other
// way: prefer the Drupal-era .thumbnail/.mini/.preview derivative sitting next
// to the file, fall back to the original (new CMS uploads have no derivatives,
// and showing a handful of recent uploads full-size is fine).

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };

function candidateDirs(rel) {
  const norm = rel.replace(/^sites\/default\/files\/(?:images\/)?/i, '');
  if (/^uploads\//i.test(norm)) {
    return [{ dir: UPLOADS_DIR, name: norm.replace(/^uploads\//i, '') }];
  }
  // Derivatives don't reliably share the original's tier dir (e.g. the
  // original at 2k/2000cc00.jpg has its .thumbnail in 3k/), so search every
  // tier by basename rather than trusting the record's own prefix.
  const base = path.basename(norm);
  const dirs = [
    path.join(FILES_DIR, 'images'),
    ...['1k', '2k', '3k', '4k', '5k', '6k', '7k', '8k'].map((t) => path.join(FILES_DIR, 'images', t)),
    path.join(FILES_DIR, 'images-old'),
    FILES_DIR,
  ];
  return dirs.map((dir) => ({ dir, name: base }));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const f = searchParams.get('f') || '';
    const rel = path.normalize(f).replace(/\\/g, '/');
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const serve = (p, ext) =>
      new NextResponse(fs.readFileSync(p), {
        status: 200,
        headers: {
          'Content-Type': MIME[ext.toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'private, max-age=3600',
        },
      });

    const dirs = candidateDirs(rel);

    // Pass 1: any small derivative, in any tier dir, before ever touching an
    // original — otherwise the original's own dir wins and we ship megabytes.
    for (const suffix of ['thumbnail', 'mini', 'preview']) {
      for (const { dir, name } of dirs) {
        const nExt = path.extname(name);
        const p = path.join(dir, `${name.slice(0, -nExt.length)}.${suffix}${nExt}`);
        if (fs.existsSync(p) && fs.statSync(p).isFile()) return serve(p, nExt);
      }
    }
    // Pass 2: the original (new CMS uploads have no derivatives).
    for (const { dir, name } of dirs) {
      const p = path.join(dir, name);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return serve(p, path.extname(name));
    }
    return new NextResponse('Not Found', { status: 404 });
  } catch (err) {
    console.error('Error serving admin thumb:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
