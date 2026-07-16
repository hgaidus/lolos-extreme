// Explicit .js extensions for plain-node script compat (same as adminStore).
import { readDataset, writeDataset, allocateNid, slugify, ensureUniqueSlug, allContentSlugs } from './adminStore.js';

// Standalone pages (standalone_pages.json — the one 2-SPACE-indented dataset;
// adminStore's per-file indent detection is what makes a no-op save produce
// an empty git diff). Types: 'page', 'story', 'tips'. Tips and lazy-daze
// pages exist in the data but are deliberately NOT rendered publicly
// ([...slug] isExcludedSlug) — a migration-era decision the CMS surfaces
// rather than changes.
//
// No deletes: pages carry the standard published flag (absence = live,
// false = draft, republish removes the field). New pages are born as drafts.

export const PAGE_TYPES = ['page', 'story', 'tips'];

export function isPubliclyRendered(page) {
  const s = (page.slug || '').toLowerCase();
  return !s.includes('lazy-daze') && s !== 'tips' && !s.startsWith('tips/');
}

export function getPages() {
  return readDataset('pages');
}

export function getPage(nid) {
  return readDataset('pages').find((p) => String(p.nid) === String(nid)) || null;
}

function applyPublished(record, published) {
  if (published === false) record.published = false;
  else if (published === true) delete record.published;
}

export function createPage(fields) {
  const pages = readDataset('pages');
  const nid = allocateNid();
  // Tips slugs live under the tips/ prefix, matching every legacy record.
  const base = slugify(fields.title || 'new-page');
  const slug = ensureUniqueSlug(fields.type === 'tips' ? `tips/${base}` : base, allContentSlugs());

  const newPage = {
    nid,
    type: fields.type,
    title: fields.title,
    slug,
    created: Math.floor(Date.now() / 1000),
    body: fields.body || '',
    summary: '',
    published: false,
  };

  pages.push(newPage);
  writeDataset('pages', pages);
  return newPage;
}

// Slug and type are immutable after creation: slugs are public URLs (and
// tips/ prefixing is a slug convention), so changing them is a git-level
// operation with a redirect decision attached.
export function updatePage(nid, fields) {
  const pages = readDataset('pages');
  const idx = pages.findIndex((p) => String(p.nid) === String(nid));
  if (idx === -1) throw new Error(`Page nid ${nid} not found`);

  const { published, ...rest } = fields;
  const updated = { ...pages[idx], ...rest };
  applyPublished(updated, published);
  pages[idx] = updated;

  writeDataset('pages', pages);
  return updated;
}
