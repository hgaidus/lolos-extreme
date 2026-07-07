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
