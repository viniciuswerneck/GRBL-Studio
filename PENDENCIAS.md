# GRBL Studio — Lista Única de Pendências (Prioridade Decrescente)

> **Base:** Análise completa do código, docs (`PRODUCT_SPEC.md`, `PLANO_DE_ACAO.md`, `ARCHITECTURE.md`, `DESIGN.md`, `BENCHMARK.md`) e estado atual (v0.22.0).
> **Premissa:** Tudo que está ✅ nos docs é considerado **entregue**. Esta lista cobre apenas o que **falta**.
> **Ordenação:** P0 (bloqueadores v1.0) → P1 (qualidade v1.0.x) → P2 (polish) → P3 (extensibilidade) → P4 (visão) → P5 (arquitetura long-term).

---

## 📊 Tabela Única — Todas as Pendências por Prioridade

| Prioridade | ID | Item | Esforço | Critério de Aceite / Valor | Target |
|------------|-----|------|---------|----------------------------|--------|
| **P0** (Bloqueador v1.0) | **P0-1** | **Migrar Renderer → Svelte 5 + electron-vite** | Alto (3-4 sem) | Vanilla JS (~4k linhas) substituído tela a tela; build unificado; HMR; zero lógica de negócio no renderer; componentes reativos; testes componente (Vitest + @testing-library/svelte) | v1.0.0 |
| **P0** | **P0-2** | **Flatpak funcional + publicado no Flathub** | Médio (1 sem) | `flatpak-builder` roda Ubuntu/Fedora/Arch; acesso `/dev/ttyUSB*` `/dev/ttyACM*` via udev/device=all; publicado no Flathub (CI automatizado) | v1.0.0 |
| **P0** | **P0-3** | **Fechar Checklist Visual `DESIGN.md §8` (5 itens 👁)** | Baixo (3-5 dias) | Validado visualmente: (1) Parece app Win11; (2) Alto contraste AAA + foco; (3) 55 fps job; (4) DRO 0.001mm estável; (5) Escala 125%/150% sem blur — screenshots documentados | v1.0.0 |
| **P0** | **P0-4** | **Automação Release GitHub Actions completa** | Baixo (2-3 dias) | ✅ **CONCLUÍDO** — `.github/workflows/release.yml`: build+lint+typecheck+test+e2e → AppImage+deb+changelog auto (benchmark informativo; Flatpak manual) | v1.0.0 |
| **P0** | **P0-5** | **Guia Primeiros Passos (`docs/GETTING_STARTED.md`)** | Baixo (2 dias) | ✅ **CONCLUÍDO** — 11 seções completas (instalação, dialout, onboarding, conectar, carregar, preview, gravar, troubleshooting, FAQ, links) | v1.0.0 |
| **P1** (Qualidade v1.0.x) | **P1-1** | **Testes E2E Playwright: Fluxos Críticos Completos** | Médio (1-2 sem) | Cobertura: conectar → G-code → play/pause/resume/stop; alarme → unlock → home; retomar N linhas; overrides; queue; produção; imagem→gerar→gravar | v1.0.x |
| **P1** | **P1-2** | **Benchmark Automatizado no CI (Performance Gate)** | Médio (1 sem) | ✅ **CONCLUÍDO (base)** — `vitest.bench.config.ts` + `scripts/check-bench.mjs` + workflow `release.yml` integra bench thresholds | v1.0.x |
| **P1** | **P1-3** | **Checklist Hardware Real Automatizado por Release** | Baixo (contínuo) | ✅ **CONCLUÍDO** — `scripts/hardware-checklist.mjs` (CLI 10 testes) + `.github/workflows/hardware-check.yml` (manual + weekly) | v1.0.x |
| **P1** | **P1-4** | **Auditoria Acessibilidade Completa (axe-core + manual)** | Baixo (1 sem) | ✅ **CONCLUÍDO (base)** — `src/renderer/test/a11y.setup.ts` (axe-core WCAG 2.1 AA) + `test:a11y` script | v1.0.x |
| **P1** | **P1-5** | **Unificar Build: 30+ scripts `build:*` → electron-vite** | Médio (1 sem) | ✅ **CONCLUÍDO (base)** — `electron.vite.config.ts` + `package.json` scripts unificados + `vite.config.ts` renderer | v1.1 |
| **P2** (Polish/UX) | **P2-1** | **Onboarding Interativo (RF-ONB-1 Completo)** | Médio (1-2 sem) | Tour 5 passos c/ highlights (driver.js): conectar+perfil → abrir → preview → posicionar → gravar; reabrível Ajuda; "Não mostrar" persiste; i18n | v1.1 |
| **P2** | **P2-2** | **Smart Connect Aprimorado (Fuzzy Match + Export .grblprofile)** | Baixo (3-5 dias) | Sugere por curso ±1mm + `$30` + homing; "Exportar perfil" → `.grblprofile` JSON; import drag-drop | v1.1 |
| **P2** | **P2-3** | **Toast/Snackbar Fluent (Substituir alerts)** | Baixo (3-5 dias) | Sistema não-bloqueante (canto inf. dir.): sucesso/aviso/erro/info; auto-dismiss 3-5s; ação opcional; `prefers-reduced-motion` | v1.1 |
| **P2** | **P2-4** | **Atalhos: Cheatsheet + Customização** | Baixo (1 sem) | Ajuda → Atalhos (tabela pesquisável); editor em Preferências (`prefs.keybindings`); detecção conflitos | v1.1 |
| **P2** | **P2-5** | **Splash Screen: Animação Entrada Suave** | Trivial (1 dia) | Fade-in 300ms + slide up 20px; logo pulse sutil; some no `ready-to-show`; `prefers-reduced-motion` | v1.0.x |
| **P3** (Extensibilidade v1.1–v1.3) | **P3-1** | **Sistema de Plugins (JS Dinâmico)** | Médio | Comunidade estende: geradores símbolo, pós-processadores, macros, importadores | v1.2 |
| **P3** | **P3-2** | **Sync Presets/Perfis/Jobs (Opt-in, Zero-Knowledge)** | Médio | Múltiplos PCs; receitas/perfis criptografados client-side; storage genérico (WebDAV/S3/Nextcloud) | v1.2 |
| **P3** | **P3-3** | **Marketplace Perfis Máquina (Comunitário)** | Baixo (infra) | 30 → 100+ perfis; usuários contribuem; validação auto via CI | v1.2 |
| **P3** | **P3-4** | **Multi-Machine / Job Distribuído** | Alto | 2-3 lasers; fila única + dispatch auto; pequenos negócios | v1.3 |
| **P4** (Visão Computacional v1.5+) | **P4-1** | **Alinhamento por Fiduciais (Câmera + OpenCV.js)** | Alto | Posicionamento preciso sem jog; preview real peça na mesa | v1.5 |
| **P4** | **P4-2** | **Monitoramento Job (Timelapse + Detecção Falha)** | Alto | Câmera detecta chama, fumaça excessiva, peça deslocada → para job auto | v1.5 |
| **P4** | **P4-3** | **Calibração Auto Foco (Câmera + Análise Nitidez)** | Médio | Substitui teste foco manual; foco ótimo em 1 clique | v1.5 |
| **P5** (Arquitetura Long-term) | **P5-1** | **PoC Tauri v2 (Rust + WebView)** | 2-3 sem (spike) | Medir: RAM, startup, bundle size, DX serialport-rs; decidir migração pós-v1.0 | Pós-v1.0 |
| **P5** | **P5-2** | **Suporte Oficial Windows/macOS (Se Tauri)** | Pós-migração | Electron já roda; Tauri nativo; remover `#ifdef LINUX` | Pós-Tauri |

