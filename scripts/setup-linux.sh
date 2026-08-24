#!/usr/bin/env bash

set -euo pipefail

# Supabase requires a running Docker-compatible runtime. Accept any compatible
# runtime and only bootstrap Docker when this Linux environment exposes the
# capabilities used by our cloud sandbox (dnf and passwordless sudo).
if docker info >/dev/null 2>&1; then
  exit 0
fi

if ! command -v dnf >/dev/null 2>&1 || ! sudo -n true >/dev/null 2>&1; then
  echo "A running Docker-compatible runtime is required." >&2
  echo "Automatic setup requires dnf and passwordless sudo." >&2
  exit 1
fi

sudo -n dnf install -y docker

# Respect a configured Docker service when systemd is running.
if systemctl show-environment >/dev/null 2>&1; then
  sudo -n systemctl start docker
  if docker info >/dev/null 2>&1; then
    exit 0
  fi

  echo "Docker started, but the current user cannot access it." >&2
  exit 1
fi

docker_log="/tmp/jep-dockerd.log"
sudo -n nohup dockerd \
  --group "$(id -gn)" \
  --storage-driver vfs \
  >"$docker_log" 2>&1 &

for _ in {1..30}; do
  if docker info >/dev/null 2>&1; then
    exit 0
  fi
  sleep 1
done

echo "Docker failed to start; see $docker_log." >&2
exit 1
