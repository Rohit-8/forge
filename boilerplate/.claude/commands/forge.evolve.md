---
description: Behaviour-preserving refactor. Adds characterisation tests first, then refactors against the constitution.
---

Run the **forge.evolve** workflow defined in `.forge/agents/forge.evolve.md`.

Honour all cross-cutting rules in `AGENTS.md`. Behaviour must be
preserved — tests prove it. Never run mutating git commands.

Target: $ARGUMENTS
