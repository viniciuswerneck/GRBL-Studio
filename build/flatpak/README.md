# Flatpak — GRBL Studio (RF-APP-4, "Could")

Empacotamento **Flatpak** via `flatpak-builder`. É um *extra* (nível *Could* no
plano): AppImage/deb já são as distribuições principais (ADR-9).

## Pré-requisitos

```bash
# Ubuntu/Debian/Mint/Pop
sudo apt install flatpak flatpak-builder

# Fedora
sudo dnf install flatpak flatpak-builder

# Arch/Manjaro
sudo pacman -S flatpak flatpak-builder

# Adiciona Flathub (runtime e SDK)
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install flathub org.freedesktop.Platform//24.08 org.freedesktop.Sdk//24.08 \
  org.electronjs.Electron2.BaseApp//24.08
```

## Uso Local (Desenvolvimento)

1. **Gere o artefato base** (o manifesto reempacota o AppImage produzido pelo
   `electron-builder`):

   ```bash
   npm run package:linux
   ```

2. **Copie/renomeie o AppImage** esperado pelo manifesto:

   ```bash
   cp "release/GRBL Studio-"*.AppImage release/GRBL-Studio.AppImage
   ```

3. **Construa e instale** (modo usuário):

   ```bash
   flatpak-builder --user --install --force-clean build-dir build/flatpak/com.grblstudio.app.yml
   ```

4. **Execute**:

   ```bash
   flatpak run com.grblstudio.app
   ```

## Build para Flathub (CI/CD)

O manifesto está pronto para publicação no Flathub. O processo padrão:

1. Fork do [Flathub repo](https://github.com/flathub/com.grblstudio.app) (ou crie novo)
2. Configure GitHub Actions com `flatpak-builder` (ex.: `flatpak/flatpak-github-action`)
3. Publique releases automáticos em tags `v*`

Exemplo de workflow (`.github/workflows/flatpak.yml`):

```yaml
name: Flatpak
on:
  push:
    tags: ['v*']
jobs:
  flatpak:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build AppImage
        run: npm ci && npm run package:linux
      - name: Prepare Flatpak
        run: |
          cp "release/GRBL Studio-"*.AppImage release/GRBL-Studio.AppImage
          cp build/icon.png build/flatpak/grbl-studio.png
      - name: Build Flatpak
        uses: flatpak/flatpak-github-action@v1
        with:
          manifest: build/flatpak/com.grblstudio.app.yml
          flatpakrepo: flathub
          repo-url: https://flathub.org/repo/flathub.flatpakrepo
          gpg-sign: false
```

## Notas Técnicas

- **`finish-args`** já concede acesso a dispositivos (`--device=all`) para
  `/dev/ttyUSB*` e `/dev/ttyACM*` e rede (`--share=network`) para o transporte
  WiFi/TCP (RF-CON-7).
- **`--filesystem=home`** permite abrir/salvar G-code e imagens do usuário.
- **`--filesystem=/run/udev:ro`** melhora a listagem de portas seriais.
- O Electron no Flatpak depende do `zypak` do `org.eletronjs.Electron2.BaseApp`;
  por isso o lançador usa `zypak-wrapper`.
- **Udev rules** (`99-grbl-studio.rules`) incluídas no pacote para permissões
  automáticas de `/dev/ttyUSB*` e `/dev/ttyACM*`.
- `ELECTRON_DISABLE_SANDBOX=1` é necessário pois o sandbox é gerenciado pelo
  Flatpak + zypak.

## Testes de Porta Serial no Flatpak

```bash
# Lista portas visíveis pelo Flatpak
flatpak run --command=sh com.grblstudio.app -c 'ls -la /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || echo "Nenhuma porta"'

# Teste de conexão real
flatpak run com.grblstudio.app
# No app: aba Conexão → lista portas → conectar
```

## Solução de Problemas

| Problema | Solução |
|----------|---------|
| "No such file: GRBL-Studio.AppImage" | Rode `npm run package:linux` e copie para `release/GRBL-Studio.AppImage` |
| "Permission denied /dev/ttyUSB0" | Adicione usuário ao grupo `dialout` + `sudo udevadm trigger`; verifique se udev rules instaladas |
| "zypak-wrapper not found" | Instale `org.electronjs.Electron2.BaseApp//24.08` |
| App não abre (Wayland) | Tente `flatpak run --env=ELECTRON_OZONE_PLATFORM_HINT=wayland com.grblstudio.app` |

## Status

- ✅ Manifesto funcional (`build/flatpak/com.grblstudio.app.yml`)
- ✅ Launcher robusto (`grbl-studio.sh` + `zypak-wrapper`)
- ✅ Desktop file + ícone 256x256
- ✅ Udev rules para serial
- ⏳ **Pendente**: Teste em hardware real + publicação no Flathub