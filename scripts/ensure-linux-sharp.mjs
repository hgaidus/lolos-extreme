#!/usr/bin/env node
// Put sharp's LINUX binaries into node_modules so `next build` traces them into
// .next/standalone and the deploy payload can actually resize images.
//
// Why this is needed: sharp ships its native code as per-platform packages.
// Installing on Windows gets the win32 ones only, and npm refuses `--os=linux`
// from a Windows host ("Actual libc: undefined"). Production is Linux x86_64
// (glibc 2.28). Without this the standalone build carries binaries the server
// cannot load; sharp then fails to import, the photo route quietly falls back
// to full-size originals, and the whole image optimisation does nothing in
// production while looking fine locally.
//
// TWO packages are needed, which is easy to get wrong and did go wrong once:
// @img/sharp-linux-x64 holds the .node addon, and @img/sharp-libvips-linux-x64
// holds the libvips-cpp.so it dlopens. The Windows package bundles its DLLs
// inside itself, so shipping only the equivalent Linux package looks correct
// and then fails on the server with:
//   ERR_DLOPEN_FAILED: libvips-cpp.so.8.17.3: cannot open shared object file
// Checking that a file exists is not enough — only loading it on Linux is, and
// that cannot be done from here, so verify after deploying.
//
// Any `npm install` prunes these again (the lockfile doesn't list them for this
// platform), so this runs as a prebuild step rather than being something to
// remember.
//
// Safe on Linux: there npm installed the right binaries and this exits at once.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = path.join(import.meta.dirname, '..');
const log = (msg) => console.log(`ensure-linux-sharp: ${msg}`);

if (os.platform() === 'linux' && os.arch() === 'x64') {
  log('running on linux-x64; npm already installed the right binaries');
  process.exit(0);
}

let sharpVersion;
try {
  sharpVersion = require('sharp/package.json').version;
} catch {
  log('sharp is not installed — nothing to do');
  process.exit(0);
}

// Staged inside the project and handled with RELATIVE paths throughout: the
// bundled tar on Windows reads an absolute "C:\..." as host:path and fails,
// and --force-local alone doesn't cover the -C destination.
const tmpRel = 'node_modules/.cache/sharp-linux';
const tmpDir = path.join(ROOT, tmpRel);

function install(name, version) {
  const targetRel = `node_modules/${name}`;
  const target = path.join(ROOT, targetRel);
  const manifest = path.join(target, 'package.json');

  if (fs.existsSync(manifest)) {
    const have = JSON.parse(fs.readFileSync(manifest, 'utf8')).version;
    if (have === version) {
      log(`${name}@${have} already present`);
      return target;
    }
    log(`replacing ${name}@${have} with @${version}`);
    fs.rmSync(target, { recursive: true, force: true });
  }

  log(`fetching ${name}@${version}`);
  // npm pack just downloads the tarball; unlike install it applies no platform
  // check, which is the whole trick here. shell:true on Windows — Node refuses
  // to spawn npm.cmd directly (EINVAL).
  const out = execFileSync('npm', ['pack', `${name}@${version}`, '--pack-destination', tmpRel, '--silent'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const tgzRel = `${tmpRel}/${out.trim().split(/\r?\n/).pop().trim()}`;
  fs.mkdirSync(target, { recursive: true });
  execFileSync('tar', ['--force-local', '-xzf', tgzRel, '-C', targetRel, '--strip-components=1'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (!fs.existsSync(manifest)) throw new Error(`${name}: nothing extracted`);
  return target;
}

fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });
try {
  const addon = install('@img/sharp-linux-x64', sharpVersion);

  // The addon package itself names the exact libvips build it dlopens — read
  // it rather than hardcoding a version that would drift out of step.
  const addonPkg = JSON.parse(fs.readFileSync(path.join(addon, 'package.json'), 'utf8'));
  const libvips = Object.entries(addonPkg.optionalDependencies || {})
    .find(([n]) => n.startsWith('@img/sharp-libvips-'));
  if (!libvips) throw new Error('addon does not name a libvips package');
  const libvipsDir = install(libvips[0], libvips[1]);

  const dotNode = path.join(addon, 'lib', 'sharp-linux-x64.node');
  const soFiles = fs.readdirSync(path.join(libvipsDir, 'lib')).filter((f) => f.includes('.so'));
  if (!fs.existsSync(dotNode)) throw new Error('sharp-linux-x64.node missing');
  if (!soFiles.length) throw new Error('libvips shared library missing');
  log(`ready: addon ${(fs.statSync(dotNode).size / 1024).toFixed(0)} KB, libvips ${soFiles.join(', ')}`);
} catch (err) {
  log(`FAILED: ${err.message}`);
  log('the deploy payload will NOT be able to resize images on the server');
  process.exitCode = 1;
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
