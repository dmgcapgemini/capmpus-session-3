#!/usr/bin/env bash
# Un terminal para API y web; Ctrl+C detiene solo sus procesos.
set -euo pipefail
LOOM_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$LOOM_ROOT/.loom/toolchain/bin:$HOME/.bun/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
command -v bun >/dev/null || { echo 'Ejecuta primero bash scripts/setup.sh.' >&2; exit 1; }
cd -- "$LOOM_ROOT"
exec bun tools/classroom.ts start "$@"
