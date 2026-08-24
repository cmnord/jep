#!/usr/bin/env bash

set -euo pipefail

npm ci
npx playwright install chromium

if [[ "$(uname -s)" == "Linux" ]]; then
  ./scripts/setup-linux.sh
fi
