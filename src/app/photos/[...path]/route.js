import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { FILES_DIR, UPLOADS_DIR } from '@/lib/dataPaths';

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

export async function GET(request, { params }) {
  try {
    const { path: pathArray } = await params;
    let filename = pathArray.join('/');
    filename = filename.replace(/^sites\/default\/files\/(?:images\/)?/i, '');

    // CMS uploads live in their own git-backed directory and are served by
    // exact name — they're CMS-controlled, so none of the legacy fuzzy tiers
    // apply, and an early exit keeps them out of the 22k-file search space.
    const uploadsMatch = filename.match(/^uploads\/(.+)$/i);
    if (uploadsMatch) {
      const rel = path.normalize(uploadsMatch[1]);
      // No traversal out of UPLOADS_DIR, and never serve repo internals.
      if (rel.startsWith('..') || path.isAbsolute(rel) || rel.split(/[\\/]/)[0] === '.git') {
        return new NextResponse('Image Not Found', { status: 404 });
      }
      const uploadPath = path.join(UPLOADS_DIR, rel);
      if (!fs.existsSync(uploadPath) || !fs.statSync(uploadPath).isFile()) {
        return new NextResponse('Image Not Found', { status: 404 });
      }
      return new NextResponse(fs.readFileSync(uploadPath), {
        status: 200,
        headers: {
          'Content-Type': MIME_TYPES[path.extname(uploadPath).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Check candidate directories including subdirectories
    const baseDirs = [
      path.join(FILES_DIR, "images"),
      path.join(FILES_DIR, "images", "1k"),
      path.join(FILES_DIR, "images", "2k"),
      path.join(FILES_DIR, "images", "3k"),
      path.join(FILES_DIR, "images", "4k"),
      path.join(FILES_DIR, "images", "5k"),
      path.join(FILES_DIR, "images", "6k"),
      path.join(FILES_DIR, "images", "7k"),
      path.join(FILES_DIR, "images", "8k"),
      path.join(FILES_DIR, "images-old"),
      path.join(FILES_DIR, "images-old", "1k"),
      path.join(FILES_DIR, "images-old", "2k"),
      path.join(FILES_DIR, "images-old", "3k"),
      path.join(FILES_DIR, "images-old", "4k"),
      path.join(FILES_DIR, "images-old", "5k"),
      path.join(FILES_DIR, "images-old", "6k"),
      path.join(FILES_DIR, "images-old", "7k"),
      path.join(FILES_DIR, "images-old", "8k"),
      FILES_DIR
    ];

    // Strip any modifier (.preview, .thumbnail, .mini) to find the stem and extension
    const cleanNoMod = filename.replace(/\.(preview|thumbnail|mini)\./i, '.');
    const ext = path.extname(cleanNoMod);
    const stem = cleanNoMod.slice(0, -ext.length);

    // Normalizations for stems: strip copy suffixes and Drupal export modifiers
    const stems = Array.from(new Set([
      stem,
      stem.replace(/\s*\(\d+\)$/, ''),
      stem.replace(/~\d+$/, ''),
      stem.replace(/_exported_\d+([~_]\d+)*$/, ''),
      stem.replace(/\.(RAW-01|COVER|NIGHT_|_)+/g, ''),
      stem.replace(/(_exported_\d+|~\d+|\s*\(\d+\)|\.(RAW-01|COVER|NIGHT_|_)+)/g, '')
    ])).filter(Boolean);

    // TIER 1: High-Resolution Exact & Modified Candidates (Originals & Previews ONLY)
    const highResCandidates = [];
    if (!filename.includes('.mini.') && !filename.includes('.thumbnail.')) {
      highResCandidates.push(filename);
    }
    for (const st of stems) {
      highResCandidates.push(`${st}${ext}`, `${st}.jpg`, `${st}.jpeg`, `${st}.png`, `${st}.JPG`, `${st}.JPEG`);
      highResCandidates.push(`${st}.preview${ext}`, `${st}.preview.jpg`, `${st}.preview.jpeg`, `${st}.preview.png`);
    }
    const uniqueHighRes = Array.from(new Set(highResCandidates));

    let filePath = null;
    for (const fName of uniqueHighRes) {
      for (const dir of baseDirs) {
        const candidate = path.join(dir, fName);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          filePath = candidate;
          break;
        }
      }
      if (filePath) break;
    }

    if (!filePath) {
      for (const fName of uniqueHighRes) {
        const baseName = path.basename(fName);
        for (const dir of baseDirs) {
          const candidate = path.join(dir, baseName);
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            filePath = candidate;
            break;
          }
        }
        if (filePath) break;
      }
    }

    // TIER 2: High-Resolution Fuzzy Matching across stems (strictly ignore .mini and .thumbnail files!)
    if (!filePath) {
      for (const st of stems) {
        const baseStem = path.basename(st);
        if (!baseStem || baseStem.length < 3) continue;
        for (const dir of baseDirs) {
          try {
            const files = fs.readdirSync(dir);
            const matches = files.filter(f => {
              if (f.includes('.mini.') || f.includes('.thumbnail.')) return false;
              const lowerF = f.toLowerCase();
              const lowerStem = baseStem.toLowerCase();
              return (lowerF.startsWith(lowerStem + ".") || lowerF.startsWith(lowerStem + "_") || lowerF.startsWith(lowerStem + "~") || lowerF.startsWith(lowerStem + " ") || (baseStem.length > 6 && lowerF.includes(lowerStem))) &&
                     (lowerF.endsWith('.jpg') || lowerF.endsWith('.jpeg') || lowerF.endsWith('.png') || lowerF.endsWith('.gif') || lowerF.endsWith('.webp'));
            });
            if (matches.length > 0) {
              matches.sort((a, b) => {
                try {
                  return fs.statSync(path.join(dir, b)).size - fs.statSync(path.join(dir, a)).size;
                } catch (e) { return 0; }
              });
              for (const m of matches) {
                const candidate = path.join(dir, m);
                if (fs.statSync(candidate).isFile()) {
                  filePath = candidate;
                  break;
                }
              }
              if (filePath) break;
            }
          } catch (e) {}
        }
        if (filePath) break;
      }
    }

    // TIER 3: Thumbnails (Exact & Fuzzy) - only if no Original/Preview exists anywhere on disk
    if (!filePath) {
      const thumbCandidates = [];
      for (const st of stems) {
        thumbCandidates.push(`${st}.thumbnail${ext}`, `${st}.thumbnail.jpg`, `${st}.thumbnail.jpeg`, `${st}.thumbnail.png`);
      }
      for (const fName of thumbCandidates) {
        for (const dir of baseDirs) {
          const candidate = path.join(dir, fName);
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            filePath = candidate;
            break;
          }
        }
        if (filePath) break;
      }
      if (!filePath) {
        for (const st of stems) {
          const baseStem = path.basename(st);
          if (!baseStem || baseStem.length < 3) continue;
          for (const dir of baseDirs) {
            try {
              const files = fs.readdirSync(dir);
              const matches = files.filter(f => f.includes('.thumbnail.') && f.toLowerCase().includes(baseStem.toLowerCase()));
              if (matches.length > 0) {
                matches.sort((a, b) => fs.statSync(path.join(dir, b)).size - fs.statSync(path.join(dir, a)).size);
                filePath = path.join(dir, matches[0]);
                break;
              }
            } catch (e) {}
          }
          if (filePath) break;
        }
      }
    }

    // TIER 4: Minis (Exact & Fuzzy) - absolute last resort
    if (!filePath) {
      const miniCandidates = [];
      for (const st of stems) {
        miniCandidates.push(`${st}.mini${ext}`, `${st}.mini.jpg`, `${st}.mini.jpeg`, `${st}.mini.png`);
      }
      for (const fName of miniCandidates) {
        for (const dir of baseDirs) {
          const candidate = path.join(dir, fName);
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            filePath = candidate;
            break;
          }
        }
        if (filePath) break;
      }
    }

    if (!filePath) {
      return new NextResponse("Image Not Found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    // Determine mime type
    const extReal = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extReal] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (err) {
    console.error("Error serving photo:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
