import path from 'path';

// The Drupal export lives one directory above this app by default. Both
// directories can be relocated independently via env vars (e.g. for a
// deploy target where the archive is mounted somewhere else).
export const DATA_DIR = path.normalize(
  process.env.EXPORTED_CONTENT_DATA_DIR || path.join(process.cwd(), '..', 'exported_content', 'data')
);

export const FILES_DIR = path.normalize(
  process.env.DRUPAL_FILES_DIR || path.join(process.cwd(), '..', 'files')
);

// New photos uploaded through the CMS. Unlike FILES_DIR (the ~26GB legacy
// archive, outside version control), this directory is its own git repo
// (hgaidus/lolos-photo-uploads) and every upload is committed and pushed, so
// new photos are backed up to GitHub within seconds of upload.
export const UPLOADS_DIR = path.normalize(
  process.env.PHOTO_UPLOADS_DIR || path.join(process.cwd(), '..', 'uploads')
);
