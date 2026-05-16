# Forge

**Code-first agentic delivery for any coding agent.**
One brief in, working code out. Two files persisted. Six commands.

forge turns your AI coding agent (Claude Code, Copilot, Cursor, Codex, or
anything that reads `AGENTS.md`) into a disciplined delivery loop:
research silently → propose one plan in chat → write RED tests → write
GREEN code → run programmatic gates → propose a commit. The human always
holds the keys to git and the database.

---

## What forge gives you

- **Cross-platform.** Runs on Windows, macOS, and Linux. The only runtime
  requirement is Node 18+ (for the gate scripts and installer). Your
  project can be in any language.
- **Cross-agent.** Ships adapters for GitHub Copilot, Claude Code,
  Cursor, and any agent that reads `AGENTS.md` (Codex CLI, Aider,
  Continue, Cline, and others).
- **Cross-stack.** Auto-detects JavaScript / TypeScript, .NET, Python,
  Go, Rust, Ruby, and Java / Kotlin. Gate commands are filled in for your
  stack at install time.
- **Two files grow over time:** `.forge/constitution.md` (the rules) and
  `.forge/decisions.md` (an append-only "why we did it" log). Everything
  else is cache, gate output, or per-feature brief.
- **Code + tests are the spec.** Per-feature specs are optional and only
  emitted on `--compliance`.
- **Programmatic gates over written checklists.** Lint, types, tests,
  coverage, secrets, OWASP-fast, conventions, constitution-compliance —
  all scripts. Pass/fail is objective.
- **Hard safety rails baked in:** the agent never runs `git add`,
  `git commit`, `git push`, or any DB write unless the brief explicitly
  opens that door.
- **Token-aware:** four budget presets (small / medium / large / xlarge)
  picked automatically by repo size; profile cache is sharded for 20K+
  file repos.
- **Three default skills:** API contract snapshotting, lockfile drift
  detection, generate-only DB migrations.

---

## Install into a target repo

**Prerequisite:** Node 18+ on `PATH`.

