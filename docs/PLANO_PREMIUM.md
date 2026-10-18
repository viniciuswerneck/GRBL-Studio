# GRBL Studio — Plano para ser o melhor controlador laser do mercado

> Complementa `PLANO_DE_ACAO.md` (fases 0–8, já concluídas) e
> `ANALISE_COMPETITIVA.md`. Objetivo: tornar o GRBL Studio **superior a
> LaserGRBL, LightBurn e Meerk40t** para o público-alvo (gravadoras GRBL,
> hobbyistas e pequenos ateliês), sendo ao mesmo tempo **fácil, rápido e
> perfeito**, com aparência de **programa premium**, sem perder o caráter
> gratuito e de código aberto.

---

## 1. Visão e princípios

**Visão:** "O controlador laser gratuito que parece e se comporta como um
produto pago de US$ 200 — nativo em qualquer sistema, com o melhor pipeline
de imagem do mercado e zero fricção."

**Princípios (não negociáveis):**
1. **Fácil** — onboarding em < 5 min; cada ação desabilitada explica o motivo;
   Assistente para leigos (já existe) como porta de entrada.
2. **Rápido** — orçamentos RNF-11/12 são requisitos, não sugestões; nada de
   espera perceptível (>100 ms) para interação.
3. **Perfeito** — precisão de 0,001 mm, sem jitter, sem perda de material,
   sem travamento de máquina; erros sempre com causa + solução.
4. **Premium** — Fluent/Windows 11, 11 temas, micro-interações só em
   `transform`/`opacity`, estados vazios/loading/erro polidos, hi-DPI.
5. **Seguro** — `contextIsolation`, protocolo robusto, `M5` antes de `G0`,
   janela por bytes, parada de emergência.
6. **Aberto** — gratuito, código aberto, i18n (pt-BR/en/es), plugins.

**Posicionamento:** "LaserGRBL para Linux (e além), com qualidade de
engenharia" — gratuito, nativo, GRBL-only, com pipeline de imagem superior e
UX moderna. Não competir com LightBurn em design/câmera/rotativa no curto
prazo; usar **importação SVG** como ponte para design (Inkscape).

---

## 2. Gap analysis (atual × meta)

| Capacidade | Atual | Meta | Gap |
| :--- | :--- | :--- | :--- |
| Sistemas | Linux | Win + macOS + Linux | Alto |
| Ferramentas de desenho | Nenhuma | Básicas (formas, texto, offset) | Alto |
| Importação SVG/DXF/AI/PDF | Não | SVG + DXF | Alto |
| Câmera | Não | Captura + alinhamento | Alto |
| Rotativa (eixo A) | Não | Sim | Médio |
| Simulação de job | Não | Playback visual + tempo | Médio |
| Jobs multi-operação | Não | Camadas (gravar + cortar) | Médio |
| Grade de teste de material | Não | Gerador 1-clique | Baixo |
| Z-axis no jog | Não | Sim | Baixo |
| Editor de G-code | Não | Syntax highlight | Baixo |
| Auto-update | Não | electron-updater | Baixo |
| Catálogo de máquinas | Só COMGO Z1 | 10+ perfis | Baixo |
| Flatpak | Scaffold | Publicado | Baixo |
| Preview de arquivos grandes | Canvas 2D | WebGL (opcional) | Baixo |
| Testes E2E | 4 básicos | Fluxos de job/protocolo | Médio |
| Checklist perf. (DPI/RAM/fps) | Não medido | Medido e documentado | Baixo |

---

## 3. Fases de execução

### Fase P1 — "Premium base" (4–6 semanas) · alto impacto, baixo risco

Objetivo: fechar o que falta para ser "produto pronto" e ampliar público.

