#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function computeSha256(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function normalizeRelativePath(p) {
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  return path.relative(ROOT_DIR, abs).replace(/\\/g, '/');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || !['baseline', 'freeze', 'verify'].includes(command)) {
  console.log(`
Usage:
  node scripts/manifest-tool.mjs baseline <taskId> <files...>
  node scripts/manifest-tool.mjs freeze <taskId> <files...>
  node scripts/manifest-tool.mjs verify <taskId>

Commands:
  baseline : Snapshots the specified files and records baseline SHA256.
  freeze   : Freezes source code changes, generates SHA256 manifest and diffs.
  verify   : Verifies current source files against the frozen manifest.
`);
  process.exit(1);
}

const taskId = args[1];
if (!taskId) {
  console.error('Error: taskId is required.');
  process.exit(1);
}

const taskManifestDir = path.join(ROOT_DIR, 'docs', 'manifests', taskId);
const baselineDir = path.join(taskManifestDir, 'baseline');
const baselineFile = path.join(taskManifestDir, 'baseline.json');
const manifestFile = path.join(taskManifestDir, 'manifest.json');

if (command === 'baseline') {
  const targetFiles = args.slice(2);
  if (targetFiles.length === 0) {
    console.error('Error: specify at least one file for baseline.');
    process.exit(1);
  }

  ensureDir(baselineDir);
  const baselineEntries = {};

  for (const rawPath of targetFiles) {
    const relPath = normalizeRelativePath(rawPath);
    const absPath = path.join(ROOT_DIR, relPath);
    const exists = fs.existsSync(absPath);

    if (exists) {
      const hash = computeSha256(absPath);
      const snapshotDest = path.join(baselineDir, relPath.replace(/\//g, '_'));
      fs.copyFileSync(absPath, snapshotDest);
      baselineEntries[relPath] = {
        exists: true,
        sha256: hash,
        snapshot: path.relative(ROOT_DIR, snapshotDest),
      };
      console.log(`[Baseline] Captured ${relPath} (${hash.substring(0, 12)}...)`);
    } else {
      baselineEntries[relPath] = {
        exists: false,
        sha256: null,
        snapshot: null,
      };
      console.log(`[Baseline] File not created yet: ${relPath}`);
    }
  }

  const baselineData = {
    taskId,
    createdAt: new Date().toISOString(),
    files: baselineEntries,
  };

  fs.writeFileSync(baselineFile, JSON.stringify(baselineData, null, 2), 'utf-8');
  console.log(`\n Baseline saved to: ${path.relative(ROOT_DIR, baselineFile)}`);
}

if (command === 'freeze') {
  const targetFiles = args.slice(2);
  if (targetFiles.length === 0) {
    console.error('Error: specify at least one file to freeze.');
    process.exit(1);
  }

  ensureDir(taskManifestDir);
  let baselineData = null;
  if (fs.existsSync(baselineFile)) {
    baselineData = JSON.parse(fs.readFileSync(baselineFile, 'utf-8'));
  }

  const fileEntries = {};
  for (const rawPath of targetFiles) {
    const relPath = normalizeRelativePath(rawPath);
    const absPath = path.join(ROOT_DIR, relPath);

    if (!fs.existsSync(absPath)) {
      console.error(`Error: File does not exist: ${absPath}`);
      process.exit(1);
    }

    const hash = computeSha256(absPath);
    const baselineInfo = baselineData?.files?.[relPath];

    fileEntries[relPath] = {
      sha256: hash,
      baselineSha256: baselineInfo ? baselineInfo.sha256 : null,
      isNew: baselineInfo ? !baselineInfo.exists : false,
    };
    console.log(`[Freeze] Frozen ${relPath} -> ${hash}`);
  }

  const manifestData = {
    taskId,
    frozenAt: new Date().toISOString(),
    status: 'FROZEN',
    files: fileEntries,
  };

  fs.writeFileSync(manifestFile, JSON.stringify(manifestData, null, 2), 'utf-8');
  console.log(`\n Manifest frozen: ${path.relative(ROOT_DIR, manifestFile)}`);
}

if (command === 'verify') {
  if (!fs.existsSync(manifestFile)) {
    console.error(`Error: Manifest file not found: ${path.relative(ROOT_DIR, manifestFile)}`);
    process.exit(1);
  }

  const manifestData = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
  console.log(`[Verify] Verifying manifest for Task: ${manifestData.taskId} (Frozen at: ${manifestData.frozenAt})`);

  let allMatch = true;
  for (const [relPath, info] of Object.entries(manifestData.files)) {
    const absPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(absPath)) {
      console.error(`[MISMATCH] File missing: ${relPath}`);
      allMatch = false;
      continue;
    }

    const currentHash = computeSha256(absPath);
    if (currentHash === info.sha256) {
      console.log(`[MATCH] ${relPath} (${currentHash.substring(0, 16)}...)`);
    } else {
      console.error(`[MISMATCH] ${relPath}\n  Expected: ${info.sha256}\n  Actual:   ${currentHash}`);
      allMatch = false;
    }
  }

  if (allMatch) {
    console.log(`\n All files verified successfully! Integrity confirmed.`);
    process.exit(0);
  } else {
    console.error(`\n Verification failed! Files have been modified after freeze.`);
    process.exit(1);
  }
}
