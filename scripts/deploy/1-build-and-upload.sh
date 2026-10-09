#!/usr/bin/env bash
# Step 1 of 3: build, stage, upload, compare checksums. Run from modern-app.
# Nothing on the server changes except ~/deploy.tar.gz appearing.
#
#   NO_UPLOAD=1 bash scripts/deploy/1-build-and-upload.sh   # build + stage only
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/config.sh"
cd "$HERE/../.."

if [ -n "$(git status --short)" ]; then
  echo "Uncommitted changes — commit or stash first, so what ships is what is in git:"
  git status --short
  exit 1
fi
if [ -n "$(git log --oneline origin/main..HEAD 2>/dev/null)" ]; then
  echo "NOTE: local commits are not pushed to GitHub yet:"
  git log --oneline origin/main..HEAD
fi
echo "deploying: $(git log --oneline -1)"

# Old payloads first (the build would bake them in), and the build cache
# (it goes stale after dev sessions).
rm -rf stage deploy.tar.gz .next

npm run build 2>&1 | grep -E "ensure-linux-sharp|Compiled|rror|Failed" || true
test -f .next/standalone/server.js || { echo "build produced no standalone server — stopping"; exit 1; }

cp -a .next/standalone/. stage/
cp -a .next/static stage/.next/static

# Never ship: git history, env files, editor/agent config, docs, scripts, or a
# previous payload.
rm -rf stage/.git stage/.claude stage/docs stage/scripts stage/stage stage/deploy.tar.gz
find stage -maxdepth 1 -name '.env*' -exec rm -f {} +

# The one script production needs: accounts and password-reset links.
mkdir -p stage/scripts stage/tmp
cp scripts/admin-users.mjs stage/scripts/

ENV_COUNT=$(find stage -name '.env*' | wc -l)
GIT_COUNT=$(find stage -name '.git' | wc -l)
echo "env files: $ENV_COUNT   git dirs: $GIT_COUNT   entries: $(find stage | wc -l)"
if [ "$ENV_COUNT" -ne 0 ] || [ "$GIT_COUNT" -ne 0 ]; then
  echo "payload contains env files or git data — stopping"
  exit 1
fi
for pkg in sharp-linux-x64 sharp-libvips-linux-x64; do
  test -d "stage/node_modules/@img/$pkg" || { echo "missing @img/$pkg in the payload — stopping"; exit 1; }
done

tar --force-local -czf deploy.tar.gz -C stage .
LOCAL_MD5=$(md5sum deploy.tar.gz | cut -d' ' -f1)
echo "payload: $(du -h deploy.tar.gz | cut -f1)  md5 $LOCAL_MD5"

if [ "${NO_UPLOAD:-}" = "1" ]; then
  echo "NO_UPLOAD=1 — built and staged only, nothing sent."
  exit 0
fi

scp "${SCP_OPTS[@]}" deploy.tar.gz "$SSH_HOST:~/deploy.tar.gz"
REMOTE_MD5=$(ssh "${SSH_OPTS[@]}" "$SSH_HOST" 'md5sum ~/deploy.tar.gz' 2>/dev/null | cut -d' ' -f1)
echo "server md5:  $REMOTE_MD5"
if [ "$LOCAL_MD5" != "$REMOTE_MD5" ]; then
  echo "CHECKSUM MISMATCH — do not continue."
  exit 1
fi
echo "Uploaded and verified. Next: bash scripts/deploy/run-remote.sh 2-gate.sh"
