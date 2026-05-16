# forge — Command reference

Six commands. All are invoked from your coding agent's chat surface
(slash commands in Copilot / Claude Code, natural language in Cursor /
Aider / Cline / Codex CLI — they read `AGENTS.md` and the canonical
specs under `.forge/agents/`).

## Core

### `/forge.init`
First-time setup. Reads `.forge/stack.json` (written by the installer)
or detects the stack itself; synthesises `.forge/constitution.md`; builds
`.forge/cache/profile.json` (sharded for > 20K-file repos); verifies gate
commands; installs the three default skills. Idempotent with `--refresh`.

Flags:
- `--refresh`    regenerate cache + re-propose constitution
- `--fast-mode`  prod-grade non-regulated preset: `compliance: optional`,
                 `tests.coverage.min: 70`, `gates.deps.blocking: false`

Warns inline if no test runner is detected and offers to scaffold one
(human confirms; never auto-installed).

Persists:
- `.forge/constitution.md` (created or preserved + filled)
- `.forge/decisions.md` (bootstrap entry with size tier + mode)
- `.forge/cache/profile.json` (gitignored; sharded when large)
- `.forge/skills/forge.{api-contract-snapshot,lock-drift,migration-generate-only}.skill.md`

### `/forge.do <brief>`
The main loop. Two LLM round-trips before code: silent research, then ONE
inline plan + RED scenarios, wait for `ship` / `refine` / `default`,
execute TDD, run all gates, append a decision entry, propose a commit.
Never commits.

Directives the brief may include:
- `db:<env>-readonly` — open a read-only DB connection for the run
- `db:<env>-write`    — writes need per-statement `db:write:<reason>` + confirm
- `db:admin:<reason>` — DDL / admin needs a second confirmation
- `--compliance`      — also emit `features/<NNN>-<slug>/spec.md`
- `--fast`            — trivial-fix mode: skip Phase 2 plan; go straight to TDD
- `--resume`          — continue a feature started earlier; reads prior
                        decision entry + `git diff`, reconstructs the plan,
                        appends a new decision entry referencing the previous one

Default skills (auto-fire when their `trigger` matches):
- `forge.api-contract-snapshot` — detects breaking changes in controllers /
  OpenAPI / proto; tags commit with `BREAKING CHANGE` when needed
- `forge.lock-drift` — warns when lockfile / manifest are out of step
- `forge.migration-generate-only` — generates EF / Alembic / Prisma /
  Rails / Django migration files but never applies them

### `/forge.audit [scope]`
Read-only OWASP-fast + secrets + dependency + license + stale-code sweep.
Writes only `audits/YYYY-MM-DD-<scope>.md`. Default scope = whole repo.

### `/forge.evolve <target>`
Behaviour-preserving refactor / modernisation. Adds characterisation
tests first, then refactors against the current constitution. Same TDD +
gates as `/forge.do`. Logs a decision.

### `/forge.scan <question>`
Read-only Q&A. Cache-first; live source only when needed. Cites
`path:line`. Special form `/forge.scan budget` reports rolling 30-day
token usage per command. First-class use-cases:
- `/forge.scan "decisions touching <area>"` — greps decisions log
- `/forge.scan "1-page architectural overview"` — onboarding summary
- `/forge.scan "who owns <path>"` — falls back to read-only `git log`
- `/forge.scan "test coverage map for <module>"` — flags untested files

### `/forge.config <subcommand> <args>`
Low-frequency configuration changes. One command, three subcommands.

| Subcommand                | Effect                                                                 |
|---------------------------|------------------------------------------------------------------------|
| `skill add <description>` | Creates `.forge/skills/<kebab>.skill.md`.                              |
| `amend <change>`          | Diffs constitution change first, applies on `ship`, bumps version, re-validates history. |
| `spec <feature>`          | Writes `features/<NNN>-<slug>/spec.md` (Gherkin-only scenarios) for an existing feature. |

(Replaces the older `/forge.add-skill`, `/forge.amend`, `/forge.spec`
commands.)

---

## Cross-cutting rules (every command)

- **Manual VCS** — agents never run `git add`, `git commit`, `git push`,
  `git tag`, `git merge`, `git rebase`, `git reset`, `git checkout -B`,
  `git switch -c`, `git stash` (mutating), `git clean`, or anything
  `--force`. Read-only git is fine.
- **DB read-only default** — no connection unless brief authorises one.
  Writes require per-statement opt-in + human confirmation of exact SQL.
- **Token budgets** — see `.forge/budget.yaml`. Cache before scan, scan
  before read. Diffs / plans summarised, never pasted in full.
- **One-shot clarify** — never drip-feed questions. Max 3 per command,
  batched, with multiple-choice + recommended default + `default` shortcut.
- **Programmatic gates** — `.forge/gates.yaml` lists what runs before a
  command reports done. Override per project.
- **Cross-feature sequencing** is out of scope — use your issue tracker.
  forge optimises individual feature execution, not portfolio management.
- **Decisions log rotation** — forge appends only. Once a year (or when
  `decisions.md` exceeds ~2K lines), the human moves it to
  `.forge/decisions/<YYYY>.md` and starts a fresh `decisions.md`.
  `/forge.scan` reads both the current file and any rotated archives.

## File map

```
.forge/
  agents/forge.*.md            ← canonical command specs (6)
  constitution.md              ← rules (re-read at every command)
  decisions.md                 ← append-only log of non-obvious choices
  decisions/<YYYY>.md          ← rotated archives (created by human)
  gates.yaml                   ← which gates, with what thresholds
  budget.yaml                  ← token ceilings per command (4 presets)
  db-policy.yaml               ← DB allow-lists + caps
  stack.json                   ← detected stack (written at install)
  cache/profile.json           ← gitignored cached codebase profile
  cache/profile.<area>.json    ← shards (only when repo > 20K files)
  cache/contract-*.json        ← API-contract snapshot skill cache
  gates/*.mjs                  ← cross-platform Node 18+ gate scripts
  skills/*.skill.md            ← 3 default skills + your additions

AGENTS.md                      ← cross-agent index (Codex/Aider/Cline/…)
.github/prompts/forge.*.prompt.md   ← Copilot adapter
.claude/commands/forge.*.md         ← Claude Code adapter
.cursor/rules/forge.mdc             ← Cursor adapter

features/                      ← optional; briefs and compliance specs
audits/                        ← read-only audit reports
```
