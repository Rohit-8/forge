---
mode: agent
description: Read-only Q&A over the cached codebase profile and live source. Never writes files.
---

Run the **forge.scan** workflow defined in `.forge/agents/forge.scan.md`.

Honour all cross-cutting rules in `AGENTS.md`. Read-only — never modify
files. Use `/forge.scan budget` to report token usage.

Question:
$ARGUMENTS
