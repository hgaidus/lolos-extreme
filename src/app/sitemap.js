import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '@/lib/dataPaths';

const BASE_URL = 'https://cross-country-trips.com';

// Regenerate at most hourly, so stops/trips added or edited through the CMS
// show up in the sitemap within an hour without needing a redeploy.
export const revalidate = 3600;

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
  } catch {
    return [];
  }
}

function toDate(unixSeconds) {
  if (!unixSeconds) return undefined;
  const d = new Date(Number(unixSeconds) * 1000);
  return isNaN(d.getTime()) ? undefined : d;
}

function cleanPath(slug) {
  return '/' + String(slug).replace(/^\/+/, '');
}

// Matches the slugification used by src/app/activities/[type]/page.js
function slugifyActivityType(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function sitemap() {
  const trips = readJSON('trips.json');
  const stops = readJSON('stops.json');
  const pages = readJSON('standalone_pages.json');
  const albums = readJSON('albums.json');
  const activities = readJSON('activities.json');

  const entries = [];
  const seen = new Set();
  const add = (urlPath, { lastModified, changeFrequency, priority } = {}) => {
    const url = BASE_URL + urlPath;
    if (seen.has(url)) return;
    seen.add(url);
    entries.push({ url, lastModified, changeFrequency, priority });
  };

  // Homepage + key section landing pages
  add('/', { changeFrequency: 'weekly', priority: 1.0 });
  for (const p of [
    '/trip-index', '/photo-albums', '/trip-stops-map', '/travel-itineraries',
    '/cross-country-road-trip', '/east-coast-road-trip', '/west-coast-road-trip',
    '/international-trips', '/search', '/activities',
  ]) {
    add(p, { changeFrequency: 'monthly', priority: 0.7 });
  }

  // Trips
  for (const t of trips) {
    if (!t.slug) continue;
    add(cleanPath(t.slug), { lastModified: toDate(t.created), changeFrequency: 'yearly', priority: 0.9 });
  }

  // Stops
  for (const s of stops) {
    if (!s.slug) continue;
    add(cleanPath(s.slug), { lastModified: toDate(s.arrival_date || s.created), changeFrequency: 'yearly', priority: 0.6 });
  }

  // Standalone pages (skip the excluded 'tips' type — those 404 by design)
  for (const p of pages) {
    if (!p.slug || p.type === 'tips') continue;
    add(cleanPath(p.slug), { lastModified: toDate(p.created), changeFrequency: 'yearly', priority: 0.5 });
  }

  // Photo album pages (album.slug already includes the "photo-albums/" prefix)
  for (const a of albums) {
    if (!a.slug) continue;
    add(cleanPath(a.slug), { changeFrequency: 'yearly', priority: 0.5 });
  }

  // Activity-type listing pages
  const activityTypes = new Set();
  for (const act of activities) {
    if (act.activity_type) {
      const slug = slugifyActivityType(act.activity_type);
      if (slug) activityTypes.add(slug);
    }
  }
  for (const type of activityTypes) {
    add(`/activities/${type}`, { changeFrequency: 'monthly', priority: 0.4 });
  }

  return entries;
}
