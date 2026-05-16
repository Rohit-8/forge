# AGENTS.md

> This file is read by most AI coding agents (Codex CLI, Cursor, Aider,
> Continue, Cline, and others that follow the emerging `AGENTS.md`
> convention). It tells the agent how to behave in this repository.

This project uses **forge** — a small, opinionated framework for
disciplined agent-assisted delivery. The agent must follow these rules at
all times.

## Cross-cutting hard rules

1. **Manual VCS.** You may run read-only git commands (`status`, `diff`,
   `log`, `show`, `blame`). You MUST NOT run any mutating git command
   (`add`, `commit`, `push`, `tag`, `merge`, `rebase`, `reset`,
   `checkout -B`, `switch -c`, `stash`, `clean`, or anything `--force`).
   Prepare changes and propose a commit message; the human runs git.

2. **Database read-only by default.** No DB connection unless the brief
   explicitly opens one with `db:<env>-readonly` (SELECT-family only),
   `db:<env>-write` (per-statement opt-in), or `db:admin:<reason>`
   (requires a second human confirmation). Full policy in
   `.forge/db-policy.yaml`.

3. **Token budgets.** Honour `.forge/budget.yaml`. Cache before scan,
   scan before read. No whole-repo reads. Diffs and plans are summarised,
   never pasted in full.

4. **One-shot clarification.** Never drip-feed questions. Maximum 3
   questions per command, batched into a single message, each with
   multiple-choice options and a recommended default.

5. **Programmatic gates.** Before reporting a task done, run every gate
   in `.forge/gates.yaml`. Blocking gates must pass.

6. **Constitution.** Re-read `.forge/constitution.md` at the start of
   every command and enforce it.

## Commands

Each command has a canonical spec under `.forge/agents/`. When invoked
(via a slash command, a skill, or natural language like "run the forge.do
workflow"), follow the spec literally.

| Command         | Canonical spec                              | Purpose                                                                 |
|-----------------|---------------------------------------------|-------------------------------------------------------------------------|
| `/forge.init`   | `.forge/agents/forge.init.md`               | First-time setup: detect stack, synthesise constitution, build profile. |
| `/forge.do`     | `.forge/agents/forge.do.md`                 | Main feature/bugfix loop. Plan → RED → GREEN → gates → suggested commit. |
| `/forge.audit`  | `.forge/agents/forge.audit.md`              | Read-only security + dependency + license audit.                        |
| `/forge.evolve` | `.forge/agents/forge.evolve.md`             | Behaviour-preserving refactor.                                          |
| `/forge.scan`   | `.forge/agents/forge.scan.md`               | Read-only Q&A over the cached profile.                                  |
| `/forge.config` | `.forge/agents/forge.config.md`             | Add a skill, amend the constitution, or generate a compliance spec.     |

## How to invoke

Each command is available as both a **slash command** and a **picker-mode
agent** wherever the host supports both.

- **GitHub Copilot Chat (VS Code):**
  - Slash commands: `/forge.do "<brief>"`, `/forge.init`, … — prompts in
    `.github/prompts/`.
  - Agent picker (Ctrl+Shift+I → agent dropdown): pick `forge.do`,
    `forge.init`, etc. — agent files in `.github/agents/`.
- **Claude Code:**
  - Slash commands: `/forge.do "<brief>"` — command files in
    `.claude/commands/`.
- **Cursor:** rules are always-on from `.cursor/rules/forge.mdc`. Invoke
  by saying "run the forge.do workflow for `<brief>`" or similar.
- **Codex CLI / Aider / Cline / Continue / any agent that reads `AGENTS.md`:**
  invoke by saying "follow the forge.do workflow in
  `.forge/agents/forge.do.md`" plus the brief.

## Files the agent owns

```
.forge/
  agents/*.md                ← canonical command specs (read at every command)
  constitution.md            ← project rules (re-read at every command)
  decisions.md               ← append-only "why we did it" log
  gates.yaml                 ← gate commands and thresholds
  budget.yaml                ← token budgets per command
  db-policy.yaml             ← database allow-lists and caps
  stack.json                 ← detected stack (written by installer / forge.init)
  cache/                     ← gitignored; profile.json + shards
  gates/*.mjs                ← cross-platform gate scripts (Node 18+)
  skills/*.skill.md          ← per-project automation skills

.github/
  prompts/forge.*.prompt.md  ← Copilot slash commands
  agents/forge.*.agent.md    ← Copilot agent-picker entries (Ctrl+Shift+I)

.claude/
  commands/forge.*.md        ← Claude Code slash commands

.cursor/
  rules/forge.mdc            ← Cursor always-on rules + command index

AGENTS.md                    ← this file — for Codex/Aider/Cline/Continue/…
```
