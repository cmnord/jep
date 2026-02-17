# Agents

## Validation

Run the full validation suite (lint, format, typecheck, unit tests, e2e tests):

```sh
npm run validate
```

### Individual checks

**Lint** (ESLint):

```sh
npm run lint
```

**Format** (oxfmt):

```sh
npm run format
```

This writes formatted files in-place. CI should run the same command — oxfmt
exits non-zero when it reformats files, so a dirty working tree means format
failure.

**Typecheck** (TypeScript):

```sh
npm run typecheck
```

This generates React Router types first (`react-router typegen`), then checks
the app and Cypress projects.

**Unit tests** (Vitest):

```sh
npm run test -- --run
```

`npm run test` (without `--run`) starts Vitest in watch mode with coverage.

**E2E tests** (Cypress):

```sh
npm run test:e2e:run
```

Builds the app, starts the server on port 8811, and runs Cypress headless. A
running local Supabase instance is required (`npm run db:start`).
