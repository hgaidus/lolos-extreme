#!/bin/sh
# Regression harness: snapshot a fixed sample of pages to files so any CMS
# refactor can be gated on "public HTML is byte-identical". Run against a
# production server (standalone server.js) BEFORE and AFTER a change, on the
# same content commit, then `diff -r` the two dirs.
#
# Usage: scripts/snapshot-pages.sh <base-url> <out-dir>
#   e.g. scripts/snapshot-pages.sh http://localhost:3001 /tmp/snap-before
#
# Normalized per-build artifacts (so the diff reflects content only):
#  - the build id embedded in the RSC flight payload as \"b\":\"<id>\"
#  - content-hashed asset filenames under /_next/static/chunks|media/
#  - next/font CSS-module class hashes
# A warm-up pass fetches every page once first: the very first render after
# boot can differ from steady state, which would poison a cold capture.

set -e
BASE="${1:?usage: snapshot-pages.sh <base-url> <out-dir>}"
OUT="${2:?usage: snapshot-pages.sh <base-url> <out-dir>}"
mkdir -p "$OUT"

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) snapshot-harness"

PAGES="
/
/trip-index
/travel-itineraries
/2000-cross-country-road-trip
/yellowstone-national-park
/2004-maritime-provinces-road-trip
/aquinnah
/2023-lost-coast
/salt-point-state-park
/2023-iceland
/grindavik
/2002-cross-country-road-trip
/cherry-orchards-drive-mackinaw-city
/2017-european-vacation
/photo-albums
/photo-albums/2025-burning-man
/activities
/activities/hike
/api/search?q=yosemite
/sitemap.xml
/robots.txt
"

echo "  warm-up pass..."
for p in $PAGES; do curl -s -A "$UA" -o /dev/null "$BASE$p"; done

for p in $PAGES; do
  name=$(printf '%s' "$p" | sed 's|^/$|home|; s|^/||; s|[/?&=]|_|g')
  curl -s -A "$UA" "$BASE$p" \
    | sed -E 's/\\"b\\":\\"[A-Za-z0-9_-]{15,}\\"/\\"b\\":\\"BUILDID\\"/g; s/"b":"[A-Za-z0-9_-]{15,}"/"b":"BUILDID"/g' \
    | sed -E 's|/_next/static/(chunks\|media)/[A-Za-z0-9_.-]+|/_next/static/\1/ASSET|g' \
    | sed -E 's/[a-z]+_[0-9a-f]{8}-module__[A-Za-z0-9_-]+__variable/FONTVAR/g' \
    > "$OUT/$name.html"
  printf '  %-52s %s bytes\n' "$p" "$(wc -c < "$OUT/$name.html" | tr -d ' ')"
done

echo "snapshot complete: $OUT"
