import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '@/lib/dataPaths';
import { photoFileExists } from '@/lib/photoExists';

let cachedData = null;

function loadData() {
  if (cachedData) return cachedData;
  try {
    const albumsObj = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "albums.json"), "utf-8"));
    const titlesObj = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "photo_titles.json"), "utf-8"));

    cachedData = {
      albumsObj: Array.isArray(albumsObj) ? albumsObj : Object.values(albumsObj),
      titlesObj: Array.isArray(titlesObj) ? titlesObj : Object.values(titlesObj)
    };
  } catch (err) {
    console.error("Error loading photo album dataset:", err);
    cachedData = {
      albumsObj: [],
      titlesObj: []
    };
  }
  return cachedData;
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

export function getPhotosForAlbum(albumOrSlug) {
  const albums = getCleanAlbums();
  
  let album = null;
  if (typeof albumOrSlug === 'object' && albumOrSlug !== null) {
    album = albumOrSlug;
  } else if (typeof albumOrSlug === 'string') {
    const cleanSlug = albumOrSlug.replace(/^\/|\/$/g, '');
    const tail = cleanSlug.split('/').pop().toLowerCase();
    
    album = albums.find(a => {
      const aSlug = (a.slug || '').replace(/^\/|\/$/g, '').toLowerCase();
      const aTail = aSlug.split('/').pop();
      const aTitle = (a.title || '').toLowerCase();
      return aSlug === cleanSlug || aTail === tail || aTitle === albumOrSlug.toLowerCase() || String(a.tid) === String(albumOrSlug);
    });
  }

  if (album && Array.isArray(album.images) && album.images.length > 0) {
    return album.images
      .filter(img => photoFileExists(img.filename || img.url))
      .map((img, idx) => ({
        url: img.url.startsWith('/') ? img.url : `/photos/${img.filename || img.url}`,
        title: img.title || `${album.title} Slide #${idx + 1}`,
        filename: img.filename,
        image_nid: img.image_nid
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
      title: t.title || `${query} Slide #${idx + 1}`
    }));
}

export function getAlbumPreviewPhoto(albumOrSlug) {
  const p = getPhotosForAlbum(albumOrSlug);
  return p.length > 0 ? p[0].url : null;
}
