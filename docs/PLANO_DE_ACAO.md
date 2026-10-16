# GRBL Studio — Plano de Ação

- **Versão:** 1.0
- **Última atualização:** 2026-10-16
- **Documento relacionado:** [PRODUCT_SPEC.md](PRODUCT_SPEC.md) (o *quê*) · [ARCHITECTURE.md](ARCHITECTURE.md) (o *como*)

Este é o plano canônico de execução do projeto. Ele parte de uma **auditoria do
estado atual**, define **decisões de arquitetura**, organiza o trabalho em
**fases com critérios de aceite**, e fecha com **cronograma, riscos e próximos
passos**.

---

## 1. Resumo executivo

O repositório já tem a **casca** de um app Electron (conexão serial, jog,
carregamento e "envio" de arquivo, console), mas o core de controle é frágil:
o envio de G-code é *fire-and-forget*, o status da máquina não é lido, o console
não recebe respostas da serial e comandos de tempo real estão sendo enviados com
`\n` (inválido).

**Estratégia:** antes de ampliar funcionalidades, **corrigir e endurecer o core
de comunicação/protocolo** (Fase 1). Só então construir status, overrides,
preview, configuração e importação de imagens. O produto de referência é o
LaserGRBL; a meta é paridade nos recursos essenciais + distribuição nativa Linux.

---

## 2. Auditoria do estado atual

> **Snapshot da auditoria inicial (pré-Fase 1).** O estado atual já resolve os
> bloqueadores B1–B6 e B8 — ver `CHANGELOG.md` e o status das fases (§5).
> Esta seção é mantida como registro do ponto de partida.

### 2.1 O que já existe

| Área | Situação |
| :--- | :--- |
| Estrutura Electron + TypeScript | ✅ main/preload/renderer separados, `contextIsolation` ligado |
| Listagem de portas seriais | ✅ via `SerialPort.list()` |
| Conexão/desconexão | 🟡 baud fixo (115200), sem detecção de erro/desconexão |
| Console de comandos | 🟡 envia, **mas não exibe respostas** |
| Jog X/Y + Home | 🟡 funciona como MVP, sem contínuo/velocidade/atalhos |
| Carregar arquivo G-code | ✅ lê `.gcode/.nc/.tap/.txt` |
| Envio do arquivo | 🔴 *fire-and-forget* com `setTimeout(10ms)` |
| Botão parar | 🔴 envia `'!\n'` (deveria ser byte `!` puro) |

### 2.2 Dívidas técnicas e bugs identificados (bloqueadores)

| # | Problema | Impacto | Onde |
| :-- | :--- | :--- | :--- |
| B1 | **Nenhum dado serial é enviado ao renderer.** Não há `webContents.send('serial-data', …)` nem listener de `data`. O console nunca mostra `ok`/`error`. | Console inútil; dificulta todo o resto | `src/main-serial.ts`, `src/main.ts` |
| B2 | **Envio sem controle de fluxo.** Laço envia linha a linha com `setTimeout(10ms)` sem esperar `ok`. | Estouro do buffer do GRBL → travamento/perda de passos | `public/renderer.js` |
| B3 | **Comando de tempo real com `\n`.** `port.write('!\n')` — Feed Hold é byte único `!`. | Pausa não funciona corretamente | `src/main-serial.ts` |
| B4 | **Jog envia 3 comandos em uma linha** (`G91\nG0 …\nG90`). | Comportamento indefinido no GRBL | `public/renderer.js` |
| B5 | **Erros silenciosos.** `port.open(err => console.error(err))` sem retornar status ao renderer. | Usuário não sabe que falhou | `src/main-serial.ts` |
| B6 | **Sem parsing de status/erros.** Nada interpreta `<…>`, `ok`, `error:`, `ALARM:`. | Sem estado, sem progresso, sem segurança | — |
| B7 | **Sem teste de porta/estado na UI.** Botões habilitam mesmo sem máquina pronta. | Risco de comando inválido em alarme | `public/renderer.js` |
| B8 | Arquivo `src/main-serial.ts.bak` versionado. | Sujeira / confusão | `src/` |
| B9 | Documentação duplicada (`leia/` × `docs/`) e dessincronizada. | Manutenção confusa | `leia/`, `docs/` |

