---
name: forge.skill.migration-generate-only
trigger: changes-touch
patterns:
  - "**/*DbContext*.cs"
  - "**/Entities/**/*.cs"
  - "**/Models/**/*.cs"
  - "**/Migrations/**/*.cs"
  - "**/migrations/**/*.py"
  - "**/migrations/**/*.rb"
  - "**/prisma/schema.prisma"
  - "**/alembic/versions/**/*.py"
description: |
  When entity / schema files change, generate the corresponding migration
  file but NEVER apply it. The human runs the apply step.
---

## Actions

1. Detect framework:
   - `*DbContext*.cs` + `*.csproj` referencing `Microsoft.EntityFrameworkCore`
     → EF Core
   - `alembic.ini` present → Alembic
   - `prisma/schema.prisma` → Prisma
   - `config/database.yml` + `db/migrate/` → Rails ActiveRecord
   - `manage.py` + `django.db` import → Django

2. Generate the migration file (one only — refuse if multiple frameworks would
   apply):
   - EF Core:        `dotnet ef migrations add <feature-slug> --no-build`
   - Alembic:        `alembic revision --autogenerate -m "<feature-slug>"`
   - Prisma:         `npx prisma migrate dev --create-only --name <feature-slug>`
   - Rails:          `bin/rails generate migration <CamelSlug>`
   - Django:         `python manage.py makemigrations --name <feature-slug>`

3. **DO NOT** run any apply command. The constitution forbids it (db-policy:
   `migrations.generateOnly: true`).

4. Append to the /forge.do decision entry:
   ```
   - Migration: generated <path/to/file> (run apply manually)
   ```

5. Add to the suggested commit block in the final report:
   ```
   # When ready, apply with (NOT run by agent):
   #   <framework apply command>
   ```

## Constraints
- Generates one migration file per /forge.do run.
- Refuses to run any DDL or `database update`-style command.
- Token cap: 2K.
- Errors propagate as forge.do gate failures (blocking).
