# GRBL Studio — Acompanhamento de melhorias (Hermes Agent)

> Este arquivo é mantido pelo Hermes Agent para marcar o que foi feito nas fases de melhoria do produto. Não é parte do release.

## Fases definidas (ordem de execução)

| Fase | Foco | Status |
| :--- | :--- | :--- |
| 1 | Documentação e guias do usuário | ✅ concluída (GETTING_STARTED.md já completo) |
| 2 | Qualidade e CI (checklist visual DESIGN §8, a11y gate, benchmark thresholds) | ⏳ em andamento |
| 3 | Distribuição pública (Flatpak/Flathub, winget/brew/AUR, code signing, validação Win/macOS) | ⏳ pendente |
| 4 | Migração renderer TS/Svelte 5 | 🟡 em andamento. 13 componentes Svelte 5 criados (AboutModal, ConnectionBadge, JobProgress, JogControls, PortList, JogView, FileView, PreviewView, ConfigView, ImageView, StatusBar, MachineStatus, Console) + App.svelte com 7 views (connection, jog, file, preview, config, image, design). A UI de produção ainda é o vanilla (`public/index.html` + `public/renderer.js`); o app Svelte compila como scaffold. `npm run build` ✅, `npm run typecheck` ✅, `npm test` ✅ (1021 testes). |
| 5 | Projetos grandes (câmera, rotativa, API/CLI/plugins, i18n fr/de) | ⏳ pendente (congelado por hardware / pós-1.0) |

## Fase 2 — Qualidade e CI (em andamento)

Itens do checklist DESIGN.md §8:
- [x] ✅ Os 11 temas trocam sem flash e persistem (código/E2E)
- [x] ✅ Rodapé + modal Sobre exibem versão real (`app.getVersion()`)
- [x] ✅ RAM ≤ 280 MB X11 / 300 MB Wayland; CPU ociosa ~0% (bench.mjs)
- [x] ✅ `prefers-reduced-motion` desliga animações não essenciais
- [x] ✅ Componentes com estados Normal/Hover/Pressed/Focused/Disabled; alvos ≥ 32 px
- [ ] 👁 Parece um app Windows 11 ao lado de um (revisão visual humana)
- [ ] 👁 Temas alto contraste mantêm foco visível e contraste AAA (medição visual)
- [ ] 👁 Nenhuma animação abaixo de 55 fps com job rodando (medição de tela)
- [ ] 👁 DRO estável em 0,001 mm sem piscar (leitura de tela)
- [ ] 👁 Escala 125%/150% sem texto/ícone borrado (medida de tela)

CI (`.github/workflows/ci.yml`): ✅ quality (lint, typecheck, testes, cobertura, build), e2e (Playwright+Electron), smoke (headless) — todos em push/PR.

Próximo passo da Fase 2: nada a automatizar nos itens 👁 (requerem olho humano). Fase 2 considerada ⏳ até revisão humana.

## Fase 3 — Distribuição pública (pendente)

- Flatpak manifesto: ✅ pronto (`build/flatpak/com.grblstudio.app.yml`), não publicado no Flathub (requer conta Flathub — pendente do usuário)
- winget / brew tap / AUR: ❌ não iniciado (requer contas externas)
- Code signing (Win/macOS): ❌ não iniciado (requer certificados)
- Validação Win/macOS em hardware real: ❌ não iniciado (requer máquinas)

Próximo passo da Fase 3: aguardar decisão do usuário sobre contas externas (Flathub, winget, code signing).

## Fase 4 — Migração renderer TS/Svelte 5 (pendente)

- v0.23.0 já iniciou: `electron.vite.config.ts`, Svelte 5 base, providers reativos, store centralizado, componentes base Fluent, tela Conexão completa
- ⏳ Pendente: concluir o cutover para o renderer Svelte (montar `main.ts` no `index.html`, plugin Svelte no `electron.vite.config.ts`, paridade das telas) e só então remover `public/renderer.js`

## Fase 5 — Projetos grandes (pendente, congelado por hardware)

- Câmera (P3.1), Rotativa (P3.2): congelados por hardware
- Preview WebGL (P3.4), API/CLI/plugins (P4.1), i18n fr/de (P4.2): pós-1.0