> **Conclusão da auditoria:** 2 bugs são bloqueadores de segurança
> (B1/B2/B3). Nenhuma funcionalidade nova deve começar antes de resolvê-los.

### 2.3 Pontos fortes a preservar

- Separação main/preload/renderer com `contextIsolation: true` e
  `nodeIntegration: false` — manter.
- TypeScript no processo main — estender ao renderer.
- Uso de `serialport` — biblioteca madura; manter.
- Tema escuro e layout já esboçados — base para a UI moderna.

---

## 3. Decisões de arquitetura (ADR resumido)

| # | Decisão | Escolha | Alternativas | Justificativa |
| :-- | :--- | :--- | :--- | :--- |
| ADR-1 | Runtime desktop | **Electron + TypeScript** | Tauri, Qt/PySide, GTK | Já iniciado; ecossistema npm (serialport, processamento de imagem); portabilidade. Tauri é mais leve, mas reescreveria o core. |
| ADR-2 | UI do renderer | **TypeScript + framework leve (Svelte ou React) via `electron-vite`** | Vanilla JS (atual) | Preview 2D, import de imagem e configuração exigem estado reativo; vanilla vira espaguete. Migração incremental. |
| ADR-3 | Camada de protocolo | **Módulo `GrblClient` isolado e agnóstico de UI**, no main | Lógica no renderer | Testável sem hardware (GRBL simulado); evita bloquear a UI. |
| ADR-4 | Streaming | **Send-response (`ok`) agora; character-counting depois** | Fire-and-forget (atual) | Correção primeiro; otimização depois. |
| ADR-5 | Estado entre processos | **Eventos IPC tipados (canal por tipo)** | `invoke` genérico | Contratos claros, menos bugs. |
| ADR-6 | Persistência | **`electron-store`** | localStorage | Acessível no main (porta/baud) e seguro. |
| ADR-7 | Processamento de imagem | **`<canvas>` no renderer + Web Worker (`src/renderer/gcode.worker.ts`) sobre funções puras em `src/shared/image/*`** | `sharp` no main; rodar na thread principal | Decodificação nativa sem módulo nativo (evita rebuild do Electron), UI/main livres durante a conversão e pipeline testável no Vitest. *(refinada em 16/10/2026)* |
| ADR-8 | Preview 2D | **`<canvas>` 2D** (WebGL só se necessário) | SVG, Three.js | Suficiente e leve para visualização 2D de caminhos. |
| ADR-9 | Distribuição | **`electron-builder` → AppImage + deb; Flatpak depois** | Só tarball | Instalação nativa esperada no Linux. |
| ADR-10 | Testes | **Vitest (unit) + Playwright (E2E) + GRBL simulado via socat** | Manual | Confiabilidade é o diferencial do produto. |
| ADR-11 | Design system | **Tokens CSS próprios no padrão Fluent/Win11** (`tokens.css` + componentes próprios) | Fluent UI React, antd, MUI | "Rápido e leve": libs de UI cheias chegam com 10–50 MB de JS e RAM extra; Fluent UI só se o orçamento de perf do `DESIGN.md` não for atingido. |

> Todas as ADRs devem ser confirmadas com o time antes da Fase 1. As que
> bloqueiam tudo são ADR-1, ADR-3 e ADR-4. ADR-11 (design) precisa estar decidida
> antes da Fase 2, quando a UI passa a crescer.

---

## 4. Estrutura-alvo do código

```
GRBL Studio/
├── src/
│   ├── main/
│   │   ├── index.ts            # bootstrap Electron
│   │   ├── ipc.ts              # handlers IPC (contratos tipados)
│   │   └── services/
│   │       ├── GrblClient.ts   # protocolo: envio, ok/error, status, overrides
│   │       ├── SerialTransport.ts
│   │       ├── SettingsStore.ts
│   │       └── image/          # grayscale, dithering, vectorize, gcode gen
│   ├── shared/                 # tipos e constantes compartilhados
│   │   ├── protocol.ts         # parser de status/erros/alarmes
│   │   └── types.ts
│   ├── preload/
│   │   └── index.ts            # contextBridge tipado
│   └── renderer/
│       ├── App / components    # UI
│       ├── state/              # store reativo
│       └── views/              # preview, jog, console, config, import
├── public/ (assets)
├── tests/
│   ├── unit/
│   └── e2e/
└── docs/
```