---

## 📅 Cronograma Sugerido (8 Semanas → v1.0.0)

| Semana | Foco | Entregáveis-Chave |
|--------|------|-------------------|
| **1–2** | **Fundação Svelte** | `electron-vite` + Svelte 5 + TS; aliases `@shared`/`@main`/`@preload`; `ThemeProvider`/`I18nProvider`; Nav Rail + roteamento |
| **3–4** | **Telas Core** | Conexão, Jog, Console (virtual scroll), Status/DRO (≤200ms) |
| **5–6** | **Execução + Preview** | Arquivo/Execução (barra flutuante), Preview 2D (layers cache + crosshair), Overrides (sliders + badges) |
| **7** | **Config + Imagem + Desenhar** | Tabela `$$` + ajuda + perfis; Pipeline imagem completo; Prancheta mm + formas/texto/booleanas/offset/camadas/DXF/PDF |
| **8** | **Integração + Release** | IPC tipado ponta-a-ponta; suite completa (lint+typecheck+test+e2e+bench); Checklist Visual ✅; Flatpak build/test; Tag `v1.0.0` |

---

## 🔄 Regras de Gestão

1. **Fonte da verdade** = este arquivo (`PENDENCIAS.md`); `PLANO_DE_ACAO.md` → histórico
2. **1 Issue GitHub por P0/P1** — labels: `priority:P0\|P1`, `area:renderer\|flatpak\|a11y\|build\|docs\|e2e\|bench`
3. **PRs pequenos** — 1 tela/componente por PR; **DoD** = lint + typecheck + test + bench (se toca perf)
4. **Revisão semanal** (segundas) — mover itens, ajustar prioridades, fechar concluídos
5. **Definição de v1.0.0** = **P0 todos ✅ + P1-1 ✅ + P1-2 ✅** — demais P1/P2 entram em v1.0.x / v1.1

---

## 📌 Princípios Não-Negociáveis

- ❌ **Não refatore vanilla JS** — migre para Svelte; código velho será deletado
- ✅ **`shared/*` intocado** — ativo mais valioso (puro, testado, documentado)
- ⚡ **Performance é feature** — PR que toca renderer/preview passa no `bench:preview`
- 🔧 **Hardware real inegociável** — P1-3 roda antes de *qualquer* release (incl. patch)
- 📝 **Docs no código** — JSDoc em `shared/*`, README em `src/renderer/*`, `CHANGELOG.md` no PR

---

> **Ação imediata:** Abrir 3 issues P0 restantes no GitHub (P0-1, P0-2, P0-3), atribuir donos, iniciar **Semana 1** da migração Svelte.

---

## 📚 Documentação de Apoio

- **Guia de Migração Svelte 5:** `docs/SVELTE_MIGRATION_GUIDE.md` — plano detalhado 8 semanas, componentes prontos, bloqueadores, checklist qualidade
- **Checklist Visual:** `docs/DESIGN.md §8` — 12 itens (7 ✅ código, 5 👁 olho humano)
- **Arquitetura IPC:** `docs/ARCHITECTURE.md` — stores, providers, componentes base