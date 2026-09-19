#!/usr/bin/env node
// Put sharp's LINUX binary into node_modules so `next build` traces it into
// .next/standalone and the deploy payload can actually resize images.
//
// Why this is needed: sharp ships its native code as per-platform optional
// packages. Installing on Windows gets @img/sharp-win32-x64 only, and npm
// refuses `--os=linux` from a Windows host ("Actual libc: undefined").
// Production is Linux x86_64 (glibc 2.28). Without this the standalone build
// carries a binary the server cannot load; sharp then fails to import, the
// photo route quietly falls back to full-size originals, and the whole image
// optimisation does nothing in production while looking fine locally.
//
// Any `npm install` removes the package again (npm prunes what the lockfile
// does not list for this platform), so this runs as part of `npm run build`
// rather than being a thing to remember.
//
// Safe on Linux too: there the correct binary is already installed and this
// exits immediately.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = path.join(import.meta.dirname, '..');
const TARGET = path.join(ROOT, 'node_modules', '@img', 'sharp-linux-x64');

function log(msg) {
  console.log(`ensure-linux-sharp: ${msg}`);
}

if (os.platform() === 'linux' && os.arch() === 'x64') {
  log('running on linux-x64; npm already installed the right binary');
  process.exit(0);
}

let version;
try {
  version = require('sharp/package.json').version;
} catch {
  log('sharp is not installed — nothing to do');
  process.exit(0);
}

const binary = path.join(TARGET, 'lib', 'sharp-linux-x64.node');
if (fs.existsSync(binary)) {
  const have = JSON.parse(fs.readFileSync(path.join(TARGET, 'package.json'), 'utf8')).version;
  if (have === version) {
    log(`@img/sharp-linux-x64@${have} already present`);
    process.exit(0);
  }
  log(`replacing @img/sharp-linux-x64@${have} to match sharp@${version}`);
  fs.rmSync(TARGET, { recursive: true, force: true });
}

// npm pack just downloads the tarball; unlike install it applies no platform
// check, which is the whole trick here.
// Staged inside the project and handled with RELATIVE paths throughout: the
// bundled tar on Windows reads an absolute "C:\..." as host:path and fails,
// and --force-local alone doesn't cover the -C destination.
const tmpRel = path.join('node_modules', '.cache', 'sharp-linux');
const tmpDir = path.join(ROOT, tmpRel);
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });
try {
  log(`fetching @img/sharp-linux-x64@${version}`);
  // shell:true on Windows — Node refuses to spawn npm.cmd directly (EINVAL).
  const out = execFileSync(
    'npm',
    ['pack', `@img/sharp-linux-x64@${version}`, '--pack-destination', tmpRel, '--silent'],
    { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' },
  );
  const tgzRel = path.posix.join(
    tmpRel.split(path.sep).join('/'),
    out.trim().split(/\r?\n/).pop().trim(),
  );
  const targetRel = 'node_modules/@img/sharp-linux-x64';
  fs.mkdirSync(TARGET, { recursive: true });
  execFileSync('tar', ['--force-local', '-xzf', tgzRel, '-C', targetRel, '--strip-components=1'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (!fs.existsSync(binary)) throw new Error('binary missing after extract');
  log(`installed (${(fs.statSync(binary).size / 1024).toFixed(0)} KB)`);
} catch (err) {
  // Not fatal: the build should still produce a working site, just without
  // server-side resizing. The deploy check below is what catches it.
  log(`FAILED: ${err.message}`);
  log('the deploy payload will NOT be able to resize images on the server');
  process.exitCode = 1;
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
