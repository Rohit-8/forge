---
mode: agent
description: Feature/bugfix loop — plan → RED tests → GREEN code → gates → suggested commit. Never commits.
---

Run the **forge.do** workflow defined in `.forge/agents/forge.do.md`.

Honour all cross-cutting rules in `AGENTS.md` (manual VCS, DB read-only,
token budgets, one-shot clarify). Never run mutating git commands.

Brief:
$ARGUMENTS
