---
description: Add a skill, amend the constitution, or generate a compliance spec. Replaces /forge.add-skill, /forge.amend, /forge.spec.
---

Run the **forge.config** workflow defined in `.forge/agents/forge.config.md`.

Subcommands: `skill add <description>`, `amend <change>`, `spec <feature>`.

Honour all cross-cutting rules in `AGENTS.md`. Never run mutating git
commands.

Arguments: $ARGUMENTS
