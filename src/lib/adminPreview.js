import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './dataPaths';
import { cleanDrupalContent } from '@/utils/cleanContent';
import { makeVersioned, getDataVersion } from './dataVersion';
import { buildContentRawText } from './stopRawText';

// Reloaded when the content JSON changes — the CMS writes photo_titles.json
// (uploads, title edits), and a stale copy here would preview stale captions.
const photoTitlesCache = makeVersioned(() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'photo_titles.json'), 'utf-8'));
  } catch {
    return [];
  }
}, getDataVersion);

function getPhotoTitles() {
  return photoTitlesCache.get();
}

/**
 * Render a draft body to the same cleaned HTML the public site shows.
 * Trip/stop raw-text assembly is the SAME function the public page uses
 * (stopRawText.js), so preview parity is structural. Activities render their
 * narrative directly, mirroring activities/[type]/page.js; standalone pages
 * fall through buildContentRawText's body fallback, same as the public page.
 * @param {{type?: 'stop'|'trip'|'page'|'activity', travelogue?: string, description?: string, body?: string, narrative?: string}} draft
 * @returns {string} HTML string (normalized by cleanDrupalContent)
 */
export function renderContentPreview(draft) {
  const d = draft || {};
  const rawText = d.type === 'activity' ? d.narrative || '' : buildContentRawText(d);
  return cleanDrupalContent(rawText, getPhotoTitles());
}
