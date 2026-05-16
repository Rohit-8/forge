#!/usr/bin/env node
// Constitution gate.
// Enforces the small set of *programmatically checkable* rules from
// `.forge/constitution.md`. Each rule is a function that returns a list of
// violation strings. Rules that can't be checked here belong in lint/types.
//
// To extend: add a function that returns string[] of violations, push to
// RULES. Keep rules cheap (regex over changed files only).

import { changedFiles, readSafe, loadStack, finish, safeExec } from './_lib.mjs';

const stack = loadStack() || {};
const langs = stack.languages || [];
const isJs = langs.some((l) => ['javascript', 'typescript'].includes(l));
const isPy = langs.includes('python');
const isCs = langs.includes('csharp');

const files = changedFiles().filter(Boolean);

// ---- 1. Clean as you code: no stray debug prints in committed code -----
function noDebugPrints() {
  const issues = [];
  for (const f of files) {
    if (/\.(spec|test)\.[a-z]+$/i.test(f)) continue;
    const t = readSafe(f);
    if (!t) continue;
    if (isJs && /\.(js|jsx|ts|tsx|mjs)$/i.test(f)) {
      if (/^\s*console\.(log|debug)\s*\(/m.test(t)) issues.push(`debug print: ${f}`);
    }
    if (isPy && /\.py$/i.test(f)) {
      if (/^\s*print\s*\(/m.test(t) && !/^\s*#\s*forge-allow-print/m.test(t)) {
        issues.push(`debug print: ${f}`);
      }
    }
    if (isCs && /\.cs$/i.test(f)) {
      if (/Console\.WriteLine\s*\(/m.test(t)) issues.push(`debug print: ${f}`);
    }
  }
  return issues;
}

// ---- 2. No TODO / FIXME / HACK without a ticket reference --------------
function todosNeedTickets() {
  const issues = [];
  const re = /\b(TODO|FIXME|HACK)\b(?![^\n]*\b([A-Z]{2,}-\d+|#\d+)\b)/;
  for (const f of files) {
    const t = readSafe(f);
    if (!t) continue;
    const m = t.match(re);
    if (m) {
      const line = t.slice(0, m.index).split('\n').length;
      issues.push(`${m[1]} without ticket id: ${f}:${line}`);
    }
  }
  return issues;
}

// ---- 3. Agent must not have authored a commit (manual VCS) -------------
function manualVcs() {
  const issues = [];
  const last = safeExec('git log -1 --pretty=%B').trim();
  if (/\b(committed by forge|agent[- ]commit|co-authored-by:\s*forge)/i.test(last)) {
    issues.push('last commit looks agent-authored — Principle: Manual VCS');
  }
  return issues;
}

// ---- 4. TDD: new source files should ship with a sibling test ----------
function newFileHasTest() {
  if (!isJs && !isPy && !isCs) return [];
  const issues = [];
  const added = safeExec('git diff --cached --name-only --diff-filter=A')
    .split(/\r?\n/).filter(Boolean);
  for (const f of added) {
    if (/\.(spec|test)\.[a-z]+$/i.test(f)) continue;
    if (/(node_modules|dist|build|bin|obj|migrations|__pycache__)\//i.test(f)) continue;
    if (isJs && /\.(ts|tsx|js|jsx)$/i.test(f) && !/\.d\.ts$/i.test(f)) {
      const base = f.replace(/\.[^.]+$/, '');
      const matches = safeExec(`git ls-files "${base}.spec.*" "${base}.test.*"`).trim();
      if (!matches) issues.push(`no test sibling for new file: ${f}`);
    } else if (isPy && /\.py$/i.test(f) && !/__init__\.py$/.test(f)) {
      const base = f.split('/').pop().replace(/\.py$/, '');
      const matches = safeExec(`git ls-files "**/test_${base}.py" "**/${base}_test.py"`).trim();
      if (!matches) issues.push(`no test sibling for new file: ${f}`);
    } else if (isCs && /\.cs$/i.test(f) && !/\.Tests?\.cs$/i.test(f)) {
      const base = f.split('/').pop().replace(/\.cs$/, '');
      const matches = safeExec(`git ls-files "**/${base}Tests.cs" "**/${base}.Tests.cs"`).trim();
      if (!matches) issues.push(`no test sibling for new file: ${f}`);
    }
  }
  return issues;
}

const violations = [
  ...manualVcs(),
  ...noDebugPrints(),
  ...todosNeedTickets(),
  ...newFileHasTest(),
];

finish('constitution', violations);
