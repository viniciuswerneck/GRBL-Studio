#!/bin/sh
# Lançador do GRBL Studio dentro do Flatpak.
#
# O AppImage é extraído no build; o binário fica em
# /app/grbl-studio/squashfs-root. `zypak-wrapper` vem do
# org.electronjs.Electron2.BaseApp e é necessário para o sandbox do Electron.
set -e

export TMPDIR="${XDG_RUNTIME_DIR}/app/${FLATPAK_ID}"
mkdir -p "$TMPDIR"

# Configurações para Electron no Flatpak
export ELECTRON_OZONE_PLATFORM_HINT=auto
export ELECTRON_DISABLE_SANDBOX=1

APP_DIR="/app/grbl-studio/squashfs-root"
if [ ! -x "$APP_DIR/grbl-studio" ]; then
  echo "ERRO: Binário não encontrado em $APP_DIR/grbl-studio" >&2
  exit 1
fi

# zypak-wrapper gerencia o sandbox do Electron corretamente
exec zypak-wrapper "$APP_DIR/grbl-studio" "$@"