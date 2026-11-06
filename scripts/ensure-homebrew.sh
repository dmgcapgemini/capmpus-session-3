#!/usr/bin/env bash
# Invocado por setup cuando falta una herramienta que se instala con Homebrew.
set -euo pipefail

if [ "$(uname -s)" != 'Darwin' ]; then
  echo 'Esta preparacion de Homebrew es solo para macOS.' >&2
  exit 1
fi

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if command -v brew >/dev/null 2>&1; then
  exit 0
fi

command -v curl >/dev/null 2>&1 || { echo 'Falta curl. Consulta INSTALLATION.es.md.' >&2; exit 1; }
LOOM_BREW_INSTALLER="$(mktemp "${TMPDIR:-/tmp}/loom-homebrew.XXXXXX")"
trap 'rm -f -- "$LOOM_BREW_INSTALLER"' EXIT
echo 'Instalando Homebrew desde su instalador oficial. Puede pedir permisos de administrador y herramientas de Apple...'
if ! curl --fail --location --show-error --silent 'https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh' -o "$LOOM_BREW_INSTALLER"; then
  echo 'No se pudo descargar Homebrew. Comprueba la red o usa el canal corporativo y repite setup.' >&2
  exit 1
fi
if ! /bin/bash "$LOOM_BREW_INSTALLER"; then
  echo 'No se pudo completar Homebrew. Revisa los permisos y los mensajes del instalador; despues repite setup.' >&2
  exit 1
fi
if ! command -v brew >/dev/null 2>&1; then
  echo 'Homebrew no aparece en PATH. Consulta INSTALLATION.es.md y repite setup desde un terminal nuevo.' >&2
  exit 1
fi
echo 'Homebrew preparado. Continuando con setup...'
