import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '@/lib/dataPaths';
import { photoFileExists } from '@/lib/photoExists';
import { unescapeDrupalText } from '@/utils/cleanContent';
import { makeVersioned, getDataVersion } from '@/lib/dataVersion';

// Rebuilt when the content JSON changes on disk, so CMS photo/album writes
// show up in albums and lightbox stop-links without a process restart.
const dataCache = makeVersioned(buildData, getDataVersion);

function loadData() {
  return dataCache.get();
}

function buildData() {
  try {
    const albumsObj = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "albums.json"), "utf-8"));
    const titlesObj = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "photo_titles.json"), "utf-8"));
    const stopsObj = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "stops.json"), "utf-8"));

    const albums = (Array.isArray(albumsObj) ? albumsObj : Object.values(albumsObj)).map(a => ({
      ...a,
      images: Array.isArray(a.images) ? a.images.map(img => ({ ...img, title: unescapeDrupalText(img.title) })) : a.images
    }));
    const titles = (Array.isArray(titlesObj) ? titlesObj : Object.values(titlesObj)).map(t => ({
      ...t,
      title: unescapeDrupalText(t.title)
    }));
    const stops = Array.isArray(stopsObj) ? stopsObj : Object.values(stopsObj);

    const stopByNid = new Map(stops.map(s => [String(s.nid), s]));
    const stopNidByImageNid = new Map(titles.map(t => [String(t.image_nid), t.trip_stop_nid]));

    return {
      albumsObj: albums,
      titlesObj: titles,
      stopByNid,
      stopNidByImageNid
    };
  } catch (err) {
    console.error("Error loading photo album dataset:", err);
    return {
      albumsObj: [],
      titlesObj: [],
      stopByNid: new Map(),
      stopNidByImageNid: new Map()
    };
  }
}

// Given an image's nid and/or a directly-known trip_stop_nid, resolve the
// trip stop it was taken at (if any) so the lightbox can link back to it.
function resolveStop(imageNid, tripStopNid) {
  const { stopByNid, stopNidByImageNid } = loadData();
  const nid = tripStopNid || (imageNid ? stopNidByImageNid.get(String(imageNid)) : null);
  if (!nid) return null;
  const stop = stopByNid.get(String(nid));
  return stop ? { stopSlug: stop.slug, stopTitle: stop.title } : null;
}

function getYearFromTitle(title) {
  const match = (title || '').match(/^(\d{4})/);
  if (match) return parseInt(match[1], 10);
  if ((title || '').includes('East Coast')) return 1998;
  return 0;
}

export function getCleanAlbums() {
  const { albumsObj } = loadData();
  const filtered = albumsObj.filter(a => {
    if (!a || !a.title || !a.slug) return false;
    const t = a.title.toLowerCase();
    const s = a.slug.toLowerCase();
    return !t.endsWith('/feed') && !s.endsWith('/feed');
  });
  return filtered.sort((a, b) => {
    const yA = getYearFromTitle(a.title);
    const yB = getYearFromTitle(b.title);
    if (yB !== yA) return yB - yA;
    return (a.weight || 0) - (b.weight || 0) || parseInt(b.tid || 0) - parseInt(a.tid || 0);
  });
}

export function findAlbumBySlug(albumOrSlug) {
  const albums = getCleanAlbums();

  if (typeof albumOrSlug === 'object' && albumOrSlug !== null) {
    return albumOrSlug;
  }
  if (typeof albumOrSlug === 'string') {
    const cleanSlug = albumOrSlug.replace(/^\/|\/$/g, '');
    const tail = cleanSlug.split('/').pop().toLowerCase();

    return albums.find(a => {
      const aSlug = (a.slug || '').replace(/^\/|\/$/g, '').toLowerCase();
      const aTail = aSlug.split('/').pop();
      const aTitle = (a.title || '').toLowerCase();
      return aSlug === cleanSlug || aTail === tail || aTitle === albumOrSlug.toLowerCase() || String(a.tid) === String(albumOrSlug);
    }) || null;
  }
  return null;
}

export function getPhotosForAlbum(albumOrSlug) {
  const album = findAlbumBySlug(albumOrSlug);

  if (album && Array.isArray(album.images) && album.images.length > 0) {
    return album.images
      .filter(img => photoFileExists(img.filename || img.url))
      .map((img, idx) => ({
        url: img.url.startsWith('/') ? img.url : `/photos/${img.filename || img.url}`,
        title: img.title || `${album.title} Slide #${idx + 1}`,
        filename: img.filename,
        image_nid: img.image_nid,
        ...resolveStop(img.image_nid, null)
      }));
  }

  // Fallback if not found in authoritative list
  const { titlesObj } = loadData();
  const query = typeof albumOrSlug === 'string' ? albumOrSlug : (album?.title || '');
  const yearMatch = query.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : null;

  let results = titlesObj.filter(p => {
    if (!p) return false;
    const fn = (p.filename || '').toLowerCase();
    const ttl = (p.title || '').toLowerCase();
    if (year && (fn.includes(year) || ttl.includes(year))) return true;
    return false;
  });

  if (results.length === 0) {
    return [];
  }

  return results
    .filter(t => t.filename && photoFileExists(t.filename))
    .map((t, idx) => ({
      url: `/photos/${t.filename}`,
      title: t.title || `${query} Slide #${idx + 1}`,
      ...resolveStop(t.image_nid, t.trip_stop_nid)
    }));
}

// Only the first usable photo is needed for a thumbnail, so stop at it rather
// than resolving the whole album. The index renders 85 thumbnails; going
// through getPhotosForAlbum meant existence-checking and stop-resolving all
// ~6,600 images across every album on each request.
export function getAlbumPreviewPhoto(albumOrSlug) {
  const album = findAlbumBySlug(albumOrSlug);

  if (album && Array.isArray(album.images) && album.images.length > 0) {
    for (const img of album.images) {
      const name = img.filename || img.url;
      if (!name || !photoFileExists(name)) continue;
      return img.url && img.url.startsWith('/') ? img.url : `/photos/${name}`;
    }
    return null;
  }

  // Albums without an images list fall back to the slower title/year scan.
  const p = getPhotosForAlbum(albumOrSlug);
  return p.length > 0 ? p[0].url : null;
}
