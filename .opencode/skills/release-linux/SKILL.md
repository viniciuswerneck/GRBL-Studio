---
name: Release Linux
description: Empacotar, versionar e publicar o GRBL Studio para Linux (AppImage, deb, Flatpak), incluindo changelog e permissões de porta serial.
---

# Skill: Release para Linux

Use esta skill ao preparar uma versão, empacotar o app ou publicar um release.

## Fonte da verdade

- `../../../docs/PLANO_DE_ACAO.md` — Fase 7 (empacotamento, i18n, polish) e §9
  (release e versionamento).
- `../../../docs/PRODUCT_SPEC.md` — RF-APP-4 (AppImage/deb/Flatpak) e RF-APP-5
  (permissões de porta serial).

## Versionamento

- **SemVer** (`MAJOR.MINOR.PATCH`): Alpha (Fase 2) → Beta (Fase 5) → `1.0.0` (Fase 7).
- Atualize `package.json` **e** `CHANGELOG.md` na mesma mudança.
- Tags no formato `vX.Y.Z`.

## Empacotamento (ADR-9)

- Ferramenta: **`electron-builder`**.
- Alvos mínimos: **AppImage** e **deb**; Flatpak é `Could` (pós-1.0).
- `asar` ligado; **não** empacote `dist/` desatualizado — rode o build antes.
- Não inclua segredos, `.bak` nem artefatos de teste no pacote.

```bash
npm run build          # compila TS e copia o preload
npx electron-builder --linux AppImage deb
```

## Permissões de porta serial (Linux)

Documente e detecte no app:

- Usuário precisa pertencer ao grupo `dialout` (Debian/Ubuntu) ou `uucp` (Arch):
  `sudo usermod -aG dialout "$USER"` e relogar.
- Portas: `/dev/ttyUSB*` (CH340/CP210x) e `/dev/ttyACM*` (CDC-ACM).
- Se necessário, regra `udev` para acesso consistente.
- Se a porta não abrir, exiba mensagem **com a causa e a solução**, não só o erro.

## Release

1. Garanta: testes verdes, `tsc` limpo, checklist visual de `DESIGN.md` §8 aprovado.
2. Atualize versão + `CHANGELOG.md`.
3. Gere os artefatos e **teste o `.AppImage` em máquina limpa** (Ubuntu e Fedora;
   X11 e Wayland).
4. Publique no GitHub Releases com notas de versão e requisitos (grupo `dialout`).
5. Verifique startup ≤ 1,5 s e RAM ≤ 200 MB no pacote final.

## Checklist de conclusão

- [ ] Versão e `CHANGELOG.md` atualizados.
- [ ] `.AppImage` roda sem instalação em Ubuntu e Fedora (X11 + Wayland).
- [ ] Guia de permissão de serial incluído/atualizado.
- [ ] Sem segredos/artefatos indevidos no pacote.
- [ ] Orçamentos de performance conferidos no build empacotado.
