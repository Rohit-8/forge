#!/usr/bin/env node
// Pattern-level scan for common OWASP top-10 sinks in changed source files.
// Rules are scoped by file extension so non-web stacks aren't flooded.
// Not a substitute for full SAST; meant to fail fast on obvious mistakes.
// Opt out per line with the comment marker `forge-allow:<rule-id>`.

import { changedFiles, readSafe, hasExt, finish } from './_lib.mjs';

const RULES = [
  // Web / Node / .NET / Python all use eval-like sinks.
  { id: 'A03.eval',          exts: ['.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.php'],
    re: /(?<![A-Za-z_])eval\s*\(/, msg: 'A03 Injection: eval()' },
  { id: 'A03.func-ctor',     exts: ['.js', '.jsx', '.ts', '.tsx'],
    re: /(?<![A-Za-z_])new\s+Function\s*\(/, msg: 'A03 Injection: new Function()' },
  // SQL string concatenation (very rough; opt-out friendly).
  { id: 'A03.sql-concat',    exts: ['.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.php', '.cs', '.java', '.go'],
    re: /(?:select|insert|update|delete)\s+[^;'"`\n]{0,80}["'`]\s*\+\s*[A-Za-z_$]/i,
    msg: 'A03 Injection: SQL built by string concat — use parameterised queries' },
  { id: 'A03.xss-react',     exts: ['.jsx', '.tsx'],
    re: /dangerouslySetInnerHTML\s*=/, msg: 'A03 XSS: dangerouslySetInnerHTML without sanitiser' },
  { id: 'A03.xss-vue',       exts: ['.vue'],
    re: /v-html\s*=/, msg: 'A03 XSS: v-html without sanitiser' },
  { id: 'A03.xss-angular',   exts: ['.ts', '.html'],
    re: /\[innerHTML\]\s*=/, msg: 'A03 XSS: [innerHTML] without sanitiser' },
  { id: 'A02.weak-random',   exts: ['.js', '.jsx', '.ts', '.tsx'],
    re: /(token|secret|password|key)[^=\n]{0,40}Math\.random\s*\(/i,
    msg: 'A02 Crypto: Math.random() used for secret material — use crypto.randomBytes' },
  { id: 'A02.weak-random-py', exts: ['.py'],
    re: /(token|secret|password|key)[^=\n]{0,40}random\.(random|randint|choice)\s*\(/i,
    msg: 'A02 Crypto: random module used for secret material — use secrets module' },
  { id: 'A05.cors-wildcard', exts: ['.js', '.jsx', '.ts', '.tsx', '.py', '.cs', '.go', '.rb'],
    re: /Access-Control-Allow-Origin[^\n]{0,20}\*/i,
    msg: 'A05 Misconfig: CORS wildcard origin' },
  { id: 'A09.log-secret',    exts: ['.js', '.jsx', '.ts', '.tsx', '.py', '.cs', '.java', '.go'],
    re: /(console\.log|print|Console\.WriteLine|fmt\.Print|log\.(info|debug|warn|error))\s*\([^)]{0,120}\b(token|secret|password|authorization|api[_-]?key)\b/i,
    msg: 'A09 Logging: secret-bearing token logged in plain text' },
];

const SKIP = /(^|\/)(node_modules|dist|build|coverage|bin|obj|target|vendor|\.git)\//i;
const SKIP_TEST = /\.(spec|test)\.[a-z]+$/i;

const violations = [];
for (const file of changedFiles()) {
  if (SKIP.test('/' + file) || SKIP_TEST.test(file)) continue;
  const text = readSafe(file);
  if (!text) continue;
  const lines = text.split('\n');
  for (const r of RULES) {
    if (!hasExt(file, r.exts)) continue;
    let idx = 0;
    while (idx < text.length) {
      const slice = text.slice(idx);
      const m = slice.match(r.re);
      if (!m) break;
      const absolute = idx + m.index;
      const lineNo = text.slice(0, absolute).split('\n').length;
      const lineText = lines[lineNo - 1] || '';
      if (!lineText.includes(`forge-allow:${r.id}`)) {
        violations.push(`[${r.id}] ${r.msg}  (${file}:${lineNo})`);
      }
      idx = absolute + m[0].length;
    }
  }
}

finish('owasp-fast', violations);
