---
description: Read-only security + dependency + license audit. Writes only audits/YYYY-MM-DD-<scope>.md.
---

Run the **forge.audit** workflow defined in `.forge/agents/forge.audit.md`.

Honour all cross-cutting rules in `AGENTS.md`. Read-only — never modify
source files. Never run mutating git commands.

Scope (optional, default = whole repo): $ARGUMENTS
