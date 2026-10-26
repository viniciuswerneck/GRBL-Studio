# Guia de Migração para Svelte 5 (Runes) — GRBL Studio

> **Status:** Planejamento — build atual usa vanilla JS funcional (`public/renderer.js` ~4k linhas).
> **Objetivo:** Migração incremental tela a tela para Svelte 5 + runes + electron-vite.

---

## 🎯 Por que Svelte 5?

| Problema Atual | Solução Svelte 5 |
|----------------|------------------|
| 4k linhas vanilla JS em `public/renderer.js` | Componentes reativos, tipados, testáveis |
| Estado global espalhado (`window.grbl`, `localStorage`) | Stores reativos (`$state`, `$derived`, `$effect`) |
| Difícil testar UI | `@testing-library/svelte` + Vitest |
| Build frágil (30+ scripts `build:*`) | `electron-vite` unificado + HMR |
| Sem reatividade granular | Runes (`$state`, `$derived`, `$effect`) |

---

## 📦 Fundação Já Preparada

| Arquivo | Descrição |
|---------|-----------|
| `electron.vite.config.ts` | Config unificada (main, preload, renderer) |
| `src/renderer/vite.config.ts` | Config renderer com `@sveltejs/vite-plugin-svelte` (runes) |
| `src/renderer/src/theme-boot.ts` | Tema antes do primeiro paint (sem flash) |
| `src/renderer/src/lib/providers/ThemeProvider.svelte` | 11 temas Fluent/Win11 reativos |
| `src/renderer/src/lib/providers/I18nProvider.svelte` | pt-BR/en/es reativo |
| `src/renderer/src/lib/stores/connection.ts` | Store centralizado (runes) para IPC |
| `src/renderer/src/lib/components/*.svelte` | Button, Select, Card, Badge, Spinner, NavRail, AppShell, ConnectionScreen |

---

## 🚧 Bloqueador Atual: Import Analysis do Vite

**Problema:** Vite's import analysis roda **antes** de qualquer plugin e falha ao parsear `$state` (não é JS válido).

**Soluções tentadas:**
1. Plugin `enforce: 'pre'` com transform — falha (analysis roda antes)
2. Virtual module plugin — falha (analysis ignora `load` hook)
3. Preprocess para tornar runes válidos — complexo

**Caminhos futuros:**
- Aguardar suporte nativo no Vite 6+ / Rollup 4+
- Usar `vite-plugin-svelte` com `preprocess` customizado
- Migrar para Vite 6 + `@sveltejs/vite-plugin-svelte` v5+ (quando estável)
- Usar Svelte 4 syntax (`$:`, `let`) durante migração e habilitar runes depois

---

## 📋 Plano de Migração (8 Semanas)

### Semana 1-2: Fundação + Conexão
- [ ] Validar build Svelte funcional (resolver import analysis)
- [ ] `ThemeProvider` + `I18nProvider` integrados
- [ ] `NavRail` + `AppShell` + roteamento simples
- [ ] **Tela Conexão** (porta, baud, perfil, conectar/desconectar, badge estado)
- [ ] Testes: `npm run test:a11y` na tela conexão

### Semana 3-4: Jog + Console + Status
- [ ] **Tela Jog** (cruz X/Y/Z, passo, velocidade, contínuo, home, origem, zero, unlock, reset)
- [ ] **Console** (virtual scrolling, cores, pause/clear/save, histórico ↑/↓)
- [ ] **Status/DRO** (badge estado, MPos/WPos/DTG, FS, Ov, Pn, Bf — ≤200ms)
- [ ] Integração IPC `window.grbl` via stores reativos

### Semana 5-6: Arquivo/Execução + Preview + Overrides
- [ ] **Arquivo/Execução** (abrir G-code, info, play/pause/resume/stop, barra flutuante, ETA)
- [ ] **Preview 2D** (canvas + layers cache estático + progresso incremental, zoom/pan, crosshair)
- [ ] **Overrides** (sliders feed/spindle/rapid, badges valor ativo, reset 100%)

