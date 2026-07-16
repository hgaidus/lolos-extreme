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
 * Render a draft stop/trip body to the same cleaned HTML the public site shows.
 * Raw-text assembly is the SAME function the public page uses (stopRawText.js),
 * so preview parity is structural.
 * @param {{type?: 'stop'|'trip', travelogue?: string, description?: string}} draft
 * @returns {string} HTML string (normalized by cleanDrupalContent)
 */
export function renderContentPreview(draft) {
  const rawText = buildContentRawText(draft || {});
  return cleanDrupalContent(rawText, getPhotoTitles());
}
