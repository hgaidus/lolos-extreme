import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { FILES_DIR } from '@/lib/dataPaths';

export async function GET(request, { params }) {
  try {
    const { path: pathArray } = await params;
    const filename = pathArray.join('/');

    // Check candidate directories
    const baseDirs = [
      FILES_DIR,
      path.join(FILES_DIR, "images"),
      path.join(FILES_DIR, "images-old")
    ];

    let filePath = null;
    for (const dir of baseDirs) {
      const candidate = path.join(dir, filename);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        filePath = candidate;
        break;
      }
    }

    if (!filePath) {
      const baseName = path.basename(filename);
      for (const dir of baseDirs) {
        const candidate = path.join(dir, baseName);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          filePath = candidate;
          break;
        }
      }
    }

    if (!filePath) {
      return new NextResponse("File Not Found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.flv': 'video/x-flv'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (err) {
    console.error("Error serving file:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
