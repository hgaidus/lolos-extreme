import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { path: pathArray } = await params;
    let filename = pathArray.join('/');
    filename = filename.replace(/^sites\/default\/files\/(?:images\/)?/i, '');
    
    // Check candidate directories including subdirectories
    const baseDirs = [
      path.normalize("y:\\Lolos_Migration_Data\\files\\images"),
      path.normalize("y:\\Lolos_Migration_Data\\files\\images\\1k"),
      path.normalize("y:\\Lolos_Migration_Data\\files\\images\\2k"),
      path.normalize("y:\\Lolos_Migration_Data\\files\\images\\3k"),
      path.normalize("y:\\Lolos_Migration_Data\\files\\images\\4k"),
      path.normalize("y:\\Lolos_Migration_Data\\files\\images\\5k"),
      path.normalize("y:\\Lolos_Migration_Data\\files\\images\\6k"),
      path.normalize("y:\\Lolos_Migration_Data\\files\\images\\7k"),
      path.normalize("y:\\Lolos_Migration_Data\\files\\images\\8k"),
      path.normalize("y:\\Lolos_Migration_Data\\files\\images-old"),
      path.normalize("y:\\Lolos_Migration_Data\\files")
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
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    const contentType = mimeTypes[extReal] || 'application/octet-stream';

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
