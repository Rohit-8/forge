// Shared helpers for forge gate scripts.
// Cross-platform (Windows / macOS / Linux). Node >= 18.

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Run a command and return stdout, or empty string on any failure. */
export function safeExec(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
  } catch {
    return '';
  }
}

/** List of files staged for commit. Falls back to all changed working-tree
 *  files when nothing is staged. Returns [] outside a git repo. */
export function changedFiles({ stagedOnly = false } = {}) {
  const staged = safeExec('git diff --cached --name-only --diff-filter=ACM')
    .split(/\r?\n/).filter(Boolean);
  if (staged.length || stagedOnly) return staged;
  return safeExec('git diff --name-only --diff-filter=ACM')
    .split(/\r?\n/).filter(Boolean);
}

/** Read the detected stack profile written by /forge.init. */
export function loadStack(root = process.cwd()) {
  const path = join(root, '.forge', 'stack.json');
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

/** Read the cached codebase profile written by /forge.init. */
export function loadProfile(root = process.cwd()) {
  const path = join(root, '.forge', 'cache', 'profile.json');
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

/** Read a text file, swallow any error and return '' so gates never crash. */
export function readSafe(path) {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

/** Print a violation list and exit with status. */
export function finish(name, violations) {
  if (violations.length === 0) {
    console.log(`${name} gate: OK`);
    process.exit(0);
  }
  console.error(`${name} gate: FAIL`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

/** Glob-ish extension filter (no external deps). */
export function hasExt(file, exts) {
  const lower = file.toLowerCase();
  return exts.some((e) => lower.endsWith(e.toLowerCase()));
}