```bash
# Linux / macOS
./install.sh --target /path/to/your/repo --agents all
```

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File install.ps1 -Target C:\path\to\repo -Agents all
```

```bash
# Or call the Node installer directly (any OS)
node install.mjs --target /path/to/your/repo --agents all
```

### `--agents` flag

Pick which coding-agent adapters to install. Default is `all`.

| Value      | What it installs                                                              |
|------------|-------------------------------------------------------------------------------|
| `copilot`  | `.github/prompts/forge.*.prompt.md` + `.github/agents/forge.*.agent.md`       |
| `cursor`   | `.cursor/rules/forge.mdc`                                                     |
| `claude`   | `.claude/commands/forge.*.md` (slash commands)                                |
| `codex`    | `AGENTS.md` (the cross-agent index)                                           |
| `generic`  | `AGENTS.md` (same)                                                            |
| `all`      | All of the above                                                              |

Each command (`forge.init`, `forge.do`, `forge.audit`, `forge.evolve`,
`forge.scan`, `forge.config`) is registered for **both** slash invocation
**and** the host's agent picker wherever both surfaces exist (Copilot,
Claude Code). For hosts that only have one surface (Cursor rules, the
generic `AGENTS.md` convention), the equivalent entry point is used.

Combine with commas: `--agents copilot,cursor`.

The installer protects pre-existing `.forge/constitution.md`,
`decisions.md`, `*.yaml`, and `stack.json` so you can re-run it safely.
Use `--force` to overwrite. `.forge/cache/` is added to `.gitignore`.

Then, in your agent of choice:

```
/forge.init
```

This scans the repo, picks a size-tier budget preset, synthesises a
constitution from your stack, builds `.forge/cache/profile.json`,
verifies the gate commands, and confirms the three default skills.

For prod-grade non-regulated projects:

```
/forge.init --fast-mode
```

Sets `compliance: optional`, `tests.coverage.min: 70`,
`gates.deps.blocking: false`.

> Not all agents support slash commands. For agents that don't (e.g.
> Cursor), just say *"run the forge.init workflow described in
> `.forge/agents/forge.init.md`"*.

---

## The six commands

| Command         | Purpose                                                                                                |
|-----------------|--------------------------------------------------------------------------------------------------------|
| `/forge.init`   | First-time setup. Scan repo, draft constitution, install gates + default skills. Idempotent with `--refresh`. |
| `/forge.do`     | The main loop: silent research → ONE inline plan + RED scenarios → wait for `ship`/`refine`/`default` → TDD → gates → suggested commit. Supports `--resume`, `--compliance`, `--fast`, `db:*` directives. |
| `/forge.audit`  | Read-only OWASP-fast + secrets + dependency + license + stale-code sweep. Writes only `audits/YYYY-MM-DD-<scope>.md`. |
| `/forge.evolve` | Behaviour-preserving refactor. Adds characterisation tests first, then refactors against the current constitution. Logs a decision. |
| `/forge.scan`   | Read-only Q&A over the cached profile + live source. Cites `path:line`. Special form `/forge.scan budget` reports token usage. |
| `/forge.config` | Add a skill, amend the constitution, or generate a compliance spec. (Replaces the older `/forge.add-skill`, `/forge.amend`, `/forge.spec`.) |

---

## `/forge.do` in detail

The workhorse. Three phases per run:

1. **Phase 1 — Silent research.** Load constitution, profile cache,
   applicable skills. Targeted re-scan of relevant modules only. Nothing
   in chat.
2. **Phase 2 — One plan in chat.** ≤ 30 lines: file map, RED test list,
   acceptance bar, assumptions. Waits for `ship` / `refine: <note>` /
   `default`. Trivial fixes (typos, null-checks) and `--fast` skip this
   phase entirely.
3. **Phase 3 — Execute.** RED tests → GREEN code → all gates → propose a
   commit message (NOT committed). Append a 3–6 line entry to
   `decisions.md`.

### Brief directives

| Directive            | Effect                                                              |
|----------------------|---------------------------------------------------------------------|
| `db:<env>-readonly`  | Open a read-only DB connection for the run.                         |
| `db:<env>-write`     | Writes allowed when each statement carries `db:write:<reason>`.     |
| `db:admin:<reason>`  | DDL / admin allowed; requires a second confirmation.                |
| `--compliance`       | Also emit `features/<NNN>-<slug>/spec.md`.                          |
| `--fast`             | Trivial-fix mode: skip Phase 2 plan; go straight to TDD + gates.    |
| `--resume`           | Continue a feature started earlier (reads prior decision + diff).   |

### Example briefs

```
/forge.do "Add CSV export to the matters grid"
/forge.do "Backfill missing user.lastLoginAt" db:prod-readonly
/forge.do "Resume work on PROJ-1234 invoice approval flow" --resume
/forge.do "Add SOX-compliant audit logging to payment service" --compliance
/forge.do "Fix typo in onboarding email" --fast
```

---

## Default skills

Three skills are installed by `/forge.init` and auto-fire when their
triggers match. Each runs inside `/forge.do` and counts against its own
token cap.

| Skill | Fires when | What it does |
|---|---|---|
| `forge.api-contract-snapshot` | Controller / OpenAPI / `.proto` / `ApiContracts/*.cs` touched | Snapshots public API surface before and after the run; classifies diffs as added / removed / changed / renamed; warns on breaking changes and tags the suggested commit with `BREAKING CHANGE`. |
| `forge.lock-drift`            | Every `/forge.do`                                              | Warns when a manifest (`package.json`, `*.csproj`, `Cargo.toml`, `pyproject.toml`, `Gemfile`, …) changed but the lock file did not, or vice versa. |
| `forge.migration-generate-only` | `*DbContext*.cs`, `Entities/`, `prisma/schema.prisma`, `migrations/`, etc. touched | Detects framework (EF Core / Alembic / Prisma / Rails / Django) and generates a migration file. **Never applies it.** |

Add your own:

```
/forge.config skill add "Detect TUS upload endpoints touched and run contract tests"
```

---

## The constitution

A common template ships in `.forge/constitution.md`. It contains 15
principles divided into:

- **1–9 Project-specific** — language strictness, naming, testing, UI,
  performance, reuse, clean-as-you-code, test management, E2E. All marked
  `[CUSTOMIZE]`; you edit them on day one.
- **10–15 Cross-cutting hard requirements** — manual VCS, DB read-only
  default, token budgets, one-shot clarify, security, documentation.
  Included in every forge install verbatim.

`/forge.init` will fill in the customizable sections from your detected
stack where it can.

---

## Programmatic gates

Defined in `.forge/gates.yaml`. The four forge-shipped gates are
cross-platform Node.js scripts (`.forge/gates/*.mjs`). Stack-specific
gates (lint / types / tests / coverage / deps) start as `auto`
placeholders and are filled in by the installer.

| Gate           | Blocking | Default check                                              |
|----------------|----------|------------------------------------------------------------|
| `lint`         | yes      | auto-detected per stack (e.g. `npm run lint`, `ruff check .`) |
| `types`        | yes      | auto-detected (e.g. `tsc --noEmit`, `mypy .`, `dotnet build`) |
| `tests`        | yes      | auto-detected (e.g. `npm test`, `pytest -q`, `dotnet test`)    |
| `coverage`     | yes      | ≥ 80 % (or 70 % in `--fast-mode`) on touched files          |
| `secrets`      | yes      | `node .forge/gates/secrets.mjs` — regex sweep              |
| `owasp_fast`   | yes      | `node .forge/gates/owasp-fast.mjs` — known-bad patterns    |
| `deps`         | no       | auto-detected (e.g. `npm audit`, `pip-audit`, `cargo audit`) |
| `conventions`  | yes      | `node .forge/gates/conventions.mjs` — uses cached profile  |
| `constitution` | yes      | `node .forge/gates/constitution.mjs` — checkable principles |

Override any gate or threshold per project by editing `gates.yaml`.

---

## Budget presets

Picked automatically by `/forge.init` based on source-file count:

| Preset   | File count        | `/forge.do` soft / hard | Profile sharded |
|----------|-------------------|-------------------------|-----------------|
| `small`  | < 5,000           | 25K / 60K               | no              |
| `medium` | 5,000 – 20,000    | 40K / 100K              | no              |
| `large`  | 20,000 – 60,000   | 60K / 150K              | yes             |
| `xlarge` | > 60,000          | 100K / 250K             | yes             |

When sharded, the profile splits into `profile.json` (index) + one
`profile.<area>.json` per top-level area. Commands load only the shards
they need.

Check usage anytime:

```
/forge.scan budget
```

---

## Folder layout

```
forge/                                  ← this framework's source
├── README.md
├── install.mjs                         ← cross-platform installer (Node 18+)
├── install.sh                          ← *nix wrapper
├── install.ps1                         ← Windows wrapper
├── docs/
│   └── command-reference.md
└── boilerplate/                        ← copied into target repo on install
    ├── AGENTS.md                       ← cross-agent rules (Codex/Aider/Cline/Continue/…)
    ├── .forge/
    │   ├── constitution.md             ← 15 principles (re-read every command)
    │   ├── decisions.md                ← append-only "why" log
    │   ├── gates.yaml                  ← which gates, with what thresholds
    │   ├── budget.yaml                 ← 4 presets + sharding policy
    │   ├── db-policy.yaml              ← DB allow-lists + query caps
    │   ├── stack.json                  ← detected stack (written at install)
    │   ├── cache/                      ← gitignored; profile.json + shards
    │   ├── agents/forge.*.md           ← canonical command specs (6)
    │   ├── gates/*.mjs                 ← cross-platform Node 18+ gate scripts
    │   └── skills/*.skill.md           ← 3 default skills + your additions
    ├── .github/prompts/forge.*.prompt.md   ← Copilot slash commands
    ├── .github/agents/forge.*.agent.md     ← Copilot agent picker
    ├── .claude/commands/forge.*.md         ← Claude Code slash commands
    ├── .cursor/rules/forge.mdc             ← Cursor always-on rules
    ├── features/                       ← optional; briefs + compliance specs
    └── audits/                         ← read-only audit reports
```

---

## Day-to-day workflow

1. **One-time:** `/forge.init` (and `--fast-mode` if non-regulated).
2. **Every feature:** `/forge.do "<one-line brief>"`. Review the plan.
   Reply `ship` / `refine: ...` / `default`. Review the proposed commit.
   Commit it yourself.
3. **Stuck mid-feature next day:** `/forge.do "<same brief>" --resume`.
4. **Need to understand the codebase:** `/forge.scan "<question>"`.
5. **Security or dependency sweep:** `/forge.audit` (or
   `/forge.audit <area>`).
6. **Refactor:** `/forge.evolve <target>`.
7. **Constitution / skills change:** `/forge.config <skill|amend|spec> ...`.

---

## Housekeeping

- **Decisions log rotation.** `decisions.md` is append-only. Once a year
  (or when it exceeds ~2K lines), move it manually to
  `.forge/decisions/<YYYY>.md` and start a fresh `decisions.md`.
  `/forge.scan` reads both current and archived files.
- **Skill failure isolation.** A skill that exceeds its token cap is
  skipped and logged; it never aborts the whole `/forge.do` run.
- **Cross-feature sequencing** is intentionally out of scope. Use your
  issue tracker (Jira, GitHub Issues, Linear). forge optimises individual
  feature execution.

---

See [docs/command-reference.md](docs/command-reference.md) for the full
command surface.
