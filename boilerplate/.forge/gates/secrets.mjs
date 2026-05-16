#!/usr/bin/env node
// Fast regex sweep of changed files for common secret patterns.
// Stack-agnostic. Works on Windows / macOS / Linux.

import { changedFiles, readSafe, finish } from './_lib.mjs';

const PATTERNS = [
  { name: 'AWS Access Key',         re: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS Secret Key',         re: /aws(.{0,20})?(secret|access).{0,5}(=|:)\s*['"][0-9a-zA-Z/+]{40}['"]/i },
  { name: 'GitHub Token',           re: /gh[pousr]_[0-9A-Za-z]{36,}/ },
  { name: 'Slack Token',            re: /xox[abprs]-[0-9A-Za-z-]{10,}/ },
  { name: 'Google API Key',         re: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'Stripe Key',             re: /(sk|pk)_(test|live)_[0-9a-zA-Z]{24,}/ },
  { name: 'Private Key',            re: /-----BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY-----/ },
  { name: 'Generic API key',        re: /(api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{24,}['"]/i },
  { name: 'JWT',                    re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'Env-var assignment',     re: /^\s*(DATABASE_URL|PASSWORD|SECRET|TOKEN|API_KEY)\s*=\s*\S+/im },
];

const SKIP = /(^|\/)(node_modules|dist|build|coverage|bin|obj|target|vendor|\.git)\//i;
const SKIP_EXT = /\.(lock|png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz|woff2?|ttf|eot|map)$/i;

const violations = [];
for (const file of changedFiles()) {
  if (SKIP.test('/' + file) || SKIP_EXT.test(file)) continue;
  const text = readSafe(file);
  if (!text) continue;
  // Allow opt-out per line with `forge-allow-secret`
  for (const p of PATTERNS) {
    const m = text.match(p.re);
    if (m) {
      const line = text.slice(0, m.index).split('\n').length;
      const ctx = text.split('\n')[line - 1] || '';
      if (ctx.includes('forge-allow-secret')) continue;
      violations.push(`${p.name} in ${file}:${line}`);
    }
  }
}

finish('secrets', violations);
