# Site Operations

How content, photos, and recovery work day to day. The CMS at
`cross-country-trips.com/admin` is the normal way to maintain the site;
everything below is the plumbing behind it and the manual paths for the
rare cases the CMS deliberately doesn't cover.

## The one big assumption: a single admin

Every safety property of the CMS assumes **one person** (you) edits at a
time. There is no locking and no merge handling — two people saving the
same record simultaneously would silently last-write-win. If that ever
changes, revisit before adding a second login.

## Where content lives

| What | Where | Backed up by |
|---|---|---|
| All text content (trips, stops, pages, activities, photo records, albums) | `exported_content/data/*.json` on the server, clone at `C:\Dev\current\cross-country-trips\exported_content` | git → `hgaidus/lolos-extreme-content` (private), pushed automatically on every CMS save |
| New photos uploaded through the CMS | `uploads/` on the server, clone at `C:\Dev\current\cross-country-trips\uploads` | git → `hgaidus/lolos-photo-uploads` (private), pushed automatically on every upload |
| Legacy photo archive (~26GB, pre-CMS) | server `files/` + `C:\Dev\current\cross-country-trips\files` | **not in git** — Synology Drive syncs the whole project tree (one-way, versioned) to the NAS `DEV` share |

Every CMS save makes one git commit (two for uploads: the JSON record and
the binary) and pushes it. If the push fails, the editor shows an amber
warning — the edit is safe on disk and rides along with the next
successful push. A **red** banner ("NOT committed to git") means stop and
investigate before editing further.

## Keeping the PC clones current

The server is the source of truth once the CMS is in daily use. Pull
before doing anything locally with content or photos:

```
git -C C:\Dev\current\cross-country-trips\exported_content\data pull
git -C C:\Dev\current\cross-country-trips\uploads pull
```

Same habit as checking mail. Editing JSON locally and pushing works too
(the server picks it up via `git merge --ff-only origin/main` during a
content deploy), but never edit both ends between syncs.

## Publish / unpublish, never delete

Nothing is deletable from the CMS — every content type (trips, stops,
pages, activities, photos) has a publish toggle instead:

- **Unpublished** content 404s for the public and disappears from
  listings, search, the sitemap, and navigation within ~2 seconds. Logged
  in, you still see it at its real URL with a DRAFT banner.
- **Unpublished photos** leave stop galleries, albums, and covers, but an
  explicit `[img_assist]` embed in a narrative **keeps rendering** — a
  photo referenced by the text can never silently vanish from it. The
  Photos manager shows "embedded in N narratives" next to the toggle so
  you know before you hide one.
- Republishing restores everything exactly; the flag is removed from the
  record so it returns to its original shape.

### Actually deleting something (rare, manual)

If something truly must go — a photo uploaded by mistake, a duplicate
record — the path is git, not the CMS:

1. Check references first: the Photos manager shows narrative embed
   counts; for anything else, search the JSON for the nid.
2. Edit the JSON in `exported_content/data` (mind the indent: 
   `standalone_pages.json` is 2-space, everything else 1-space), and/or
   `git rm` the binary in the uploads repo.
3. Commit, push, then on the server:
   `cd ~/new.cross-country-trips.com/exported_content && git pull`
   (uploads: same in `~/new.cross-country-trips.com/uploads`), then
   `touch ~/new.cross-country-trips.com/app/tmp/restart.txt` is NOT
   needed — the app notices JSON changes by file mtime within ~2s.

## Undo

Every CMS action is one git commit with a descriptive message. To undo:

```
git -C C:\Dev\current\cross-country-trips\exported_content\data log --oneline -10
git -C C:\Dev\current\cross-country-trips\exported_content\data revert <commit>
git -C C:\Dev\current\cross-country-trips\exported_content\data push
```

Then pull on the server (as above). The site reflects it within seconds —
no restart, no deploy.

## Uploads repo growth

New photos add roughly 0.5–1GB per year of travel. GitHub is comfortable
well beyond that for years. When the NAS backup exists, old years can be
archived out of the repo (move the files to the legacy `files/` tier
structure on both ends and rewrite the records' `filename` prefix) — but
there is no hurry, and doing nothing is fine for a long time.

## Server upload limit

The app caps photo uploads at 30MB. If Apache ever rejects large uploads
first (HTTP 413 before the friendly message), add to the app's
`.htaccess`:

```
LimitRequestBody 33554432
```
