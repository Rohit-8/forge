---
name: forge.skill.lock-drift
trigger: always
patterns:
  - "**/package-lock.json"
  - "**/yarn.lock"
  - "**/pnpm-lock.yaml"
  - "**/packages.lock.json"
  - "**/Cargo.lock"
  - "**/Gemfile.lock"
  - "**/poetry.lock"
description: |
  Detects dependency lock drift introduced by a /forge.do run. Warns when a
  lock file changed (or, conversely, manifest changed but lock did not).
---

## Actions

1. At the start of /forge.do, record `git diff --name-only --diff-filter=ACM`
   for each matching lock file. If any are already dirty, note it and proceed
   (the human is mid-work; not a forge issue).

2. After /forge.do finishes:
   - If a manifest changed (`package.json`, `*.csproj`, `Cargo.toml`,
     `pyproject.toml`, `Gemfile`) but the corresponding lock did NOT change,
     surface a warning:
       `Manifest changed without lock update — run install before committing.`
   - If the lock changed but no manifest did, surface a warning:
       `Lock file moved without manifest change — review for unintended
        transitive bumps.`
   - If both changed in step, report a one-line summary of new/removed/upgraded
     dependencies. Cap at 10 lines.

3. Append to the /forge.do decision entry when relevant:
   ```
   - Deps: +<n> added, ~<n> upgraded, -<n> removed
   ```

## Constraints
- Read-only.
- Never runs `npm install` / `dotnet restore` / `cargo update` automatically.
- Token cap: 1.5K.
