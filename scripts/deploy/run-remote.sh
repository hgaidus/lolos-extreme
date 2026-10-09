#!/usr/bin/env bash
# Runs one of the server-side steps (2-gate.sh, 3-swap.sh) over SSH.
# The script is piped in rather than passed as an argument so no quoting
# layer can alter it, with Windows line endings stripped on the way.
#
#   bash scripts/deploy/run-remote.sh 2-gate.sh
#   PULL_CONTENT=1 bash scripts/deploy/run-remote.sh 3-swap.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/config.sh"

STEP="${1:-}"
case "$STEP" in
  2-gate.sh|3-swap.sh) ;;
  *) echo "usage: run-remote.sh 2-gate.sh | 3-swap.sh"; exit 1 ;;
esac

tr -d '\r' < "$HERE/$STEP" \
  | ssh "${SSH_OPTS[@]}" "$SSH_HOST" "PULL_CONTENT=${PULL_CONTENT:-0} bash -s" 2>&1 \
  | grep -v -E '^\*\* '

# After a swap, clear the local payload so the next build starts clean and
# cannot bake this one in.
if [ "$STEP" = "3-swap.sh" ]; then
  cd "$HERE/../.."
  rm -rf stage deploy.tar.gz
fi
