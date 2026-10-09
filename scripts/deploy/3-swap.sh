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

sleep 3
# A browser user agent: the host answers curl's default one with 406.
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36"
echo "--- live checks (the first is a cold start and will be slow)"
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
