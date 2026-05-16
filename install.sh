#!/usr/bin/env bash
# Thin wrapper around install.mjs for *nix shells.
# Requires Node 18+. Passes all args through.
set -euo pipefail
dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if ! command -v node >/dev/null 2>&1; then
  echo "[forge] node 18+ is required (https://nodejs.org)" >&2
  exit 1
fi
exec node "$dir/install.mjs" "$@"
