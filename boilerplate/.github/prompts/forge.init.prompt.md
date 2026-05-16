---
mode: agent
description: First-time forge setup. Detect stack, synthesise constitution, build profile, verify gates.
---

Run the **forge.init** workflow defined in `.forge/agents/forge.init.md`.

Honour all cross-cutting rules in `AGENTS.md` (manual VCS, DB read-only,
token budgets, one-shot clarify). Never run mutating git commands.

Arguments:
$ARGUMENTS
