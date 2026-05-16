#!/usr/bin/env node
/**
 * forge — cross-platform installer.
 *
 *   node install.mjs --target <path> [--agents copilot,cursor,claude,codex,all]
 *                                    [--force] [--no-detect]
 *
 * Works on Windows, macOS, Linux. Requires Node 18+.
 *
 * What it does
 *   1. Copies boilerplate/ into <target>, preserving any pre-existing
 *      protected files (constitution.md, decisions.md, *.yaml).
 *   2. Detects the project's primary stack (JS/TS, .NET, Python, Go, Rust,
 *      Ruby, Java) and writes `.forge/stack.json`.
 *   3. Fills `auto` placeholders in `.forge/gates.yaml` with concrete
 *      commands for the detected stack.
 *   4. Installs adapter files only for the coding agents you actually use
 *      (Copilot / Cursor / Claude Code / Codex / generic AGENTS.md).
 *   5. Ensures `.forge/cache/` is gitignored.
 *
 * No git commands are ever run (manual VCS — see constitution).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname, relative, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOILERPLATE = join(__dirname, 'boilerplate');

// ---------------- arg parsing ----------------
const args = process.argv.slice(2);
function arg(name, def = undefined) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const next = args[i + 1];
  return next && !next.startsWith('--') ? next : true;
}
const target  = resolve(arg('target', '.'));
const force   = !!arg('force', false);
const detect  = arg('no-detect') ? false : true;
const agentsArg = (arg('agents', 'all') || 'all').toString().toLowerCase();
const agents  = agentsArg === 'all'
  ? new Set(['copilot', 'cursor', 'claude', 'codex', 'generic'])
  : new Set(agentsArg.split(',').map((s) => s.trim()));

if (!existsSync(BOILERPLATE)) die(`boilerplate dir not found at ${BOILERPLATE}`);
if (!existsSync(target))      die(`target does not exist: ${target}`);

console.log(`[forge] installing into ${target}`);
console.log(`[forge] agents: ${[...agents].join(', ')}`);

// ---------------- copy boilerplate ----------------
// Protected files survive re-install unless --force.
const PROTECTED = new Set([
  '.forge/constitution.md',
  '.forge/decisions.md',
  '.forge/gates.yaml',
  '.forge/budget.yaml',
  '.forge/db-policy.yaml',
  '.forge/stack.json',
  'AGENTS.md',
]);
// Agent-adapter directories: install only if the user opted into that agent.
// Copilot installs both slash-command prompts AND agent-picker entries.
// Claude Code installs slash commands only — its subagent dir (.claude/agents/)
// is intentionally NOT shipped because recent VS Code Copilot builds also
// scan it, which produced duplicate entries in the Copilot agent picker.
const AGENT_DIRS = {
  copilot: ['.github/prompts', '.github/agents'],
  cursor:  ['.cursor/rules'],
  claude:  ['.claude/commands'],
  codex:   [],         // covered by AGENTS.md
  generic: [],         // covered by AGENTS.md
};
const ALL_AGENT_DIRS = Object.values(AGENT_DIRS).flat();

function shouldSkipPath(rel) {
  // Skip agent-adapter dirs the user did NOT select.
  for (const [agent, dirs] of Object.entries(AGENT_DIRS)) {
    if (agents.has(agent)) continue;
    for (const d of dirs) {
      if (rel === d || rel.startsWith(d + '/')) return true;
    }
  }
  // AGENTS.md only when generic or codex is in scope.
  if (rel === 'AGENTS.md' && !(agents.has('generic') || agents.has('codex'))) return true;
  return false;
}

let copied = 0, preserved = 0, skipped = 0;
walk(BOILERPLATE, (abs) => {
  const rel = relative(BOILERPLATE, abs).replaceAll('\\', '/');
  if (shouldSkipPath(rel)) { skipped++; return; }
  const dest = join(target, rel);
  if (PROTECTED.has(rel) && existsSync(dest) && !force) {
    console.log(`  preserve  ${rel}`);
    preserved++;
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(abs, dest);
  copied++;
});
console.log(`[forge] copied ${copied}, preserved ${preserved}, skipped ${skipped}`);

// ---------------- stack detection ----------------
let stack = { languages: [], frameworks: [], packageManager: null, testRunner: null, detectedAt: new Date().toISOString() };
if (detect) {
  stack = detectStack(target);
  const stackPath = join(target, '.forge', 'stack.json');
  if (!existsSync(stackPath) || force) {
    writeFileSync(stackPath, JSON.stringify(stack, null, 2) + '\n');
    console.log(`[forge] stack.json: ${stack.languages.join(', ') || '(none detected)'}`);
  } else {
    console.log(`[forge] preserve  .forge/stack.json (use --force to overwrite)`);
  }

  // Fill `auto` placeholders in gates.yaml only if user hasn't customised them.
  const gatesPath = join(target, '.forge', 'gates.yaml');
  if (existsSync(gatesPath)) {
    const before = readFileSync(gatesPath, 'utf8');
    const after = fillGatePlaceholders(before, stack);
    if (after !== before) {
      writeFileSync(gatesPath, after);
      console.log(`[forge] filled gates.yaml placeholders for ${stack.languages[0] || 'default'}`);
    }
  }
}

// ---------------- .gitignore ----------------
const gitignore = join(target, '.gitignore');
const cacheLine = '.forge/cache/';
if (existsSync(gitignore)) {
  const existing = readFileSync(gitignore, 'utf8');
  if (!existing.includes(cacheLine)) {
    writeFileSync(gitignore, existing.replace(/\s*$/, '') + `\n\n# forge\n${cacheLine}\n`);
    console.log(`[forge] appended ${cacheLine} to .gitignore`);
  }
} else {
  writeFileSync(gitignore, `# forge\n${cacheLine}\n`);
  console.log(`[forge] created .gitignore`);
}

// ---------------- next steps ----------------
console.log('');
console.log('[forge] done. Next steps (you run git yourself — manual VCS):');
console.log('  1. Open the target repo in your editor.');
console.log('  2. Invoke your coding agent and run:  /forge.init');
console.log('     (or in agents that don\'t support slash commands, ask:');
console.log('      "Run the forge.init workflow described in .forge/agents/forge.init.md")');
console.log('  3. Review .forge/constitution.md and edit anything you disagree with.');
console.log('  4. Stage and commit when ready.');

// ======================================================================
// helpers
// ======================================================================

function walk(dir, fn) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, fn);
    else fn(abs);
  }
}

function die(msg) { console.error(`[forge] ${msg}`); process.exit(1); }

function detectStack(root) {
  const has = (p) => existsSync(join(root, p));
  const hasAny = (pat) => {
    try { return readdirSync(root).some((f) => pat.test(f)); } catch { return false; }
  };
  const out = { languages: [], frameworks: [], packageManager: null, testRunner: null,
                lint: null, types: null, test: null, coverage: null, deps: null,
                detectedAt: new Date().toISOString() };

  // JS / TS
  if (has('package.json')) {
    out.languages.push('javascript');
    let pkg = {};
    try { pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')); } catch {}
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['typescript'] || has('tsconfig.json')) out.languages.push('typescript');
    if (deps['react'])    out.frameworks.push('react');
    if (deps['next'])     out.frameworks.push('next');
    if (deps['vue'])      out.frameworks.push('vue');
    if (deps['@angular/core']) out.frameworks.push('angular');
    if (deps['svelte'])   out.frameworks.push('svelte');
    if (deps['express'] || deps['fastify'] || deps['koa']) out.frameworks.push('node-server');

    out.packageManager = has('pnpm-lock.yaml') ? 'pnpm'
                       : has('yarn.lock')       ? 'yarn'
                       : has('bun.lockb')       ? 'bun'
                       : 'npm';
    const pm = out.packageManager;
    out.testRunner = deps['vitest'] ? 'vitest'
                   : deps['jest']   ? 'jest'
                   : deps['mocha']  ? 'mocha'
                   : (pkg.scripts && pkg.scripts.test) ? 'script'
                   : null;

    out.lint  = (pkg.scripts && pkg.scripts.lint)  ? `${pm} run lint` : 'npx eslint .';
    out.types = (deps['typescript'] || has('tsconfig.json')) ? 'npx tsc --noEmit' : '';
    out.test  = (pkg.scripts && pkg.scripts.test)  ? `${pm} test --silent`
              : out.testRunner === 'vitest' ? 'npx vitest run'
              : out.testRunner === 'jest'   ? 'npx jest --passWithNoTests'
              : '';
    out.coverage = out.testRunner === 'vitest' ? 'npx vitest run --coverage'
                 : out.testRunner === 'jest'   ? 'npx jest --coverage --passWithNoTests'
                 : (pkg.scripts && pkg.scripts['test:coverage']) ? `${pm} run test:coverage`
                 : '';
    out.deps  = `${pm} audit --audit-level=high`;
    return out;
  }

  // .NET
  if (hasAny(/\.(sln|csproj|fsproj|vbproj)$/i)) {
    out.languages.push('csharp');
    out.packageManager = 'nuget';
    out.testRunner = 'dotnet test';
    out.lint  = 'dotnet format --verify-no-changes';
    out.types = 'dotnet build --nologo -clp:ErrorsOnly';
    out.test  = 'dotnet test --nologo --verbosity quiet';
    out.coverage = 'dotnet test --nologo --collect:"XPlat Code Coverage"';
    out.deps  = 'dotnet list package --vulnerable --include-transitive';
    return out;
  }

  // Python
  if (has('pyproject.toml') || has('requirements.txt') || has('setup.py')) {
    out.languages.push('python');
    out.packageManager = has('poetry.lock') ? 'poetry'
                       : has('uv.lock')      ? 'uv'
                       : has('Pipfile')      ? 'pipenv'
                       : 'pip';
    out.testRunner = 'pytest';
    out.lint  = 'ruff check .';
    out.types = 'mypy .';
    out.test  = 'pytest -q';
    out.coverage = 'pytest --cov --cov-report=term-missing';
    out.deps  = 'pip-audit';
    return out;
  }

  // Go
  if (has('go.mod')) {
    out.languages.push('go');
    out.lint  = 'go vet ./...';
    out.types = 'go build ./...';
    out.test  = 'go test ./...';
    out.coverage = 'go test -coverprofile=coverage.out ./...';
    out.deps  = 'go list -m -u all';
    return out;
  }

  // Rust
  if (has('Cargo.toml')) {
    out.languages.push('rust');
    out.lint  = 'cargo clippy -- -D warnings';
    out.types = 'cargo check --all-targets';
    out.test  = 'cargo test --all-features';
    out.coverage = 'cargo llvm-cov --summary-only';
    out.deps  = 'cargo audit';
    return out;
  }

  // Ruby
  if (has('Gemfile')) {
    out.languages.push('ruby');
    out.lint  = 'bundle exec rubocop';
    out.types = '';
    out.test  = 'bundle exec rspec';
    out.coverage = 'bundle exec rspec';
    out.deps  = 'bundle audit check --update';
    return out;
  }

  // Java / Kotlin (Maven / Gradle)
  if (has('pom.xml')) {
    out.languages.push('java');
    out.lint  = 'mvn -q checkstyle:check';
    out.types = 'mvn -q compile';
    out.test  = 'mvn -q test';
    out.coverage = 'mvn -q verify';
    out.deps  = 'mvn -q dependency-check:check';
    return out;
  }
  if (has('build.gradle') || has('build.gradle.kts')) {
    out.languages.push('java');
    out.lint  = './gradlew --quiet check';
    out.types = './gradlew --quiet compileJava';
    out.test  = './gradlew --quiet test';
    out.coverage = './gradlew --quiet jacocoTestReport';
    out.deps  = './gradlew --quiet dependencyCheckAnalyze';
    return out;
  }

  return out;
}

function fillGatePlaceholders(yaml, stack) {
  // Replace `run: "auto"` lines for known gates. Only touches lines whose
  // value is literally `auto`; user-customised values are left alone.
  const map = {
    lint:        stack.lint || '',
    types:       stack.types || '',
    tests:       stack.test || '',
    coverage:    stack.coverage || '',
    deps:        stack.deps || '',
  };
  let out = yaml;
  for (const [key, cmd] of Object.entries(map)) {
    const re = new RegExp(`(\\b${key}:\\s*\\n\\s*run:\\s*)"auto"`, 'm');
    if (cmd) {
      out = out.replace(re, `$1"${cmd}"`);
    } else {
      out = out.replace(re, `$1""    # auto-detect found no tool; fill in manually or leave empty to skip`);
    }
  }
  return out;
}