### Semana 7: Config + Imagem + Desenhar
- [ ] **Config** (tabela `$$` editável, ajuda contextual, `$#`/`$I`/`$G`, perfis)
- [ ] **Imagem** (pipeline completo: abrir → ajustes → algoritmo → parâmetros → gerar → preview → posicionar → gravar)
- [ ] **Desenhar** (prancheta mm, formas, texto, booleanas, offset, camadas, DXF/PDF import)

### Semana 8: Integração + Release v1.0.0
- [ ] Integração ponta-a-ponta main ↔ preload ↔ renderer
- [ ] Suite completa: `lint` + `typecheck` + `test` + `test:e2e` + `bench`
- [ ] Checklist visual `DESIGN.md §8` ✅
- [ ] Flatpak build + teste local + publish Flathub
- [ ] Tag `v1.0.0` → Release GitHub Actions automatizado

---

## 🔧 Componentes Prontos (Referência)

### Stores
```typescript
// src/renderer/src/lib/stores/connection.ts
// Store centralizado com runes para todo estado de conexão, job, console, overrides
```

### Providers
```svelte
<!-- src/renderer/src/lib/providers/ThemeProvider.svelte -->
<!-- 11 temas Fluent, localStorage, prefers-color-scheme, prefers-reduced-motion -->

<!-- src/renderer/src/lib/providers/I18nProvider.svelte -->
<!-- pt-BR/en/es, localStorage, detecção navigator.language -->
```

### Componentes Base (Fluent/Win11)
```svelte
<!-- Button: variant (primary/secondary/outline/ghost/danger), size, loading, fullWidth -->
<!-- Select: label, options, error, placeholder, aria -->
<!-- Card: variant (default/elevated/outlined/filled), padding, interactive -->
<!-- Badge: variant (success/warning/danger/info/neutral), dot, pulse -->
<!-- Spinner: size, label (a11y) -->
```

### Layout
```svelte
<!-- NavRail: 7 itens (Conexão, Jog, Arquivo, Preview, Config, Imagem, Desenhar) -->
<!-- AppShell: header, sidebar, main, footer (WerneckLab) -->
```

### Tela Conexão (Completa)
```svelte
<!-- ConnectionScreen.svelte -->
<!-- Porta, baud, perfil máquina (30+), conectar/desconectar, badge estado animado -->
<!-- Status grid: firmware, estado GRBL, MPos, WPos (font-mono, 3 decimais) -->
```

---

## ✅ Checklist de Qualidade por Tela

| Critério | Ferramenta |
|----------|------------|
| TypeScript strict | `tsc --noEmit` |
| Lint/Format | `npm run lint` (Biome) |
| Testes unidade | `npm run test` (Vitest) |
| Testes a11y | `npm run test:a11y` (axe-core + @testing-library/svelte) |
| Testes E2E | `npm run test:e2e` (Playwright) |
| Benchmark | `npm run bench` (startup ≤1.8s, PSS X11≤300MB, IPC p95≤20ms) |
| Visual | Checklist `DESIGN.md §8` (125%/150% DPI, alto contraste AAA, 55fps) |

---

## 📚 Recursos

- [Svelte 5 Runes Docs](https://svelte.dev/docs/runes)
- [electron-vite Guide](https://electron-vite.org/guide/)
- [@sveltejs/vite-plugin-svelte](https://github.com/sveltejs/vite-plugin-svelte)
- [Fluent Design Tokens](https://github.com/microsoft/fluentui/tree/master/packages/tokens)
- `docs/DESIGN.md` — Tokens, orçamentos, checklist visual
- `docs/ARCHITECTURE.md` — IPC, stores, separação main/preload/renderer

---

## 🚀 Próximo Passo Imediato

1. **Resolver import analysis** — testar Vite 6 + plugin Svelte 5 estável
2. **Validar build Svelte** — `npm run build` sem erros
3. **Iniciar Semana 1** — fundação + tela Conexão

> **Nota:** O vanilla JS (`public/renderer.js`) continua 100% funcional. A migração é **aditiva** — telas Svelte coexistem até substituição completa.