> Migração incremental (em andamento): o **main** já foi extraído para módulos
> testáveis (`shared/protocol.ts`, `services/SerialTransport`, `services/GrblClient`,
> `main/ipc.ts`) — Fase 1 concluída. Falta migrar o renderer
> (`public/renderer.js`, ainda vanilla JS) para o framework escolhido (ADR-2).

---

## 5. Fases de execução

Cada fase tem **objetivo**, **entregáveis**, **tarefas** e **critérios de
aceite**. Estimativas em *dev-semanas* (1 dev; ajustar conforme equipe).

---

### Fase 0 — Fundação e documentação (1 semana)

**Status:** 🟢 concluída (a revisão/aprovação do `PRODUCT_SPEC` e a decisão da ADR-11 seguem com você)

**Objetivo:** fixar o contrato do produto e limpar o terreno.

**Entregáveis**
- Documentação criada/atualizada: `PRODUCT_SPEC.md`, `PLANO_DE_ACAO.md`, `README.md` (docs), `ARCHITECTURE.md`.
- ADRs confirmadas.
- Repositório limpo e build reproduzível.

**Tarefas**
- [ ] Revisar e aprovar `PRODUCT_SPEC.md` e as ADRs (seção 3). *(pendente: você)*
- [ ] ADR-11: decidir design system (tokens próprios vs. Fluent UI React). *(decisão sua)*
- [x] Criar `tokens.css` base do `DESIGN.md` (cores claro/escuro, espaço, raio, sombra, motion) + tema sem "flash".
- [x] Remover `src/main-serial.ts.bak` (B8).
- [x] Unificar manuais: `leia/` → `docs/` e remover duplicatas (B9): pasta `leia/` e PDF `manual laser gbrl.pdf` (idênticos) removidos; `README_MAIN.md` (índice secundário) removido.
- [x] Definir licença **MIT** (`LICENSE`, `package.json`) e `CONTRIBUTING.md`.
- [x] Configurar lint/format: **Biome** (`biome.json`, scripts `lint`/`format`). *(ESLint + typescript-eslint é inviável com o TypeScript 7 — sem API JS; ver `DEVELOPMENT.md`.)* `tsconfig` estrito: ✅.

**Critérios de aceite**
- `npm install && npm run build` funciona em máquina limpa. ✅
- Documentação indexada e sem links quebrados. ✅
- Tema claro/escuro troca sem flash e tokens centralizados. ✅

---

### Fase 1 — Core de comunicação confiável (2–3 semanas) 🔴 crítico

**Status:** ✅ concluída (falta validar em hardware real)

**Objetivo:** resolver os bloqueadores B1–B6 e ter um transporte sólido.

**Entregáveis**
- `SerialTransport`: abrir/fechar/erros/desconexão, leitura contínua com *line framing*.
- `GrblClient`: fila de envio **send-response**, parse de `ok`/`error:`/`[MSG:]`.
- Parser de status `<…>` em `src/shared/protocol.ts` (funções puras e testadas).
- Eventos IPC tipados: `console`, `status`, `progress`, `job`, `connection`, `error`.
- Console recebendo e exibindo respostas reais.
- Botão Stop enviando byte `!` puro + Soft Reset (`0x18`).

**Tarefas**
- [x] B1: emitir dados seriais ao renderer via `webContents.send`.
- [x] B2: reescrever envio como fila que só avança ao receber `ok`.
- [x] B3: corrigir comandos de tempo real (sem `\n`).
- [x] B4: corrigir jog (usa `$J=`).
- [x] B5: propagar erros de `open`/`write` para a UI.
- [x] B6: implementar `parseStatusReport`, `classifyLine`, `parseSettings`, descrições de alarme/erro.
- [x] Adicionar testes unitários do parser (Vitest).
- [x] Criar ambiente de teste com GRBL simulado (integração via PTY/socat + transporte falso).
- [x] Extras: preload empacotado (esbuild, mantendo `sandbox: true`), smoke test headless, watchdog de resposta.

