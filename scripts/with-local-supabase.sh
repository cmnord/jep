#!/usr/bin/env bash

# Run a command with credentials from the active local Supabase stack instead
# of potentially stale values in a developer's local override file.

set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 2
fi

# Supabase generates these credentials for the active local stack. They can
# change across CLI upgrades, so prefer them over values in .env.local.
status_env="$(npm run --silent db:status)"
while IFS="=" read -r name value; do
  value="${value#\"}"
  value="${value%\"}"

  case "$name" in
    API_URL) SUPABASE_URL="$value" ;;
    ANON_KEY) SUPABASE_ANON_KEY="$value" ;;
    SERVICE_ROLE_KEY) SUPABASE_SERVICE_ROLE_KEY="$value" ;;
  esac
done <<<"$status_env"

export SUPABASE_URL="${SUPABASE_URL:?Local Supabase API URL was not reported}"
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:?Local Supabase anon key was not reported}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Local Supabase service role key was not reported}"

exec "$@"
