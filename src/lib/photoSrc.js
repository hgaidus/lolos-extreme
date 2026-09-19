import { ALLOWED_WIDTHS } from './imageSizes';

// Ask the photo route for a sensibly sized copy instead of the full original.
//
// Grids were rendering multi-megabyte originals into ~200px boxes — one album
// page came to 56.7 MB across 28 thumbnails. Slow pages are bad for readers on
// a phone and bad for Google Images, where page experience counts toward how
// images rank.
//
// Only /photos/ URLs are touched. Anything else (an absolute URL, a static
// asset) is returned unchanged, so this is safe to apply blindly.
const isPhotoPath = (url) => typeof url === 'string' && url.startsWith('/photos/');

export function photoSrc(url, width) {
  if (!isPhotoPath(url) || !ALLOWED_WIDTHS.includes(width)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
}

// A 2x entry for high-density screens — the phones and laptops most of these
// photos are actually viewed on.
export function photoSrcSet(url, width) {
  if (!isPhotoPath(url)) return undefined;
  const double = ALLOWED_WIDTHS.find((w) => w >= width * 2);
  if (!double || double === width) return undefined;
  return `${photoSrc(url, width)} 1x, ${photoSrc(url, double)} 2x`;
}