**Critérios de aceite**
- Ao conectar, o console exibe a *banner* do firmware (`Grbl 1.1f ['$' for help]`). ✅
- Enviar um arquivo de 1000 linhas conclui sem estourar o buffer e mostra progresso. ✅ (garantido por send-response; validar em hardware)
- Um `error:` do GRBL interrompe o job com mensagem clara. ✅ (testado)
- Testes do parser cobrem os formatos de status documentados na seção 8 do Product Spec. ✅

---

### Fase 2 — Status, jog e controle de execução (2 semanas)

**Objetivo:** tornar a máquina "visível" e controlável em tempo real — com a
**aparência Windows 11** definida em `DESIGN.md` (nav rail, cards, DRO).

**Entregáveis**
- Layout Fluent (nav rail + cards) com `tokens.css` aplicado em todas as telas.
- Polling de status `?` a 5–10 Hz com estado, posição, feed e spindle.
- Jog completo: passos, velocidade, contínuo, teclado, Z.
- Set origin / go to zero, Unlock, Reset, Homing com feedback.
- Play/Pause/Resume/Stop com estados corretos e botões habilitados/desabilitados.

**Tarefas**
- [ ] RF-STA-1…3: status report parser → UI (badge de estado + DRO de posição).
- [ ] RF-STA-5/6: desabilitar comandos inválidos em alarme; botões Reset/Unlock/Home.
- [ ] RF-STA-4: tabela de alarmes com causa + solução (baseada no manual da COMGO).
- [ ] RF-JOG-1…7: jog com passo/velocidade/atalhos e `$J=`.
- [ ] RF-GC-4/8: Pause (`!`), Resume (`~`), Stop/Emergency, Soft Reset.
- [ ] RF-GC-5: barra de progresso e tempo restante.
- [ ] Atalhos de teclado globais.

**Critérios de aceite**
- Durante um job, estado e posição atualizam com ≤ 200 ms de latência.
- Pausar/retomar/parar em ≤ 10 min de job funcionam de forma determinística.
- Em `Alarm`, comandos inválidos ficam desabilitados e há ação recomendada.
- UI ≥ 55 fps com job rodando e DRO estável em 0,001 mm (`DESIGN.md` §3).

---

### Fase 3 — Configuração do GRBL e preferências (1,5 semana)

**Objetivo:** permitir ajustar a máquina sem decorar comandos.

**Entregáveis**
- Viewer/editor de `$$` com descrição de cada setting.
- Telas para `$#`, `$I`, `$G`.
- Preferências persistidas (porta, baud, tema, unidades, pastas).
- Ajuda contextual para settings críticos (`$20`, `$21`, `$22`, `$32`).

**Tarefas**
- [ ] RF-CFG-1/2: parse de `$$` → tabela editável → aplicar `$n=v`.
- [ ] RF-CFG-3: `$#`, `$I`, `$G`.
- [ ] RF-CFG-5: `electron-store` (ADR-6) + UI de preferências.
- [ ] RF-CON-3: persistir última porta/baud e reconectar no boot.
- [ ] RF-CFG-6: tooltips/ajuda por setting.
- [ ] RF-APP-3: alternância mm/pol.

**Critérios de aceite**
- Ler `$$`, alterar um valor, aplicar e reler confirma a mudança.
- Reabrir o app restaura porta, baud, tema e unidades.

---

### Fase 4 — Overrides e preview 2D (2 semanas)

**Objetivo:** dar controle fino e confiança visual ao operador.

**Entregáveis**
- Overrides de feed/potência (0x90–0x94 e spindle) com exibição do valor ativo.
- Preview 2D do G-code com zoom/pan, bounding box e posição em tempo real.
- Distinção visual entre `G0` (rápido) e `G1` (corte).
- Múltiplos passes.

