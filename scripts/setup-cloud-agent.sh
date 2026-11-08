#!/usr/bin/env bash

# Prepares a disposable cloud agent machine. Runs the regular setup, warms the
# local Supabase images, and writes a git-ignored .env.local so commands such
# as `pnpm validate` work without manual configuration.

set -euo pipefail

./scripts/setup.sh

pnpm db:start

if [[ ! -f .env.local ]]; then
  ./scripts/with-local-supabase.sh bash -c '
    umask 077
    printf "%s=%s\n" \
      SESSION_SECRET "$(openssl rand -hex 32)" \
      SUPABASE_URL "$SUPABASE_URL" \
      SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY" \
      SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY" \
      >.env.local
  '
fi

# Keep the pulled images but drop the database so each machine starts from
# migrations and seed data.
pnpm db:stop --no-backup
