# Deploying the app to production

Three steps, each a script, each stopping on the first error. **A deploy needs
Herb's explicit go-ahead every time** — approval for one does not carry to the
next.

Run from `modern-app`, in Git Bash:

```bash
bash scripts/deploy/1-build-and-upload.sh
```

```bash
bash scripts/deploy/run-remote.sh 2-gate.sh
```

```bash
bash scripts/deploy/run-remote.sh 3-swap.sh
```

Read the output of each before running the next. Step 2 changes nothing that is
live; step 3 is the one that swaps the running app.

## What each step does

1. **Build and upload** (local). Clears old build and staging output, builds,
   assembles the payload in `stage/`, strips everything that must never ship,
   re-adds the one script the server needs, tars it, uploads it and compares
   checksums on both ends.
2. **Gate** (server, read-only for the live app). Unpacks the payload beside
   the live app as `app_new`, checks it carries no env files or `.git`, diffs
   its file list against the live app, proves the image library loads on the
   server, and shows the content repo's state.
3. **Swap** (server). Moves the live app aside as a dated backup, moves
   `app_new` into place, restarts, fetches six pages, deletes the tarball,
   prunes to the newest three backups and lists the CMS accounts.

To pull content from GitHub as part of step 3 (when a content fix was pushed
from the PC and depends on the code being deployed first):

```bash
PULL_CONTENT=1 bash scripts/deploy/run-remote.sh 3-swap.sh
```

## What a healthy gate looks like

- `env files in payload: 0` and `git dirs in payload: 0`. Anything else: stop.
- The filtered diff shows only `< ./tmp/restart.txt` plus source files you
  knowingly added or removed. Anything else: stop and find out why.
- `sharp ok, libvips …`. If this fails, photos would be served full size.
- The content repo line shows no modified files.

## Why it is shaped this way

Each of these cost real time or came close to costing data:

- **`.env.local` and `.git` ride along in Next's standalone output.** Shipping
  them would overwrite the production admin secret. Hence the strip and the
  two zero-counts.
- **`stage/` and `deploy.tar.gz` must be deleted BEFORE the build**, or the
  previous payload gets baked into the new one.
- **`scripts/admin-users.mjs` has to be put back** after `scripts/` is
  stripped — it is how accounts and reset links are made on the server.
- **sharp needs two Linux packages** that a Windows install does not have; the
  prebuild hook fetches them. A file being present is not proof it loads,
  which is why the gate loads it on the server.
- **The dev build cache goes stale** and can serve wrong pages; clearing
  `.next` before each build is cheap insurance.
- **InMotion refuses SSH after about three quick connections.** These steps
  use three in total. A refused connection ran nothing; wait a few minutes.
- **The remote steps are files piped over SSH, never typed inline.** Inline
  quoting mangles backslashes and quotes on this machine.

Rolling back: the previous app is `~/deploy_backup_<timestamp>` on the server.
Move the current `app` aside, move the backup to `app`, and
`touch app/tmp/restart.txt`.