| # | Entregável | Esforço | DoD |
| :--- | :--- | :--- | :--- |
| P1.1 | **Builds Win + macOS no CI** (matrix no `release.yml`) | M | ✅ Implementado (matrix ubuntu/windows/macos). |
| P1.2 | **Auto-update** (`electron-updater`) para AppImage/.deb | S | ✅ Implementado (checkForUpdatesAndNotify + publish.provider=github). |
| P1.3 | **Publicar Flatpak** (scaffold → Flathub) | M | `flatpak install` funcional, permissões de porta serial documentadas. |
| P1.4 | **Onboarding / tour** (primeira execução) | S | Tour de 5 passos + link para docs. |
| P1.5 | **Z-axis no jog** (UI + `frameJog`) | S | Jog Z visível quando `$22`/`$21` indicam Z; testes. |
| P1.6 | **Importação SVG** (parser + paths → G-code) | M | Abrir `.svg`, preview, gerar G-code de contorno. |
| P1.7 | **Grade de teste de material** (gerador) | S | ✅ Implementado (modal + gerador + 9 testes). |
| P1.8 | **Medir orçamentos RNF-11/12** (startup, RAM, fps, DPI) | S | ✅ Parcial (preview 3 ms; startup ~1,2 s; restante a medir em HW). |
| P1.9 | **Atualizar `FEATURES_COMPARISON.md`** | S | ✅ Atualizado. |
| P1.10 | **G-code editor** (syntax highlight + numeração) | M | Editar e reenviar linhas; validação. |

### Fase P2 — "Design & produção" (6–8 semanas) · fecha a lacuna com LightBurn

| # | Entregável | Esforço | DoD |
| :--- | :--- | :--- | :--- |
| P2.1 | **Ferramentas de desenho básicas** (formas, texto, offset, booleanas) | L | ✅ Parcial (retângulo/círculo/linha + mover/excluir + gerar G-code; texto/offset/booleanas pendentes). |
| P2.2 | **Camadas (layers)** com parâmetros por camada | M | Gravar + cortar numa execução; reordenação. |
| P2.3 | **Simulação de job** (playback visual + tempo) | M | Play/pause/seek do caminho com velocidade real. |
| P2.4 | **Importação DXF** | M | Parser + conversão para paths. |
| P2.5 | **Catálogo de máquinas** (10+ perfis) | S | Ortur, AtomStack, Sculpfun S9/S10, xTool, etc. |
| P2.6 | **Jobs multi-operação** (engrave + cut) | M | Uma execução, múltiplas passadas/ops. |

### Fase P3 — "Pro features" (8–12 semanas) · paridade com LightBurn/Meerk40t

| # | Entregável | Esforço | DoD |
| :--- | :--- | :--- | :--- |
| P3.1 | **Câmera** (captura USB + alinhamento visual) | L | Overlay da imagem na peça; drag-to-position. |
| P3.2 | **Rotativa (eixo A)** | L | Suporte a rotary em jog e job. |
| P3.3 | **Plugin/extension system** | L | Generaliza macros; API documentada. |
| P3.4 | **Preview WebGL** (arquivos gigantes) | M | 14 M de linhas sem travar. |
| P3.5 | **Telemetria opt-in** (Sentry/GlitchTip) | S | Crash reporting + métricas de uso. |
| P3.6 | **Migração do renderer para TS** (Svelte + electron-vite) | XL | ADR-2 concluído; `renderer.js` sai do repo. |

### Fase P4 — "Ecossistema" (contínuo)

- Documentação do usuário (manual, screenshots, vídeos).
- Comunidade (Discord, galeria de perfis).
- Internacionalização de novos idiomas (fr, de, it, ru, zh).
- Integração com Inkscape (watch de arquivo).
- App móvel companion (status + pausa) — opcional.

---

## 4. Aparência premium (transversal)

Checklist de polish (Fase 7 + contínuo):

- [ ] **Estados vazios** em todas as telas (sem imagem, sem G-code, sem conexão)
  com ilustração + ação primária.
- [ ] **Loading states** (skeleton/spinner) em operações longas (conversão de
  imagem, leitura de `$$`).
- [ ] **Micro-interações** só em `transform`/`opacity`, ≤150 ms, respeitando
  `prefers-reduced-motion`.
- [ ] **Hi-DPI** verificado em 100/125/150/200 % (sem blur, sem pixel-fuzz).
- [ ] **Dark/light** consistentes em todos os modais e componentes.
- [ ] **Acessibilidade**: foco visível, atalhos de teclado, ARIA, contraste
  WCAG AA.
