---
name: forge.skill.api-contract-snapshot
trigger: changes-touch
patterns:
  - "**/*Controller.cs"
  - "**/Controllers/**/*.cs"
  - "**/*.proto"
  - "**/openapi*.{yaml,yml,json}"
  - "**/swagger*.{yaml,yml,json}"
  - "**/contracts/**/*.{ts,cs}"
  - "**/ApiContracts/**/*.cs"
description: |
  Snapshots public API surface (route signatures, request/response DTOs, gRPC
  service messages) before and after a /forge.do run. Surfaces breaking diffs
  in the final report.
---

## Actions

1. **Before** /forge.do executes Phase 3, capture the current public surface:
   - For each controller / proto / openapi file matching the patterns,
     extract: HTTP verb, route, parameter types, response type.
   - Write `.forge/cache/contract-pre.json` (gitignored).

2. **After** Phase 3 succeeds, recapture into `.forge/cache/contract-post.json`.

3. **Diff** the two snapshots. Classify each change:
   - `added`     — new endpoint / message / field. Non-breaking.
   - `removed`   — endpoint / required field gone. **Breaking.**
   - `changed`   — parameter type, response type, or required-ness changed. **Breaking unless additive.**
   - `renamed`   — same shape, new name. **Breaking.**

4. Append to the final report a block:
   ```
   API contract diff
   -----------------
   + 2 added (non-breaking)
   ~ 1 changed (review)
   - 0 removed
   ```
   If any breaking change is detected, surface a one-line warning at the TOP
   of the report and add a line to the suggested commit message:
     `BREAKING CHANGE: <summary>`

5. Append a sub-bullet to the /forge.do decision entry:
   ```
   - API surface: +<a> ~<c> -<r>  (breaking: <yes|no>)
   ```

## Constraints
- Read-only outside `.forge/cache/`.
- Never modifies code; only reports.
- Skill execution counts against the /forge.do token budget; cap at 3K.
