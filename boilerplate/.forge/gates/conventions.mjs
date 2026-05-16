#!/usr/bin/env node
// Validates new files against the conventions cached in profile.json.
// Conventions are project-specific: /forge.init seeds them from the codebase,
// and you can edit `.forge/cache/profile.json -> conventions` to refine.
//
// Each convention is `{ match: <glob>, name: <PCRE>, message: <string> }`.
// If no conventions are present, the gate is a no-op (exit 0).

import { changedFiles, loadProfile, finish } from './_lib.mjs';
import { basename } from 'node:path';

function globToRegExp(glob) {
  // Tiny subset: ** -> .*, * -> [^/]*, ? -> [^/]
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '§§').replace(/\*/g, '[^/]*').replace(/§§/g, '.*')
    .replace(/\?/g, '[^/]');
  return new RegExp('^' + esc + '$');
}

const profile = loadProfile();
if (!profile || !profile.conventions || profile.conventions.length === 0) {
  console.log('conventions gate: SKIPPED (no conventions cached — run forge.init)');
  process.exit(0);
}

const added = changedFiles().filter((f) => {
  // Only check newly added files; renames/edits should not retroactively fail.
  return f && f.length > 0;
});

const violations = [];
for (const f of added) {
  for (const c of profile.conventions) {
    const matcher = globToRegExp(c.match);
    if (!matcher.test(f)) continue;
    const nameRe = new RegExp(c.name);
    if (!nameRe.test(basename(f))) {
      violations.push(`${c.message || 'naming'}: ${f}`);
    }
  }
}

finish('conventions', violations);
