import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IMAGE_CACHE_DIR } from './dataPaths';
import { ALLOWED_WIDTHS } from './imageSizes';

export { ALLOWED_WIDTHS };

// Resized derivatives for the public photo route.
//
// Why this exists: album grids and in-page photos were pointing at the full
// originals. One album page was 56.7 MB across 28 thumbnails (~2 MB each),
// which is slow for readers on a phone and poor for Google Images, where page
// experience is part of how images are ranked.
//
// Derivatives are written to a cache directory OUTSIDE the app and outside the
// uploads and content git repos, so a deploy (which replaces app/ wholesale)
// does not discard them and git never sees them.

// Only the widths in imageSizes.js are honoured. An open-ended ?w= lets anyone
// fill the disk with thousands of one-off sizes; a fixed set keeps it bounded.

// Animation and vector survive nothing useful through a raster resize.
const RESIZABLE = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function isResizable(filePath) {
  return RESIZABLE.has(path.extname(filePath).toLowerCase());
}

export function parseWidth(value) {
  const n = Number(value);
  return ALLOWED_WIDTHS.includes(n) ? n : null;
}

// Keyed on the source's identity AND its mtime/size, so replacing a photo with
// the same name can never serve the previous picture from cache.
function cacheKey(filePath, stat, width, format) {
  const h = crypto.createHash('sha1')
    .update(`${filePath}|${stat.mtimeMs}|${stat.size}|${width}|${format}`)
    .digest('hex');
  return `${h}.${format}`;
}

/**
 * Returns {buffer, contentType} for a resized copy, or null to fall back to
 * the original. Null is returned for every failure path on purpose: a photo
 * that renders large is a much smaller problem than a photo that doesn't
 * render at all, so nothing here is allowed to throw into the route.
 */
export async function resizedImage(filePath, width, { preferWebp = false } = {}) {
  try {
    if (!isResizable(filePath)) return null;

    const stat = fs.statSync(filePath);
    const format = preferWebp ? 'webp' : 'jpeg';
    const contentType = format === 'webp' ? 'image/webp' : 'image/jpeg';
    const cachePath = path.join(IMAGE_CACHE_DIR, cacheKey(filePath, stat, width, format));

    if (fs.existsSync(cachePath)) {
      return { buffer: fs.readFileSync(cachePath), contentType, cached: true };
    }

    // Imported lazily so a missing or broken sharp degrades to originals
    // instead of taking down every image on the site at module load.
    const sharp = (await import('sharp')).default;

    const pipeline = sharp(filePath, { failOn: 'none' })
      // withoutEnlargement: a 300px-wide original must not be upscaled to 800
      // and served as though it were sharper than it is.
      .rotate()
      .resize({ width, withoutEnlargement: true });

    const buffer = await (format === 'webp'
      ? pipeline.webp({ quality: 82 })
      : pipeline.jpeg({ quality: 82, mozjpeg: true })
    ).toBuffer();

    try {
      fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
      // Write-then-rename so a request that arrives mid-write never reads a
      // half-written file.
      const tmp = `${cachePath}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, buffer);
      fs.renameSync(tmp, cachePath);
    } catch {
      // A read-only or full disk means no caching, not no image.
    }

    return { buffer, contentType, cached: false };
  } catch (err) {
    console.error('Image resize failed, serving original:', filePath, err?.message);
    return null;
  }
}
