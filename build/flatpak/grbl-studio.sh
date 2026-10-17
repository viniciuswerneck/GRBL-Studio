#!/bin/sh
# Lançador do GRBL Studio dentro do Flatpak.
#
# O AppImage é extraído no build; o `AppRun`/binário fica em
# /app/grbl-studio/squashfs-root. `zypak-wrapper` vem do
# org.electronjs.Electron2.BaseApp e é necessário para o sandbox do Electron.
set -e

export TMPDIR="${XDG_RUNTIME_DIR}/app/${FLATPAK_ID}"
mkdir -p "$TMPDIR"

exec zypak-wrapper /app/grbl-studio/squashfs-root/grbl-studio "$@"
