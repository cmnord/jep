#!/usr/bin/env bash

set -euo pipefail

# The app's required local keys come from `supabase status`, so they do not
# exist until the stack is running. Only load the optional auth-provider values
# that Supabase needs while bootstrapping the stack.
exec npm exec -- varlock run --filter "SUPABASE_AUTH_*" -- \
  npx supabase start \
  -x storage-api,imgproxy,edge-runtime,logflare,supavisor,vector