**Tarefas**
- [ ] RF-OVR-1…4: sliders de override com *worker* que emite bytes corretos.
- [ ] RF-PRV-1…5: parser de movimento (`G0/G1/G2/G3`, `G90/G91`, unidades) → canvas.
- [ ] RF-GC-6: múltiplos passes.
- [ ] RF-PRV-3: crosshair de posição ligado ao status.
- [ ] RF-GC-9: aviso quando o caminho excede a área de trabalho (`$130/$131`).

**Critérios de aceite**
- Override altera a velocidade da máquina durante o job e o valor aparece na UI.
- Preview renderiza um arquivo de 50k linhas em < 2 s e acompanha a execução.

---

### Fase 5 — Importação de imagens e geração de G-code (3 semanas)

**Objetivo:** entregar o diferencial de "imagem → gravação" do LaserGRBL.

**Entregáveis**
- Importação de imagem (PNG/JPG/BMP/GIF/WebP/AVIF) por diálogo nativo já
  filtrado, com preview.
- Ajustes de imagem (brilho, contraste, white clip, inversão, B&W).
- Conversão line-to-line (direção + linhas/mm) e dithering (Floyd–Steinberg).
- Parâmetros de gravação (velocidade, S-min/S-max, M3/M4).
- Geração de G-code otimizada (potência dinâmica no modo M4).

**Tarefas**
- [x] RF-IMG-1/2: pipeline de imagem (ADR-7, em worker).
- [x] RF-IMG-3: dimensionamento/offset/posicionamento.
- [x] RF-IMG-4: gerador line-to-line.
- [x] RF-IMG-5: dithering.
- [x] RF-IMG-7: parâmetros de laser e modos M3/M4.
- [x] RF-IMG-9: compensação do tamanho do ponto (ex.: 0,08 mm).
- [x] Diálogos nativos de abrir/salvar (`file:open-image`, `file:open-gcode`,
  `file:save-gcode`) com filtros em `shared/fileFilters.ts`.
- [x] Clareza do fluxo na UI: passos explícitos, `#portHint`/`#runHint` e
  `title` explicando cada ação desabilitada.
- [x] RF-IMG-6: vetorização (Could) — traçador de contorno próprio em
  `shared/image/contour.ts` (arestas + resolução de sela + RDP), sem
  dependência externa (`potrace` dispensado).
- [x] RF-IMG-8: perfis de material (Could) — `shared/materials.ts` reproduz as
  matrizes §9.1 (5W) e §9.2 (10W) do manual COMGO; o seletor (módulo × ação ×
  material) preenche **velocidade** e **S-max** (`powerPercentToS`, ref. `$30 =
  1000`) e mostra as notas (preparo de superfície, nº de passadas).
  Empacotado para o renderer como `public/materials.js`.

> **Nota de execução (16/10/2026):** esta fase foi iniciada antes das Fases 3/4
> porque é a única parte que avança **sem hardware ligado** (preparação de
> arquivo é 100 % offline). O gate da Fase 1 (bugs B1–B6) já está cumprido.

**Critérios de aceite**
- Importar uma foto, ajustar tamanho/parâmetros, gerar G-code e gravar em madeira
  com resultado visualmente equivalente ao LaserGRBL no mesmo material.
- Arquivo gerado respeita os limites de S-min/S-max e o modo M3/M4 escolhido.

---

### Fase 6 — Macros, retomada de job e WiFi (1,5 semana)

**Objetivo:** produtividade e recursos avançados.

**Entregáveis**
- Botões customizados/macros com import/export.
- Retomada de job interrompido (início, N linhas antes, linha específica).
- (Could) Conexão WiFi via ESP8266.

**Tarefas**
- [ ] RF-MAC-1/2.
- [ ] RF-GC-7: janela de retomada e rewind de linhas.
- [ ] RF-CON-7: transporte sobre TCP (Could).

**Critérios de aceite**
- Interromper um job e retomar "N linhas antes" funciona sem danificar a peça.

---

### Fase 7 — Empacotamento, i18n e polimento (2 semanas)

**Objetivo:** transformar o app em produto instalável e **visualmente
no nível do Windows 11**.

