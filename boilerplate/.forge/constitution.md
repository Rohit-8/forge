# Constitution

> **⚠ UPDATE THIS FILE FOR YOUR PROJECT.**
> This is a common starting template shipped with forge. After running
> `/forge.init`, review every section below and tailor it to your stack,
> team conventions, and compliance needs. The agent re-reads this file at
> the start of **every** command and enforces it as law.
>
> Sections marked `[CUSTOMIZE]` **must** be edited before your first
> `/forge.do`. Delete the marker once you've made the section yours.

## Version

1.0.0 — common template

---

## How to update this constitution

1. **Run `/forge.init`** — it scans your repo and may auto-fill some
   sections (language, framework, design system). It preserves your
   manual edits if the file already exists.
2. **Search for `[CUSTOMIZE]`** — every section that needs your input is
   flagged. Replace placeholder text with your project's real values.
3. **Add or remove principles** — not every project needs UI rules, E2E,
   or compliance. Delete what doesn't apply; add what does.
4. **Commit this file** — it lives in source control so the whole team
   (and the agent) share the same rules.
5. **Evolve it over time** — use `/forge.config amend "<change>"` to
   propose changes. Every change is logged in `decisions.md`.

---

## Principles

### 1. Language & strictness  [CUSTOMIZE]

Use the strictest compiler and linter settings your language supports.
Suppress warnings only with a linked ticket number in the comment.

Examples (delete the rows that don't apply):
- **TypeScript:** strict mode on. No `any`. No `@ts-ignore` without a ticket.
- **Python:** type hints on all public APIs. `mypy --strict`. `ruff` clean.
- **C#:** nullable reference types enabled. No `#pragma warning disable`.
- **Go:** `go vet` + `staticcheck` clean. No `//nolint` without a ticket.
- **Rust:** `clippy -D warnings`. No `#[allow(...)]` without a ticket.

### 2. Code structure & naming  [CUSTOMIZE]

Follow a consistent folder-per-feature (or folder-per-domain) layout.
Naming conventions must match what the project's linter enforces.

Examples (delete those that don't apply):
- **React:** function components only, `camelCase.tsx` file names.
- **.NET:** PascalCase classes, one class per file, folder-per-feature.
- **Python:** snake_case modules, `__init__.py` re-exports per package.
- **Go:** package-per-domain, exported names PascalCase.

### 3. Testing (TDD)

Red → Green → Refactor. The agent MUST NOT generate implementation code
before a failing test exists for the behaviour being added.

- Unit tests co-located: `*.spec.*` / `*.test.*` (or `test_*.py`,
  `*_test.go`, `*Tests.cs`) next to the source file.
- Integration tests live in a top-level `tests/` (or `__tests__/`) folder.
- Prefer real implementations over mocks where feasible.

### 4. UI & accessibility  [CUSTOMIZE — delete if no UI]

WCAG 2.1 AA minimum. Prefer the project's chosen design system /
component library over hand-rolled UI. Semantic HTML. Keyboard-navigable.

State your design system here (MUI, Tailwind, Chakra, Fluent, Blazor,
SwiftUI, Jetpack Compose, etc.).

### 5. Performance

- Deduplicate API and DB calls.
- Server-side pagination for any list endpoint.
- Lazy-load routes and heavy modules.
- Memoise expensive computations.
- Profile before optimising — no premature micro-optimisation.

### 6. Code reuse  [CUSTOMIZE]

List internal packages, shared libraries, or monorepo modules the agent
should search before creating new code. Duplicated logic is a defect.

### 7. Clean as you code

- No dead code checked in.
- No `console.log` / `print` / `Console.WriteLine` debug statements in
  committed code.
- No `TODO` / `FIXME` / `HACK` without an associated ticket id
  (e.g. `PROJ-123`, `#456`).
- Imports are sorted; unused imports are removed.

### 8. Test management  [CUSTOMIZE — delete if not applicable]

If you use a test management tool (qTest, TestRail, Zephyr, etc.), state
the rule here. Features with acceptance scenarios SHOULD have entries in
that tool.

### 9. E2E / integration automation  [CUSTOMIZE — delete if not applicable]

State your E2E framework (Playwright, Cypress, Selenium, etc.) and the
rule. Critical user-facing flows SHOULD have automated E2E coverage.

### 10. Source control (manual only)

Agents MAY only invoke **read-only** git commands (`status`, `diff`,
`log`, `show`, `blame`, `branch --list`). Any **mutating** git command
(`add` / `commit` / `push` / `tag` / `merge` / `rebase` / `reset` /
`checkout -B` / `switch -c` / `stash` / `clean` / `--force`) is reserved
for the human operator. Agents prepare changes and propose commit
messages; they do not commit them.

### 11. Database access (read-only default)

Agents default to **no DB connection** (`db:none`). When the human
authorises a connection via `db:<env>-readonly`, only `SELECT`-family
statements run, with row caps and auto-disconnect. Writes require
per-statement `db:write:<reason>` plus human confirmation of the exact
statement. Admin DDL / permissions require `db:admin:<reason>` plus a
second confirmation. PII columns are auto-redacted in any chat output.
Full policy lives in `.forge/db-policy.yaml`.

### 12. Token budgets

Every command honours `.forge/budget.yaml`. Cache before scan, scan
before read. No whole-repo reads. Diffs and plans are summarised, never
pasted in full.

### 13. One-shot clarification

The agent NEVER asks a question it can answer from the codebase or
constitution. When it must ask, all questions appear in a **single**
message (max 3), each with multiple choice + recommended default + a
`default` shortcut.

### 14. Security

- No secrets, tokens, or credentials in source code — use environment
  variables or a secrets manager.
- Dependencies are audited; known high / critical CVEs block the gate.
- OWASP Top 10 awareness: validate inputs, parameterise queries, escape
  outputs, enforce least-privilege.

### 15. Documentation  [CUSTOMIZE]

Public-facing APIs and exported functions must have doc-comments
(JSDoc / docstrings / XML-doc / godoc). A README must exist for every
deployable unit.

---

## Compliance mode

```
compliance: optional
```

Set to `required` to force `/forge.do --compliance` for every feature.
Required mode emits spec files under `features/` and enforces full
traceability.

## Coverage threshold

```
tests.coverage.min: 80
```

Adjust to your team's target. The `coverage` gate in `gates.yaml` reads
this value.
