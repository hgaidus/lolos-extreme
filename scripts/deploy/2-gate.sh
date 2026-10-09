# Step 2 of 3 — runs ON THE SERVER (via run-remote.sh). Changes nothing live.
# Unpacks the uploaded payload beside the running app and checks it.
set -e
cd ~/new.cross-country-trips.com
test -f ~/deploy.tar.gz || { echo "no ~/deploy.tar.gz — run step 1 first"; exit 1; }
rm -rf app_new
mkdir app_new
tar -xzf ~/deploy.tar.gz -C app_new

echo "env files in payload: $(find app_new -name '.env*' | wc -l)"
echo "git dirs in payload: $(find app_new -name '.git' | wc -l)"

(cd app && find . | sort) > /tmp/live.lst
(cd app_new && find . | sort) > /tmp/new.lst
echo "live entries: $(wc -l < /tmp/live.lst)  new entries: $(wc -l < /tmp/new.lst)"

# Build output is renamed on every build, so compiled chunks and the
# build-id-named static folder are left out; what remains should be only
# tmp/restart.txt plus source files knowingly added or removed.
echo "--- filtered diff (< live only, > new only)"
diff /tmp/live.lst /tmp/new.lst | grep '^[<>]' | grep -v 'chunks/' | grep -v -E '\.next/static/[A-Za-z0-9_-]{15,}(/|$)' || true
rm -f /tmp/live.lst /tmp/new.lst

# A file being present is not proof it loads: this once passed while the
# image resizer was dead on the server for want of libvips.
echo "--- sharp load test"
cd app_new
~/nodevenv/new.cross-country-trips.com/app/24/bin/node --input-type=module -e 'const s=(await import("sharp")).default; const b=await s({create:{width:8,height:8,channels:3,background:"#58B195"}}).webp().toBuffer(); console.log("sharp ok, libvips", s.versions.vips, "webp bytes", b.length)'

echo "--- content repo (should list no modified files)"
cd ~/new.cross-country-trips.com/exported_content/data && git status --short | head -5 && git log --oneline -1

echo "--- backups on the server"
ls -d ~/deploy_backup_* 2>/dev/null || echo "(none)"
echo "Gate finished. If the diff and counts look right: bash scripts/deploy/run-remote.sh 3-swap.sh"
