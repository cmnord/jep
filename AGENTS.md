# Agents

## Validation

Run the full validation suite (lint, format, typecheck, unit tests, e2e tests):

```sh
pnpm validate
```

### Individual checks

**Lint** (ESLint):

```sh
pnpm lint
```

**Format** (oxfmt):

```sh
pnpm format
```

This writes formatted files in-place. CI should run the same command — oxfmt
exits non-zero when it reformats files, so a dirty working tree means format
failure.

**Typecheck** (TypeScript):

```sh
pnpm typecheck
```

This generates React Router types first (`react-router typegen`), then checks
the app.

**Unit tests** (Vitest):

```sh
pnpm test -- --run
```

`pnpm test` (without `--run`) starts Vitest in watch mode with coverage.

**E2E tests** (Playwright):

```sh
pnpm test:e2e:run
```

Builds the app, starts the server, and runs Playwright headless. A running
local Supabase instance is required (`pnpm db:start`).

For interactive development with the Playwright UI:

```sh
pnpm test:e2e:dev
```