**Entregáveis**
- Builds `.AppImage` e `.deb`; Flatpak (Could).
- i18n pt-BR/en; tema claro/escuro completo.
- Ícone, splash, avisos de segurança e permissões de porta serial.
- Site/README de download e guia de primeiros passos.
- **Checklist visual de aceite** (`DESIGN.md` §8) aprovado.

**Tarefas**
- [ ] RF-APP-4: `electron-builder` (ADR-9) + automação de release.
- [ ] RF-APP-2: estrutura de i18n.
- [ ] RF-APP-5: documentar `dialout`/udev para `/dev/ttyUSB*`.
- [ ] RNF-9: log persistente de sessão.
- [ ] Revisão de UX/acessibilidade e polish.
- [ ] Passar o **checklist visual** completo de `DESIGN.md` §8 (aparência Win11,
      DPI 125 %/150 %, RAM ≤ 200 MB, ≥ 55 fps, foco/teclado, `prefers-reduced-motion`).

**Critérios de aceite**
- `.AppImage` roda em Ubuntu 24.04 e Fedora 40 (X11 e Wayland) sem instalação.
- App em pt-BR e en sem strings fixas.

---

### Fase 8 — Qualidade contínua (transversal)

**Objetivo:** garantir confiabilidade ao longo de todas as fases.

**Tarefas contínuas**
- [ ] Cobertura de testes do módulo de protocolo > 80%.
- [ ] E2E Playwright para o fluxo conectar → carregar → enviar (com GRBL simulado).
- [x] CI (GitHub Actions): build + lint + typecheck + testes (+ smoke headless) em cada push/PR. *(`.github/workflows/ci.yml`)*
- [ ] Testes manuais em hardware real por release (checklist).

---

## 6. Cronograma estimado

| Fase | Foco | Duração | Acumulado |
| :--- | :--- | :--- | :--- |
| 0 | Fundação e docs | 1 sem | 1 sem |
| 1 | Core de comunicação 🔴 | 2–3 sem | 3–4 sem |
| 2 | Status, jog, execução | 2 sem | 5–6 sem |
| 3 | Configuração e preferências | 1,5 sem | 6,5–7,5 sem |
| 4 | Overrides e preview | 2 sem | 8,5–9,5 sem |
| 5 | Import de imagens | 3 sem | 11,5–12,5 sem |
| 6 | Macros, retomada, WiFi | 1,5 sem | 13–14 sem |
| 7 | Empacotamento, i18n, polish | 2 sem | 15–16 sem |

> Para 1 desenvolvedor em tempo integral: **~4 meses** até um v1.0 distribuível.
> Um **MVP utilizável** (Fases 0–2) sai em **~4 semanas**.

---

## 7. Backlog priorizado (visão por valor × esforço)

| Prioridade | Item | Fase | Esforço |
| :--- | :--- | :--- | :--- |
| P0 | Corrigir transporte + streaming confiável (B1–B6) | 1 | Alto |
| P0 | Parser de status/erros/alarmes | 1 | Médio |
| P0 | Play/Pause/Resume/Stop corretos | 2 | Médio |
| P0 | Status em tempo real + DRO de posição | 2 | Médio |
| P1 | Jog completo + set origin + unlock/home | 2 | Médio |
| P1 | Editor de `$$` | 3 | Médio |
| P1 | Preferências persistentes | 3 | Baixo |
| P1 | Import de imagem (line-to-line + dithering) | 5 | Alto |
| P1 | Overrides | 4 | Médio |
| P1 | Preview 2D | 4 | Alto |
| P2 | Múltiplos passes | 4 | Baixo |
| P2 | Retomada de job | 6 | Médio |
| P2 | Macros/botões | 6 | Baixo |
| P2 | Empacotamento AppImage/deb | 7 | Médio |
| P3 | Vetorização | 5 | Alto |
| P3 | Perfis de material | 5 | Médio |
| P3 | WiFi ESP8266 | 6 | Médio |
| P3 | Flatpak / i18n | 7 | Médio |

---

## 8. Estratégia de testes

