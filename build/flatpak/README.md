# Flatpak — GRBL Studio (RF-APP-4, "Could")

Empacotamento **Flatpak** via `flatpak-builder`. É um *extra* (nível *Could* no
plano): AppImage/deb já são as distribuições principais (ADR-9).

## Pré-requisitos

```bash
sudo apt install flatpak flatpak-builder
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install flathub org.freedesktop.Platform//24.08 org.freedesktop.Sdk//24.08 \
  org.electronjs.Electron2.BaseApp//24.08
```

## Uso

1. Gere o artefato base (o manifesto reempacota o AppImage produzido pelo
   `electron-builder`):

   ```bash
   npm run package:linux
   ```

2. Copie/renomeie o AppImage esperado pelo manifesto:

   ```bash
   cp "release/GRBL Studio-"*.AppImage release/GRBL-Studio.AppImage
   ```

3. Construa e instale:

   ```bash
   flatpak-builder --user --install --force-clean build-dir build/flatpak/com.grblstudio.app.yml
   flatpak run com.grblstudio.app
   ```

## Notas

- O `finish-args` já concede acesso a dispositivos (`--device=all`) para
  `/dev/ttyUSB*` e `/dev/ttyACM*` e rede (`--share=network`) para o transporte
  WiFi/TCP (RF-CON-7).
- O Electron em Flatpak depende do `zypak` do `org.electronjs.Electron2.BaseApp`;
  por isso o lançador usa `zypak-wrapper`.
- Este manifesto **não** é construído no CI (exige `flatpak-builder` e os
  runtimes). Trate-o como ponto de partida para publicar no Flathub.
