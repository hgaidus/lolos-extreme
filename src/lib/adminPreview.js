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
  const d = { ...(draft || {}) };
  // Number each photo embed in the text being edited, so a click on a photo in
  // the preview can find its [img_assist] tag again (EditorPane). The number
  // rides along as an extra embed= parameter, which cleanDrupalContent turns
  // into data-embed on the figure; stored content never carries it, so public
  // pages are unaffected. The stop's description is left unnumbered: its
  // photos aren't in the text being edited.
  for (const field of ['travelogue', 'body', 'narrative']) {
    if (typeof d[field] === 'string') d[field] = numberEmbeds(d[field]);
  }
  const rawText = d.type === 'activity' ? d.narrative || '' : buildContentRawText(d);
  return cleanDrupalContent(rawText, getPhotoTitles());
}

// The Nth tag (from 0) gets embed=N, matching the Nth /\[img_assist\|/ in the
// editor's own text, unresolvable ones included, so the count can't drift.
function numberEmbeds(text) {
  let n = 0;
  return text.replace(/\[img_assist\|/gi, () => `[img_assist|embed=${n++}|`);
}
