# Project History & Transferable Lessons

The short version of how cross-country-trips.com went from a dying Drupal 6
site to a modern Next.js app with a fully custom CMS — written so the
patterns can be reused on other projects. (Day-to-day operations live in
[OPERATIONS.md](OPERATIONS.md); this is the why-and-how.)

## What was built (July 2026)

- **Migration**: 20+ years of content (102 trips, ~870 stops, 3,438
  activities, ~7,000 photos, 43 pages) exported from Drupal into flat JSON
  files, rendered by a Next.js 16 App Router app on InMotion shared hosting
  (Passenger, `output: 'standalone'`).
- **CMS v2** (four phases, all live): every content type editable and
  creatable at `/admin` — trips, stops, activities, pages, photos, albums —
  with a split-pane live-preview editor, photo upload with duplicate
  detection, and universal publish/unpublish instead of deletion.

## The architecture bets that paid off

**Flat JSON + git as the content database.** No database server. Every CMS
save is one git commit, auto-pushed to a private GitHub repo. Undo = `git
revert`. Off-site backup latency ≈ seconds. Two repos: one for content JSON,
one for uploaded photo binaries (each upload commits the binary + its record).
This is the single most reusable idea here: for a single-editor site, git IS
the CMS backend, the audit log, and the backup system.

**Publish/unpublish everywhere, no deletes.** A nullable `published` flag:
absent = live (so thousands of legacy records needed no touch), `false` =
draft, republish *removes* the field (records stay pristine). Drafts 404
publicly but render for the logged-in admin at the real URL with a banner.
Nothing in the CMS can destroy content; true deletion is a deliberate git
operation. Cascade bugs become impossible because nothing cascades.

**mtime-based cache versioning.** Server caches (search index, photo maps)
key on data-file mtimes with a ~2s memo, not in-memory invalidation —
because Passenger runs multiple workers and out-of-band changes (a server-side
`git pull`) must be visible. Works for any multi-process deployment.

**Byte-identical snapshot gate for refactors.** Before/after every risky
change: curl a fixed sample of ~21 pages from a production build, normalize
build ids and hashed asset names, and require a byte-identical diff (with a
DOM-level fallback that must explain any RSC-payload-only difference). This
gate made it safe to delete whole hardcoded modules and derive navigation
from data — twice proving "this refactor changed nothing" before shipping.

**Hardcoded → data, verified by assertion.** Moving nav menus/indexes from
code into content records used a one-time backfill script that *asserted*
(deepStrictEqual) that the new data re-derives the old hardcoded arrays
exactly before writing a byte. Explicit spaced ordering values (10, 20, 30…)
beat clever sort logic: rendering is a plain sort, new items compute a
midpoint at creation time.

## Gotchas worth remembering (cost real debugging time)

- **Next.js `proxy.js` body buffering**: if a proxy/middleware exists, Next
  buffers request bodies and silently TRUNCATES past 10MB
  (`experimental.proxyClientMaxBodySize`) — uploads failed with "expected
  boundary after body" only above 10MB.
- **Static-by-default admin pages**: server pages that read files but use no
  request-scoped API get prerendered at BUILD time — the admin dashboard
  showed a frozen snapshot while the editors (dynamic routes) were live.
  `export const dynamic = 'force-dynamic'` on the admin layout fixes the
  whole subtree. Dev mode never shows this bug; only production builds do.
- **Per-file JSON formatting**: one data file was 2-space indented, the rest
  1-space. The write layer detects indent per file and round-trip-verifies;
  the regression test is "a no-op save must produce an empty git diff."
- **Windows tar**: drive-letter colons parse as remote hosts — `--force-local`.
- **Shared-host smoke tests**: the host's bot filter 406es curl's default
  user-agent; always send a browser UA.
- **Drupal exports**: node ids share one namespace across ALL content types
  (allocate above the global max, not the per-type max), and secondary id
  fields (`vid`) can collide across types — never key by them.

## Deploy pattern (InMotion cPanel/Passenger, reusable for same-host sites)

Build standalone → stage (standalone + static + src + config, strip .git and
env files) → tar `--force-local` → scp → md5 checksum gate on the server →
untar to a fresh dir → swap with a timestamped backup dir → `touch
tmp/restart.txt`. Keep the newest two backups. Content deploys are just a
server-side `git pull` in the data repo — the app notices by mtime within
~2s, no restart. If the app derives from data (nav menus), pull content
BEFORE swapping code that requires it.
