# Step 3 of 3 — runs ON THE SERVER (via run-remote.sh). This is the deploy.
# The live app is moved aside, never deleted; the newest three backups are kept.
set -e
cd ~/new.cross-country-trips.com
test -d app_new || { echo "no app_new — run step 2 (the gate) first"; exit 1; }

TS=$(date +%Y%m%d-%H%M%S)
mv app ~/deploy_backup_$TS
mv app_new app
touch app/tmp/restart.txt
echo "swapped; previous app kept as deploy_backup_$TS"

# Content is its own repo and normally arrives by the CMS committing on the
# server. Pull only when asked: a content fix pushed from the PC that needs
# this code in place first.
if [ "${PULL_CONTENT:-0}" = "1" ]; then
  echo "--- content pull"
  cd ~/new.cross-country-trips.com/exported_content/data
  echo "modified files before pull: $(git status --short | wc -l)"
  git pull --ff-only 2>&1 | tail -2
  git log --oneline -1
  cd ~/new.cross-country-trips.com
fi

# A browser user agent: the host answers curl's default one with 406.
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36"

# Wait until the NEW build is the one answering. Passenger only notices
# restart.txt on a later request, and the old process can go on serving for
# several seconds: on 2026-10-09 every check below came back 200 in
# milliseconds from the OLD app, which proves nothing about the deploy. The
# homepage names its build id, so look for the one just swapped in.
BUILD_ID=$(cat app/.next/BUILD_ID)
echo "--- waiting for build $BUILD_ID to be served"
SERVING=no
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if curl -s -A "$UA" https://cross-country-trips.com/ | grep -q "$BUILD_ID"; then
    SERVING=yes
    echo "new build is live (attempt $attempt)"
    break
  fi
  sleep 3
done
if [ "$SERVING" != "yes" ]; then
  echo "WARNING: after 45s the site is still not serving build $BUILD_ID."
  echo "The swap is done and the old app is in ~/deploy_backup_$TS; check the site before doing anything else."
fi

echo "--- live checks"
for p in / /admin/login /2026-carmel /west-coast-road-trip /trip-stops-map /photo-albums "/photos/8k/2021-Carmel.gif"; do
  curl -s -o /dev/null -A "$UA" -w "%{http_code} %{time_total}s $p\n" "https://cross-country-trips.com$p"
done

rm -f ~/deploy.tar.gz

# Backups hold only built code, reproducible from git. Keep the newest three.
ls -d ~/deploy_backup_* | sort | head -n -3 | while read d; do echo "pruning $d"; rm -rf "$d"; done
echo "--- backups kept"
ls -d ~/deploy_backup_*

echo "--- CMS accounts (should be unchanged)"
cd app && ~/nodevenv/new.cross-country-trips.com/app/24/bin/node scripts/admin-users.mjs list 2>/dev/null
