import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './dataPaths';
import { cleanDrupalContent } from '@/utils/cleanContent';

// Loaded once per server process; photo_titles.json is large and read-only
// here (the CMS never writes it), so caching it is safe.
let cachedPhotoTitles = null;
function getPhotoTitles() {
  if (cachedPhotoTitles) return cachedPhotoTitles;
  try {
    cachedPhotoTitles = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'photo_titles.json'), 'utf-8')
    );
  } catch {
    cachedPhotoTitles = [];
  }
  return cachedPhotoTitles;
}

// Mirrors the rawText assembly in src/app/[...slug]/page.js so the admin
// preview renders through the exact same pipeline the public page uses.
// Keep in sync with that file if the display logic there changes.
function buildRawText({ type, travelogue = '', description = '' }) {
  const t = travelogue || '';
  const d = description || '';

  if (type === 'trip') {
    return t;
  }

  // Stop: when a distinct short description exists, the public page appends it
  // below the travelogue in an italic callout box (same markup/classes).
  if (d.trim() && t && d !== t) {
    return (
      t +
      `\n\n<hr />\n\n<div class="trip-description-box bg-[#c1593a]/[0.07] border-l-4 border-[#c1593a] rounded text-[#4a4437] italic font-medium leading-relaxed">${d}</div>`
    );
  }
  return t || d;
}

/**
 * Render a draft stop/trip body to the same cleaned HTML the public site shows.
 * @param {{type?: 'stop'|'trip', travelogue?: string, description?: string}} draft
 * @returns {string} HTML string (already sanitized/normalized by cleanDrupalContent)
 */
export function renderContentPreview(draft) {
  const rawText = buildRawText(draft || {});
  return cleanDrupalContent(rawText, getPhotoTitles());
}
