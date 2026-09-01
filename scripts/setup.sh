#!/usr/bin/env bash

set -euo pipefail

corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install chromium

if [[ "$(uname -s)" == "Linux" ]]; then
  ./scripts/setup-linux.sh
fi
