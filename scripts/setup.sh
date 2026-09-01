#!/usr/bin/env bash

set -euo pipefail

corepack pnpm install --frozen-lockfile
corepack pnpm exec playwright install chromium

if [[ "$(uname -s)" == "Linux" ]]; then
  ./scripts/setup-linux.sh
fi