- [ ] **Tipografia**: escala de 4 tamanhos, `tabular-nums` em números.
- [ ] **Espaçamento**: grade de 4 px em toda a UI.
- [ ] **Ícones**: SVG (Fluent), sem pixel blur.
- [ ] **Empty states ilustrados** + onboarding.

---

## 5. Métricas de sucesso (KPIs)

| Métrica | Meta | Como medir |
| :--- | :--- | :--- |
| Startup | ≤ 1,5 s | `performance.now()` no bootstrap |
| RAM após 10 min | ≤ 200 MB | `process.memoryUsage()` |
| CPU ociosa | ≈ 0 % | DevTools Performance |
| Resposta a clique/tecla | ≤ 100 ms | DevTools interaction |
| Latência de status | ≤ 200 ms | parser → paint |
| FPS durante job | ≥ 55 | DevTools FPS meter |
| Render do preview (50k linhas) | ≤ 2 s (1º) / ≤ 16 ms (job) | `performance.now()` |
| Adoção (downloads/release) | +50 % por release | GitHub insights |
| Issues de "travou a máquina" | 0 por release | Issue tracker |
| Satisfação (NPS) | ≥ 50 | Survey in-app (opt-in) |

---

## 6. Riscos e mitigações

| Risco | Prob. | Impacto | Mitigação |
| :--- | :--- | :--- | :--- |
| Migração para framework (P3.6) quebra a UI | Alta | Alto | Migração incremental por componente; manter vanilla como fallback. |
| Escopo inflar (feature creep) | Alta | Alto | Gate de fases; DoD rígido; priorização por valor×esforço. |
| Suporte multi-OS sem hardware | Média | Alto | CI matrix + beta testers por plataforma. |
| Câmera/rotativa complexas | Alta | Médio | Pesquisa técnica antes de comprometer; protótipo isolado. |
| Perda de foco no core | Média | Crítico | Gate: Fase 1 (protocolo) é pré-requisito de tudo. |
| Manutenção do código gerado (bundles) | Média | Médio | Migrar para electron-vite (P3.6) elimina o atrito. |

---

## 7. Ordem de execução recomendada (critical path)

```
P1.1 (Win/macOS) ─┐
P1.2 (auto-update) ─┤
P1.5 (Z-axis) ─────┤──► P1.8 (perf) ──► P2.1 (design tools) ──► P2.3 (simulação)
P1.6 (SVG import) ─┘                                              │
                                                                  ▼
                                                          P3.1 (câmera)
                                                          P3.2 (rotativa)
                                                          P3.6 (migração TS)
```

**Primeiros 30 dias (quick wins de alto impacto):**
1. P1.1 Win/macOS builds
2. P1.2 auto-update
3. P1.5 Z-axis
4. P1.7 grade de teste de material
5. P1.9 atualizar docs
6. P1.8 medir perf

**Próximos 60 dias:**
7. P1.6 SVG import
8. P1.10 G-code editor
9. P1.3 Flatpak
10. P1.4 onboarding
11. P2.1 design tools (início)
12. P2.3 simulação

**90+ dias:**
13. P2.2/P2.6 camadas + multi-op
14. P3.1 câmera
15. P3.2 rotativa
16. P3.6 migração TS (longo prazo)

---

## 8. Definição de "superior a todos"

O GRBL Studio será considerado **superior** quando, em uma mesma máquina e
mesmo material, um usuário conseguir:

1. **Instalar em < 2 min** em qualquer SO (Win/macOS/Linux) sem Wine.
2. **Gravar uma imagem em < 3 cliques** (abrir → gerar → gravar) com resultado
   igual ou melhor que o LightBurn (qualidade de imagem, velocidade).
3. **Nunca travar a máquina** (buffer, pausa, cancelamento, alarmes).
4. **Ver o resultado antes de gravar** (simulação + preview por intensidade).
5. **Trabalhar em pt-BR/en/es** com UI premium (Fluent, temas, acessibilidade).
6. **Gratuito e de código aberto**, com comunidade ativa.

---

*Plano criado em 17/10/2026. Revisar a cada release.*
