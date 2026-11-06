#!/usr/bin/env bash
# macOS: bash scripts/setup.sh --storage sqlite.
set -euo pipefail
LOOM_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$LOOM_ROOT/.loom/toolchain/bin:$HOME/.bun/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
LOOM_BUN="$(command -v bun || true)"
if [ -z "$LOOM_BUN" ] || [ "$("$LOOM_BUN" --version)" != '1.4.0' ]; then
  # Instalar una copia privada fijada, sin actualizar el Bun global ni editar perfiles.
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64) LOOM_BUILD=darwin-aarch64 ;;
    Darwin-x86_64) LOOM_BUILD=darwin-x64 ;;
    Linux-aarch64) LOOM_BUILD=linux-aarch64 ;;
    Linux-x86_64) LOOM_BUILD=linux-x64 ;;
    *) echo 'Sistema no soportado por este script. Consulta INSTALLATION.es.md.' >&2; exit 1 ;;
  esac
  command -v curl >/dev/null || { echo 'Falta curl.' >&2; exit 1; }
  command -v unzip >/dev/null || { echo 'Falta unzip.' >&2; exit 1; }
  mkdir -p "$LOOM_ROOT/.loom/toolchain/bin"
  LOOM_TMP="$(mktemp -d)"
  trap 'rm -rf -- "$LOOM_TMP"' EXIT
  echo 'Instalando Bun 1.4.0 en .loom/toolchain (descarga oficial de oven-sh/bun)…'
  curl --fail --location --show-error --silent "https://github.com/oven-sh/bun/releases/download/bun-v1.4.0/bun-$LOOM_BUILD.zip" -o "$LOOM_TMP/bun.zip"
  unzip -q "$LOOM_TMP/bun.zip" -d "$LOOM_TMP"
  cp "$LOOM_TMP/bun-$LOOM_BUILD/bun" "$LOOM_ROOT/.loom/toolchain/bin/bun"
  chmod 755 "$LOOM_ROOT/.loom/toolchain/bin/bun"
  LOOM_BUN="$LOOM_ROOT/.loom/toolchain/bin/bun"
fi
cd -- "$LOOM_ROOT"
"$LOOM_BUN" tools/classroom.ts setup "$@"