| Nível | Ferramenta | Cobre |
| :--- | :--- | :--- |
| Unitário | Vitest | Parser de status, parse de `$$`, gerador de G-code, dithering. |
| Integração | Vitest + `socat` + emulador GRBL | Fila de envio, `ok`/`error`, timeouts, reconexão. |
| E2E | Playwright (Electron) | Fluxo completo com máquina simulada. |
| Hardware | Checklist manual | Gravação real, overrides, alarmes, retomada. |

**Emulador GRBL sugerido:** `grbl-sim`/`grblHAL` simulado ou um *fake* Node que
responde `ok` e o formato de status — suficiente para testar o protocolo.

---

## 9. Release e versionamento

- **SemVer** (`MAJOR.MINOR.PATCH`). Alpha interno até Fase 2; Beta a partir da Fase 5; v1.0 na Fase 7.
- Branch principal + PRs; CI obrigatório.
- `CHANGELOG.md` mantido a partir da Fase 1.
- Artefatos de release publicados no GitHub Releases.

---

## 10. Riscos e mitigação

| Risco | Prob. | Impacto | Mitigação |
| :--- | :--- | :--- | :--- |
| Estouro de buffer do GRBL / travamento da máquina | Alta | Crítico | Streaming send-response na Fase 1; testes com emulador; nunca enviar em massa. |
| Perda de foco na correção do core (ir direto para features) | Média | Alto | Gate explícito: Fase 1 é pré-requisito das demais. |
| Acesso a `/dev/ttyUSB*` negado no Linux | Alta | Médio | Detectar e orientar (grupo `dialout`, regra udev); empacotar instruções. |
| Migração de UI (vanilla → framework) gerar retrabalho | Média | Médio | Migração incremental; extrair lógica de protocolo antes. |
| Qualidade do G-code de imagem abaixo do LaserGRBL | Média | Alto | Benchmark lado a lado com o manual COMGO; testes com materiais reais. |
| Falta de hardware para testar | Média | Alto | Emulador GRBL no CI + 1 máquina real de referência. |
| Escopo crescer (vetorização, WiFi, câmera) | Alta | Médio | Marcar como `Could`; só após v1.0. |

---

## 11. Definition of Done

Uma tarefa só é considerada **pronta** quando:

- [ ] Atende ao requisito correspondente em `PRODUCT_SPEC.md`.
- [ ] Passa em lint, type-check e testes (unit + integração aplicáveis).
- [ ] Tem teste automatizado para lógica de protocolo/parsing.
- [ ] Foi validada com GRBL simulado **e**, quando aplicável, em hardware real.
- [ ] Não introduz regressão nos fluxos de segurança (pause/stop/emergency).
- [ ] Cumpre os orçamentos de **performance/precisão** (`DESIGN.md` §3 → RNF-10 a 13): RAM, fps, latência, DRO.
- [ ] Documentação/`CHANGELOG` atualizados.
- [ ] Revisada por outro dev (PR aprovado).

---

## 12. Próximos passos imediatos (2 semanas)

1. **Revisar e aprovar** `PRODUCT_SPEC.md` + ADRs (seção 3) — 1 dia.
2. **Limpeza**: remover `*.bak`, unificar manuais, configurar lint/tsconfig — 1 dia.
3. **B1/B3/B5**: emitir dados ao renderer, corrigir comandos de tempo real e
   propagar erros de porta — 2 dias.
4. **B2**: reescrever o envio como fila send-response com `ok` — 3 dias.
5. **B6**: parser de status/erros/alarmes + testes unitários — 2 dias.
6. **Emulador GRBL** com `socat` + fake server para validar tudo — 1 dia.
7. **Fechar Fase 1** com checklist de aceite da Fase 1.

> Depois disso, seguir para a Fase 2 (status/jog/execução).

---

## 13. Referências

- LaserGRBL — Usage: <https://lasergrbl.com/usage/>
- LaserGRBL — Interface: <https://lasergrbl.com/usage/user-interface/>
- LaserGRBL — Overrides: <https://lasergrbl.com/usage/overrides/>
- LaserGRBL — Machine status: <https://lasergrbl.com/usage/machine-status/>
- GRBL v1.1 Commands (wiki gnea/grbl) — comandos de tempo real e streaming.
- Manual COMGO Z1 (transcrito): `docs/comgo_z1_lasergrbl_user_manual.md`.
