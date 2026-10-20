# GRBL Studio - Roadmap

> **Atualizado em 20/10/2026 (v0.17.0).** Este arquivo é a **visão de execução por
> versão** — tudo o que falta, em ordem. O *raciocínio* (mercado, fosso, riscos)
> está em [`PLANO_PREMIUM.md`](PLANO_PREMIUM.md); os requisitos, em
> [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md); o detalhe das ferramentas de geração, em
> [`PLANO_QR_BARCODE.md`](PLANO_QR_BARCODE.md); o status das fases 0–8, em
> [`PLANO_DE_ACAO.md`](PLANO_DE_ACAO.md) §1.1.
>
> Se algo divergir, **este arquivo manda na ordem** e o `PLANO_PREMIUM.md` no
> porquê.
>
> Esforço: **S** ≤ 3 dias · **M** ≈ 1 semana · **L** ≈ 2–3 semanas · **XL** > 1 mês.
>
> No fim do arquivo há um **Anexo — glossário em linguagem simples** (o que é ·
> onde usa · onde entra) que explica todo recurso citado aqui sem jargão e diz a
> qual item/versão ele pertence.

---

## Estado atual (v0.17.0)

**Fases 0–6 concluídas**; **Fase 7 (polish) e Fase 8 (qualidade) parciais** —
detalhe em `PLANO_DE_ACAO.md` §1.1 e no `CHANGELOG.md`.

Já entregue (não repetir no planejamento):

- [x] Core de comunicação confiável: `SerialTransport` + `GrblClient` com fila e
      **janela por bytes** (nunca acima do buffer RX).
- [x] Console com respostas reais da máquina (banner, `ok`, `error:`, `ALARM:`);
      status GRBL em tempo real (`?`), DRO, feed/`S`, overrides.
- [x] Comandos de tempo real corretos (`!`, `~`, `0x18`, `0x90–0x94`).
- [x] Jog **X/Y/Z** via `$J=`, Home, Unlock, Reset, Set Origin, Go to zero.
- [x] Pausar / Retomar / Parar durante o job; job resume; macros.
- [x] IPC tipado + preload empacotado (`sandbox: true`, `contextIsolation`).
- [x] Preview 2D (zoom/pan) com **intensidade `S`**, trecho por passada e **3 ms**
      por quadro em camadas.
- [x] Pipeline de imagem (velocidade adaptativa, zigue-zague, fusão de trechos).
- [x] **Design 2D**: formas, **texto** (3 modos), caneta + nós, booleanas,
      contorno paralelo, matriz, espelhar, distribuir, agrupar, snap, réguas,
      undo/redo, **estilo por objeto**.
- [x] **Camadas / multi-operação** (P2.2): parâmetros por camada, ordem de
      execução reordenável (arrastando ou ↑/↓) e **gravar + cortar numa
      execução**, com `M5` antes de cada troca de potência/modo — v0.8.0.
- [x] **Importação SVG** (P1.6), **DXF ASCII e PDF vetorial** (P2.4) e **grade de
      teste de material** (P1.7).
- [x] **Builds Win/macOS/Linux no CI** (P1.1) + **auto-update** (P1.2).
- [x] 11 temas (Fluent), **i18n pt-BR/en/es** (1 402 chaves), Assistente (wizard),
      log de sessão.
- [x] **Ferramentas de símbolo**: **QR Code** (ISO/IEC 18004 próprio, ECC L/M/Q/H,
      tamanho alvo em mm) e **código de barras 1D** (Code 128, EAN-13/8, UPC-A,
      Code 39) com **HRI** e avisos de legibilidade — v0.6.0. Continuados na
      **v0.7.0** com ITF-14, Codabar, Code 93 Full ASCII, GS1-128 e **Data
      Matrix ECC200**; **grade a partir de uma lista** (RF-SYM-9) e **PDF417**
      (RF-SYM-7) em 19/10/2026 (v0.9.0); **Aztec** na v0.10.0.
- [x] **Símbolo como objeto** no editor “Desenhar” (S3): QR/Data Matrix/PDF417/
      Aztec/código de barras entram como **um bloco de linhas** agrupado — move,
      escala, gira, recebe camada e potência como qualquer objeto, com
      **duplo clique** para reeditar o conteúdo — 20/10/2026.
- [x] **Encaixe na chapa / nesting** (P3.7): **MaxRects** com margem,
      espaçamento e **rotação 90°** quando cabe melhor; encaixa a seleção (ou
      todos os objetos), informa o **aproveitamento** e avisa o que não coube —
      20/10/2026.
- [x] **Salvar/abrir o desenho** (RF-DSN-16): documento `.gstudio` versionado
      com página, formas, camadas, texto e símbolo; **Ctrl+S**/**Ctrl+O**,
      confirmação antes de descartar alterações e leitura tolerante a arquivos
      inválidos — 20/10/2026.
- [x] **Folga de corte / kerf por camada** (RF-DSN-17): externos crescem e
      furos encolhem `kerf/2` (ilhas voltam a crescer), furo que colapsa é
      omitido com aviso no G-code e a âncora usa a área compensada — 20/10/2026.
- [x] **Lote / dados variáveis** (P2.10/RF-SYM-10): planilha CSV/TSV → fila de
      gravação, uma peça por linha (`{1}`/`{nome}`/`{i:03}`), pausa para trocar a
      peça, contador e retomada — 20/10/2026.
- [x] **Modo produção** (P2.11/RF-GC-12): repete o programa atual **N vezes**
      (1…999) com contador, pausa para a troca da peça, repetição da peça
      interrompida, pré-voo uma vez por série e **trava de UI** (o programa não
      muda no meio) — 20/10/2026.
- [x] **Teste de foco (spot)** (P2.13/RF-IMG-13): escada de **Z relativa** com
      duas potências por passo (a linha mais fina indica o foco), prévia da
      faixa e volta ao Z de partida — 20/10/2026.
- [x] **Presets de material** (P2.12/RF-IMG-14): salvar/aplicar/excluir as
      receitas que deram certo, **dose (J/mm)** para comparar e transferir
      entre módulos, e **JSON** para compartilhar — 20/10/2026.
- [x] **RAM dentro do orçamento** (RNF-11): 269,0 MB em X11 e 290,4 MB em Wayland
      (PSS, app sozinho, 10 min); medição reprodutível em `scripts/bench.mjs`
      (`docs/BENCHMARK.md` §6.6).
- [x] **Simulação de job** (P2.3/RF-PRV-7): playback 2D com play/pause/seek,
      velocidade 1×–10× e tempo estimado — v0.5.0.
- [x] **Painel "Máquina"** (P0.7/RF-MAQ-1…4/7/8), **área de trabalho do preview**
      a partir de `$130/$131` (RF-MAQ-5), **pré-voo MX-1…MX-15** (P0.8/RF-MAQ-6)
      e **diagnóstico copiável** — v0.8.0.
- [x] **Perfis de máquina como dado** (`src/shared/machines.ts`, RF-MAQ-10):
      curso, homing, `S-max`, módulo e potência de apontar por máquina;
      `scripts/probe-machine.mjs` e `grbl-send.mjs` para estudar a máquina real.
- [x] **932 testes** (Vitest, 58 arquivos) + E2E Playwright (56) + smoke headless.

---

## Histórico por versão (entregue)

### MVP
- [x] Estrutura Electron + TypeScript
- [x] Lista de portas seriais · Conexão/desconexão (115200)
- [x] Console de comandos GRBL · JOG (X/Y/Home) com passo configurável
- [x] Carregamento/envio de G-code · Botão parar

### v0.2 — Melhoria UX
- [x] Persistir última porta · baud rate (9600/115200/250000)
- [x] Histórico de comandos no console
- [x] Status GRBL em tempo real (idle/run/hold/alarm) · posição X/Y/Z · feed/`S`
- [x] Transmissão de G-code com confirmação `ok`
- [x] Scroll automático + pausar/limpar/exportar (RF-CON-14/15)

### v0.3 — Preview & JOG avançado
- [x] Preview 2D do caminho · Zero/Set Origin (G92) · Unlock/Soft Reset
- [x] Homing (`$H`) com feedback · distâncias de JOG (0.01…50)
- [x] Atalhos (setas = X/Y, Home = homing)
- [x] Mover para a posição clicada no preview → **v0.7 (P2.14)** ✅

### v0.4 — Configurações
- [x] Janela de configurações · Grbl Settings `$$` (viewer/editor)
- [x] Preferências persistentes (`prefs.json`) · temas claro/escuro (hoje 11)
- [x] Unidades (mm/inch) · auto-scroll do console (pausar/limpar/salvar)

### v0.5 — Recursos avançados
- [x] Laser mode / spindle (M3/M4) · job resume · macros personalizáveis
- [x] **Gerador de formas/texto no app** (→ virou o editor 2D, P2.1/P2.1b)
- [ ] Probe (sonda) *(fora de escopo)*
- [ ] Camera overlay → **v0.9 (P3.1)**

---

## Roadmap de liderança (planejado)

> **Alvo:** ser **#1 no gratuito/código aberto** e **#1 em confiabilidade,
> velocidade e fluxo para GRBL/diodo**; paridade com LightBurn/Rayforge nos
> recursos de produção. Galvo/fibra/DSP e nuvem ficam **fora** (`PLANO_PREMIUM.md` §10).

### v0.6 — Fundação de liderança + geradores de símbolos

**Objetivo:** provar o que já somos, remover o atrito de entrada e entregar o
diferencial que nenhum concorrente grátis tem.

> **Já entregue na 0.6.0:** **P2.7** (QR Code), **P2.8** (código de barras 1D)
> e os **avisos de legibilidade**.
>
> **Entregue depois da 0.6.0 (na 0.7.0):** **P0.2** (E2E de job por PTY),
> **P0.4** (tour de boas-vindas), **P0.6** (fuzz + cobertura ≥ 90 %),
> **P0.1** na **parte Linux** (benchmark — `npm run bench`; resultado honesto em
> `BENCHMARK.md`: CPU ociosa e latência dentro, **startup e RAM acima do
> orçamento** nesta máquina, e Windows/macOS ainda não medidos) e
> **RF-MAQ-10** (catálogo de perfis de máquina). Na mesma versão vieram as
> simbologias extras (S2/S3: ITF-14, Codabar, Code 93, GS1-128 e Data Matrix).
> **Na 0.8.0** vieram **P0.7** (painel Máquina), **P0.8** (pré-voo MX-1…MX-15) e
> a **RF-MAQ-5** (área de trabalho do preview a partir de `$130/$131`).
> O que segue na tabela ainda está aberto — e a ordem dele é a ordem de execução.
>
> **Status da tabela (19/10/2026):** ✅ = entregue. Seguem abertos na v0.6:
> **P0.1** (só falta Windows/macOS) e **P0.3** (Flatpak/Flathub), além do
> restante da Fase 7 (a11y, checklist visual) e da Fase 8 (hardware).

| # | Entregável | Esf. | DoD |
| :-- | :-- | :-- | :-- |
| P0.1 | **Benchmark público** dos orçamentos (startup, RAM, FPS, DPI) | S | Medido em 3 SOs, tabela em `DEVELOPMENT.md` + badge no README. |
| P0.2 | **E2E de job/protocolo** (PTY/socat) no CI | M | Job completo com pausa/retomada/cancelamento/alarme verde no CI. |
| P0.3 | **Distribuição 1-clique**: Flatpak → Flathub, winget, brew, AUR (= P1.3) | M | `flatpak install` e `winget install` documentados; porta serial com permissão. |
| P0.4 | **Onboarding** de primeira execução (P1.4) | S | Tour de 5 passos: conectar → perfil → abrir → preview → gravar. |
| ✅ P0.5 | **Comparativo público** de mercado (tabela da §7.5) | S | Página no README/site com data e fontes. |
| P0.6 | **Cobertura do parser > 90 % + fuzz** do protocolo | M | Nenhum crash com entrada corrompida. |
| ✅ P0.7 | **Painel "Máquina"** (`$I`/`$$`/`$#`/`$G`/`$N` → fatos + diagnóstico copiável) — M14/RF-MAQ-1…8, `PLANO_MAQUINA.md` | M | Firmware, curso, limites, laser e offsets visíveis (com "não informado" quando faltar); "copiar diagnóstico" sem rede. |
| ✅ P0.8 | **Pré-voo MX-1…MX-15** antes de gravar + chip de pinos (`Pn`) | M | Cada regra com teste + fixture real (Sculpfun C1); `block` só no que o GRBL rejeita ou queima errado. |
| P2.7 | **Gerador de QR Code** (Ferramentas) — *S1* | M | Conteúdo → matriz ISO/IEC 18004 → G-code; ECC L/M/Q/H, dimensões em mm, quiet zone, preview, salvar/gravar. |
| P2.8 | **Gerador de código de barras** (Ferramentas) — *S2* | M | Code 128/39, EAN-13/8, UPC-A com dígito verificador, quiet zone e **HRI**. |
| — | **Avisos de legibilidade** (módulo × spot do laser) e de área de trabalho — *S1* | S | Aviso com sugestão quando o símbolo não é legível/grava fora da área. |
| — | **Fase 7 restante**: acessibilidade (WCAG AA), estados vazios/loading e checklist visual (`DESIGN.md` §8) | M | Checklist fechado; foco visível, contraste e reduced-motion ok. |
| — | **Fase 8 restante**: cobertura de protocolo > 80 % e testes em hardware | M | Relatório de teste em máquina real (C1) anexado à release. |

### v0.7 — Paridade de produção

**Objetivo:** fechar o que hoje *trava o uso* e nos separa do LightBurn/Rayforge.

> **Já entregue na 0.7.0:** as **simbologias extras** da S2/S3 (ITF-14, Codabar,
> Code 93, GS1-128 e **Data Matrix ECC200**), `Prefs.symbols`, o **tour de
> boas-vindas** (P0.4), o **E2E de job por PTY** (P0.2), **fuzz + cobertura
> ≥ 90 %** (P0.6), o **benchmark Linux** (P0.1) e o **catálogo de perfis de
> máquina** (RF-MAQ-10). A **simulação de job (P2.3)** já existia desde a
> **0.5.0**; na **0.8.0**, **P2.2** (camadas/multi-operação). Os demais itens
> abaixo continuam abertos.

| # | Entregável | Esf. | DoD |
| :-- | :-- | :-- | :-- |
| ✅ P2.2 | **Camadas / multi-operação** (parâmetros por camada) — entregue na **0.8.0** | M | Gravar + cortar numa execução; reordenar arrastando; `M5` e troca de potência corretos. |
| ✅ P2.3 | **Simulação de job** (playback + tempo) — entregue na **0.5.0** | M | Play/pause/seek na velocidade real; reusa o preview. |
| P2.4 | **Importação DXF + PDF** | M | Reusa `shared/svg.ts`/contornos; testado com arquivos reais. |
| ✅ P2.5 | **Catálogo 30+ máquinas** + **import `.lbdev`** + **smart connect** — entregue (30 perfis, importação e sugestão na conexão) | S | Ao conectar, ler `$$` e sugerir o perfil; importar perfil do LightBurn. |
| ✅ P1.10 | **Editor de G-code** (realce + numeração + edição + validar + reenviar trecho) — entregue | M | Editar, validar e reenviar trecho. |
| ✅ P2.9 | **Biblioteca de jobs** (miniatura + re-executar + duplicar) — entregue | S | Últimos 50 jobs persistidos com parâmetros. |
| ✅ P2.14 | **Clicar no preview para mover** (pendência da v0.3) — entregue | S | Clique → `G0` para o ponto (com confirmação). |
| — | **Validar Windows/macOS** em hardware real + assinatura de código | M | Relato/vídeo por SO; instalador sem aviso de "desenvolvedor desconhecido". |
| ✅ P3.7 | **Nesting** (encaixe por caixa: MaxRects com margem, espaçamento e rotação 90°) — entregue | M | Aproveitamento de chapa demonstrado. |

### v0.8 — Lote e produção em série

**Objetivo:** a cadeia que **nenhum concorrente grátis** faz ponta a ponta
(planilha → várias peças gravadas).

| # | Entregável | Esf. | DoD |
| :-- | :-- | :-- | :-- |
| ✅ P2.10 | **Lote / dados variáveis**: CSV/planilha → **fila de gravação** — entregue (RF-SYM-10, 20/10/2026) | M | Cada linha = 1 peça (QR/código de barras com modelo de campos `{1}`/`{nome}`/`{i:03}`), pausa para trocar a peça, contador e retomada. |
| ✅ P2.11 | **Modo produção**: repetir job N vezes, contador, trava de UI — entregue (RF-GC-12, 20/10/2026) | S | Ciclo contínuo seguro (pausa/emergência sempre acessíveis). |
| ✅ P2.12 | **Presets de material** (JSON import/export + dose) — entregue (RF-IMG-14, 20/10/2026) | S | Salvar/compartilhar receitas; repositório oficial depois. |
| ✅ P2.13 | **Teste de foco / spot** (2 linhas de potência) — entregue (RF-IMG-13, 20/10/2026) | S | Determinar o melhor foco por material. |
| ✅ | ~~**S3 opcional**: Data Matrix, PDF417, Aztec; ITF-14/Codabar/Code 93~~ → **Data Matrix + 1D extras entregues na 0.7.0; PDF417 + grade na 0.9.0; Aztec na 0.10.0** | M | Simbologias com testes vetoriais. |
| ✅ | **S3 opcional**: símbolo como **objeto no editor "Desenhar"** — entregue em 20/10/2026 | M | Gerar QR/barcode dentro do editor, com estilo e camada. |
| — | **Grade/lote de símbolos** (lista → grade com espaçamento) | S | N símbolos numa página, com réguas. | ✅ entregue (RF-SYM-9, 19/10/2026) |

### v0.9 — Extras + Pro features

**Entregue nesta versão:** **RF-SYM-9** (grade de símbolos a partir de uma
lista) e **RF-SYM-7** (**PDF417**: ISO/IEC 15438, Numeric/Byte, RS em GF(929),
validado por decodificação real com `@zxing/library`) — 16 testes novos +
E2E. Documentação em [`PLANO_QR_BARCODE.md`](PLANO_QR_BARCODE.md) §18.

**Objetivo seguinte:** paridade com LightBurn/Rayforge.

| # | Entregável | Esf. | DoD |
| :-- | :-- | :-- | :-- |
| P3.1 | **Câmera** (captura USB + alinhamento visual) | L | Overlay da peça; posicionar arrastando. |
| P3.2 | **Rotativa (eixo A)** | L | Jog e job em cilindro; calibração por diâmetro. |
| P3.7 | **Nesting avançado** (encaixe real, peças irregulares) — o encaixe por caixa já está entregue | M | Aproveitamento de chapa melhor que o encaixe por caixa. |
| P3.4 | **Preview WebGL** (arquivos gigantes) | M | 14 M de linhas sem travar; fallback canvas. |
| P3.5 | **Telemetria opt-in** + crash reporting (Sentry/GlitchTip) | S | Diagnóstico de campo; nenhum dado sem consentimento. |
| P3.6 | **Migração do renderer para TS** (Svelte + electron-vite) | XL | ADR-2 concluído; `renderer.js` sai do repo; bundling instantâneo. |

### v1.0 — Ecossistema

| # | Entregável | Esf. | DoD |
| :-- | :-- | :-- | :-- |
| P4.1 | **API REST/WebSocket + CLI headless** | L | Automatizar lote, Raspberry Pi, integração (paridade LightBurn 2.2 REST / Rayforge CLI). |
| P3.3 | **Sistema de plugins/scripts** (generaliza macros) | L | API documentada + 3 exemplos. |
| P4.2 | **i18n fr/de (+ it/ru)** | M | Paridade garantida por type-check. |
| P4.3 | **Manual, vídeos e site** com comparativo e benchmarks | M | Publicados e linkados no app. |
| P4.4 | **Integração com Inkscape** (watch/round-trip) | M | Salvar no Inkscape atualiza no app. |
| P4.5 | **Mobile companion** (status + pausa) | L | Cliente da API — **avaliar**; só se as fases anteriores estiverem verdes. |

---

## Placar de liderança (metas)

| Critério | Líder hoje | Nossa meta |
| :-- | :-- | :-- |
| Confiabilidade de protocolo (0 travamentos) | ninguém publica | **#1 absoluto** |
| Startup / RAM / FPS / DPI | ninguém publica | **#1 medido** |
| Pipeline de imagem (tempo por peça) | LaserGRBL / LightBurn | **#1** |
| Fluxo "abrir → gravar" | LightBurn | **#1 (≤ 3 cliques)** |
| Fabricação integrada (material test, QR, barcode, lote) | LightBurn / xTool | **#1 no segmento aberto** |
| Camadas · import vetorial · simulação | LightBurn / Rayforge | **empate no topo** |
| Câmera · rotativa · catálogo | LightBurn / Rayforge | **empate no topo (12 meses)** |
| Distribuição (instalar em 1 passo em qualquer SO) | LightBurn | **#1** |
| API/CLI/plugins | Rayforge / gSender | **empate no topo** |
| Preço e licença | empate (MIT) | **#1 (MIT, sem travas)** |
| Nuvem / AI / biblioteca de arte | xTool / Glowforge | **não competir** |

## Invariantes (nunca negociar)

1. **Nunca travar a máquina** (janela por bytes, tempo real correto, emergência sempre acessível).
2. **Nunca perder precisão** (0,001 mm, sem arredondar o G-code do usuário).
3. **Nunca mais de 3 cliques** (abrir → gerar → gravar) e interação ≤ 100 ms.
4. **Nada de amarras** (offline, sem conta, sem nuvem, sem limite, sem plano Pro, MIT, 3 SOs).
5. **Todo erro com causa + solução.**

## KPIs por release

| Métrica | Meta |
| :-- | :-- |
| Startup · RAM (10 min) · CPU ociosa | ≤ 1,5 s · ≤ 280 MB (X11) / 300 MB (Wayland) · ≈ 0 % |
| Resposta a interação · latência de status | ≤ 100 ms · ≤ 200 ms |
| FPS durante job · preview (50k linhas) | ≥ 55 · ≤ 2 s (1º) / ≤ 16 ms (job) |
| Tempo até o 1º job (usuário novo) | ≤ 5 min |
| Issues "travou a máquina" | 0 por release |
| Adoção · satisfação | +50 % downloads/release · NPS ≥ 50 |

## O que NÃO vamos fazer (por decisão)

Galvo/fibra/DSP (Ruida, Trocen, EZCAD, Epilog) · nuvem/AI/marketplace ·
assinatura/plano Pro · dialetos Marlin/LinuxCNC/Mach4 · app mobile próprio antes
da API. Justificativa: `PLANO_PREMIUM.md` §10.

---

## Próximos passos imediatos

Ver `PLANO_DE_ACAO.md` §1.1 (status) e `PLANO_PREMIUM.md` §8 (caminho crítico). Resumo:

1. **v0.6…v0.11 (entregues)** — P2.7/P2.8 (QR Code e código de barras 1D) na
   **0.6.0**; na **0.7.0**, P0.2 (E2E de job), P0.4 (onboarding), P0.6 (fuzz +
   cobertura), 1D extras + **Data Matrix** e o catálogo de perfis de máquina; na
   **0.8.0**, P0.7 (painel "Máquina"), P0.8 (pré-voo MX-1…MX-15) e **P2.2
   (camadas/multi-operação)**; na **0.9.0**, **RF-SYM-9** (grade de símbolos) e
   **PDF417**; na **0.10.0**, **Aztec**. Em 19–20/10/2026 entraram ainda **P2.9**
   (biblioteca de jobs), **P2.14** (mover pelo preview), **P2.10**
   (lote/dados variáveis), **P2.11** (modo produção), **P2.13** (teste de foco)
   e o **RNF-11** de RAM (269 MB em X11 / 290 MB em Wayland, medido); na
   **0.11.0**, **P2.12** (presets de material com dose e JSON) e o marco do
   **v0.8**; em 20/10/2026, o **símbolo como objeto** no editor “Desenhar”
   (última pendência de [`PLANO_QR_BARCODE.md`](PLANO_QR_BARCODE.md)).
   **Startup** segue acima do orçamento sob Xvfb/carga (1 779 ms de mediana no
   A/B; melhor par 1 337 ms contra ≤ 1 500 ms) — trabalho de performance aberto.
   Continuam abertos **P0.3** (publicar Flatpak + winget/brew/AUR) e **P0.5**
   (comparativo público).
2. **v0.7 (restante)** — **catálogo 30+ + `.lbdev` + smart connect (P2.5) ✅**,
   **editor de G-code (P1.10) ✅**, **biblioteca de jobs (P2.9) ✅**; resta a
   validação Win/macOS.
3. **v0.8 fechado** — ✅ **v0.11.0** publicada em 20/10/2026: lote/dados
   variáveis (P2.10), modo produção (P2.11), presets de material (P2.12) e
   teste de foco (P2.13).
4. **v0.9/v1.0** — câmera, rotativa, nesting, API/CLI, plugins e migração do
   renderer para TypeScript.
5. **Candidatos novos do Anexo** — ✅ **abas, sobre-corte e custo por peça**
   (v0.14.0), **tiling** (v0.15.0) e **marcas de registro** (v0.16.0) e **gravar dos dois lados** (v0.17.0); seguem
   abertos geradores e o kit de segurança/monitor; versões e esforço
   **propostos** na tabela do Anexo, a ratificar antes de virar compromisso.

> **Nota (17/10/2026):** as pendências pontuais de status/jog/console e o log
> persistente de sessão (RNF-9) foram concluídos — ver `CHANGELOG.md` e
> `PLANO_DE_ACAO.md` §1.1.

---

## Anexo — glossário em linguagem simples (o que é · onde usa · onde entra)

> Adicionado em 18/10/2026. Explica **sem jargão** cada recurso do roadmap.
> A coluna **Onde entra** aponta para o item já planejado (`P…`), para o que já
> está **✅ entregue**, ou marca **⬜ novo** — e, no caso dos novos, a versão
> sugerida na tabela do fim (§Anexo B). O anexo **não muda sozinho** o escopo nem
> a ordem das versões acima: é insumo para priorizar.

### Anexo A — o que é e onde usa

**A. Receitas de material e testes**

| # | Item | O que é | Onde usa | Onde entra |
| :-- | :-- | :-- | :-- | :-- |
| 1 | **Receita de material (preset)** | "Receita de bolo" salva: potência, velocidade e passadas que deram certo. | Acertou o MDF 3 mm uma vez → repete sem testar de novo. | ✅ `P2.12` (RF-IMG-14) |
| 2 | **Dose (energia por área)** | Quanto "calor" o laser entrega por pedacinho — como temperatura × tempo de forno. | Levar uma receita de uma máquina para outra. | ✅ `P2.12` (RF-IMG-14) |
| 3 | **Grade de teste de material** | Tabela gravada com vários quadradinhos de potência/velocidade. | Material novo, sem receita → escolher o melhor quadradinho. | ✅ entregue (P1.7) |
| 4 | **Tira de teste de código** | O mesmo código de barras/QR em tamanhos diferentes. | Descobrir o menor código que o leitor lê naquele material. | ⬜ novo |
| 5 | **Kit de foco / rampa** | Teste para achar a altura do foco. | Laser sem auto-foco, ajustar na mão. | ✅ `P2.13` (escada de Z) |

**B. Produção em série (quem vende)**

| # | Item | O que é | Onde usa | Onde entra |
| :-- | :-- | :-- | :-- | :-- |
| 6 | **Número de série / contador** | Número diferente em cada peça (001, 002…). | Peça numerada, controle de lote. | ✅ `P2.10` |
| 7 | **Dados variáveis (lista/planilha)** | Lê uma lista (CSV) e grava um valor diferente por peça. | 50 chaveiros com nomes distintos. | ✅ `P2.10` |
| 8 | **Nesting** | Arrumar as peças na chapa pra caber mais e sobrar menos. | Cortar muitas pecinhas sem desperdiçar. | ✅ `P3.7` (encaixe por caixa) |
| 9 | **Abas de retenção** | "Pestanhas" que seguram a peça pra ela não cair/voar. | Peça pequena que se solta no meio do corte. | ⬜ novo |
| 10 | **Kerf / folga de corte** | Compensar a largura que o laser come. | Encaixe de caixa, inlay, peça que entra noutra. | ✅ `RF-DSN-17` |
| 11 | **Entrada/saída do corte** | Ajustar onde o corte entra/sai e refazer o canto. | Canto limpo, sem "bico" queimado. | ⬜ novo |
| 12 | **Custo e tempo por peça** | Quanto tempo leva e quanto custou (luz, material). | Dar orçamento pro cliente. | tempo ✅ · custo ⬜ novo |
| 13 | **Fila / agenda de trabalhos** | Vários trabalhos enfileirados, rodando em sequência. | Programar a noite inteira de gravação. | `P2.9`/`P2.11` · agenda ⬜ novo |

**C. Posicionar e repetir na peça**

| # | Item | O que é | Onde usa | Onde entra |
| :-- | :-- | :-- | :-- | :-- |
| 14 | **Tiling (maior que a mesa)** | Dividir o desenho grande e mover a peça entre as partes. | Placa/quadro grande num laser pequeno. | ⬜ novo |
| 15 | **Marcas de registro** | Marquinhas nas bordas pra alinhar a peça sempre igual. | Alinhar a 2ª peça ou virar a peça. | ⬜ novo |
| 16 | **Gravar dos dois lados** | Um lado, vira, e o outro bem alinhado. | Placa com arte dos dois lados. | ✅ `RF-DSN-23` (0.17.0) |
| 17 | **Gravar em peça já pronta** | Gravar em cima de algo comprado, no lugar exato. | Logo em caneca/placa/troféu prontos. | ⬜ novo |
| 18 | **Gabarito (jig / molde)** | Molde do formato da peça pra encaixar sempre no mesmo ponto. | Repetir 100 peças iguais no mesmo lugar. | ⬜ novo |
| 19 | **Imprimir e cortar (print-and-cut)** | Imprime colorido e o laser recorta o contorno. | Adesivo/cartão impresso + recorte. | ⬜ novo |
| 20 | **Câmera (posicionar vendo)** | Câmera na mesa pra arrastar o desenho sobre a peça. | Não errar o lugar numa peça existente. | `P3.1` |

**D. Ficar de olho e segurança**

| # | Item | O que é | Onde usa | Onde entra |
| :-- | :-- | :-- | :-- | :-- |
| 21 | **Ver de longe** | Acompanhar o trabalho por celular/outro PC. | Sair de perto e saber se está tudo bem. | `P4.5` (avaliar) |
| 22 | **Webcam + aviso de término** | Câmera ao vivo e mensagem quando acaba. | Fazer outra coisa enquanto grava. | ⬜ novo |
| 23 | **Parar de longe** | Botão de parar no celular. | Ver fumaça de longe e parar na hora. | ⬜ novo |
| 24 | **Sensor de chama/fumaça + trava** | Pausa sozinho se pegar fogo ou abrir a tampa. | Segurança: não queimar a oficina. | ⬜ novo |
| 25 | **Retomar depois de queda** | Continuar se faltar luz ou cair o USB. | Trabalho longo que morreu no meio. | ✅ parcial (job resume) |
| 26 | **Ventilação/exaustão** | Ligar e regular o exaustor junto com a máquina. | Ambiente fechado e cheio de fumaça. | ⬜ novo |

**E. Superfície e profundidade**

| # | Item | O que é | Onde usa | Onde entra |
| :-- | :-- | :-- | :-- | :-- |
| 27 | **Foco automático / rampa** | A máquina acha a altura certa do foco. | Maioria dos lasers não tem auto-foco. | `P2.13` (parcial) |
| 28 | **Mapa de altura** | Mede a superfície e ajusta o foco ponto a ponto. | Madeira empenada, placa irregular. | ⬜ novo |
| 29 | **LiDAR** | Sensor que "escaneia" a superfície pra medir altura. | O mesmo do mapa de altura, só que rápido. | ⬜ novo |
| 30 | **Relevo (profundidade / 3D)** | Variar a potência pra afundar mais/menos e criar relevo. | Foto/desenho em pedra, madeira, relevo. | ⬜ novo |
| 31 | **Rotativa (eixo que gira)** | Acessório que gira o objeto pra gravar em volta. | Caneca, copo, anel, garrafa. | `P3.2` |
| 32 | **Compensação cônica** | Ajustar quando o objeto afina na ponta. | Copo cônico, taça, cone. | ⬜ novo |
| 33 | **Desdobrar arte em cilindro** | "Abrir" o desenho pra caber na volta do copo. | Gravar em volta sem rotativa. | ⬜ novo |

**F. Fazer o desenho (arte)**

| # | Item | O que é | Onde usa | Onde entra |
| :-- | :-- | :-- | :-- | :-- |
| 34 | **Vetorização (imagem → linha)** | Transforma foto/logo em linhas. | Logo em JPG → contorno de corte. | ✅ RF-IMG-6 |
| 35 | **Puxar o risco do meio (centerline)** | Tira só o "esqueleto" de um desenho grosso. | Letra/desenho de contorno → linha única. | ⬜ novo |
| 36 | **Texto em curva / arco** | Escrever acompanhando uma curva ou círculo. | Nome em volta de um selo, texto curvado. | ⬜ novo |
| 37 | **Preenchimentos e texturas** | Encher a área com linhas/ondas/pontos. | Textura numa área grande, em vez de sólido. | 🟡 parcial (hatch) |
| 38 | **Biblioteca de símbolos** | Setas, réguas, marcas e ícones prontos pra arrastar. | Não desenhar do zero no Inkscape. | ⬜ novo |
| 39 | **Geradores (caixas, engrenagens)** | Escolhe o tamanho e ele monta caixa com encaixe/engrenagem. | Caixa que fecha sozinha, engrenagem. | ⬜ novo |

**G. Arquivos e máquinas**

| # | Item | O que é | Onde usa | Onde entra |
| :-- | :-- | :-- | :-- | :-- |
| 40 | **Camadas / multi-operação** | Grupos de objetos, cada grupo com sua potência. | Gravar e cortar numa única rodada. | ✅ `P2.2` (0.8.0) |
| 41 | **Abrir arquivos de outros programas** | SVG, DXF, PDF, AI e os do LightBurn (`.lbrn2`). | Reaproveitar algo feito no Inkscape/AutoCAD. | `P2.4` · `P2.5` |
| 42 | **Perfil da máquina** | Cadastro da máquina (curso, potência) pra não reconfigurar. | Trocar de máquina ou ajudar outro modelo. | ✅ RF-MAQ-10 · catálogo `P2.5` |
| 43 | **Catálogo de materiais com avisos** | Lista de materiais com dica de segurança. | Saber se pode cortar certo plástico. | ⬜ novo |
| 44 | **Galvo / fibra / DSP** | Tipos de laser de indústria (metal, fibra). | **Não se aplica** ao laser de bancada (diodo). | ❌ fora de escopo |

**H. Bônus — os códigos que já grava**

| # | Item | O que é | Onde usa | Onde entra |
| :-- | :-- | :-- | :-- | :-- |
| 45 | **HRI** | Texto legível embaixo do código de barras. | Etiqueta que uma pessoa também lê. | ✅ RF-SYM-6 |
| 46 | **Quiet zone** | Margem em branco em volta do código. | Sem ela, o leitor não lê. | ✅ RF-SYM-2 |
| 47 | **X-dimension** | Largura da barrinha mais fina. | Dimensionar o código em mm. | ✅ RF-SYM-2/3 |
| 48 | **Data Matrix** | O quadradinho 2D (junto do QR). | Peça pequena, marcação industrial. | ✅ RF-SYM-7 (0.7.0) |
| 49 | **Versão/máscara do QR** | Quão grande e "denso" o QR fica. | Caber no espaço e ainda ler. | ✅ RF-SYM-1 |
| 50 | **PDF417** | Código 2D em barras empilhadas (etiquetas, notas). | Muita informação num espaço baixo e largo. | ✅ RF-SYM-7 (0.8.0) |

### Anexo B — candidatos novos (proposta, a ratificar)

> Só os itens marcados **⬜ novo** no Anexo A. Versão e esforço são **sugestões**
> (S/M/L conforme o topo deste arquivo); a ordem só vale depois de aceita.

| Item | Versão sugerida | Esf. | Resumo do critério (DoD) |
| :-- | :-- | :-- | :-- |
| Abas de retenção | v0.7 | S | ✅ RF-DSN-18 (0.14.0): N abas configuráveis por camada, laser desliga em cada uma. |
| Entrada/saída do corte | v0.7 | S | ✅ RF-DSN-19 (0.14.0): sobre-corte na emenda, sem ponto duplo de ignição. |
| Biblioteca de símbolos | v0.7 | S | Catálogo de ícones/formas arrastáveis, sem rede. |
| Custo por peça | v0.8 | S | ✅ RF-DSN-20 (0.14.0): tempo × tarifa/h + material × preço/m² no diálogo de tamanho. |
| Tira de teste de código | v0.8 | S | Mesmo símbolo em N tamanhos; registro do mínimo legível. |
| Geradores paramétricos | v0.8 | M | Caixa com encaixe + engrenagem (paramétrico, sem rede). |
| Catálogo de materiais com avisos | v0.8 | M | Material com notas de segurança e presets ligados. |
| Agenda / fila de trabalhos | v1.0 | S | Fila persistida rodando em sequência com emergência acessível. |
| Marcas de registro | v0.9 | S | ✅ RF-DSN-22 (0.16.0): L/cruzes em volta da arte + prévia do plano de tiles. |
| Tiling (maior que a mesa) | v0.9 | M | ✅ RF-DSN-21 (0.15.0): janelas com sobreposição, origem local e um arquivo por tile. |
| Gravar dos dois lados | v0.9 | M | ✅ RF-DSN-23 (0.17.0): lado B espelhado em torno do centro, mesmas marcas e mesma origem, dois arquivos. |
| Gravar em peça já pronta | v0.9 | S | Alinhar desenho ao alvo existente (fiducial/visão simples). |
| Gabarito (jig / molde) | v0.9 | S | Gerar molde de encaixe a partir da peça. |
| Imprimir e cortar | v0.9 | M | Corte sobre impresso com marcas de registro. |
| Centerline (imagem → linha única) | v0.9 | M | Traço do meio por esqueletização; teste com logos. |
| Texto em curva / arco | v0.9 | S | Texto ao longo de caminho/arco no editor 2D. |
| Mapa de altura | v0.9 | L | Correção de foco por superfície (entrada de altura). |
| Relevo (3D / depth map) | v0.9 | M | Potência por profundidade a partir de mapa de cinza. |
| Compensação cônica | v0.9 | S | Rotativa com diâmetro variável (taper). |
| Desdobrar arte em cilindro | v0.9 | M | Mapeamento arte → cilindro sem rotativa. |
| Webcam + aviso de término | v1.0 | S | Imagem ao vivo + notificação local (sem nuvem). |
| Parar de longe / emergência remota | v1.0 | S | Cliente local com emergência (usa a API, `P4.1`). |
| Sensor de chama/fumaça + trava | v1.0 | M | Entrada externa pausa o job; testado com simulador. |
| Ventilação/exaustão | v1.0 | S | Saída auxiliar ligada ao início/fim do job. |
| LiDAR de superfície | v1.0 | L | Varredura de altura (depende de hardware). |
| Foco automático / rampa automática | v1.0 | M | Rotina de rampa de foco medida na máquina. |

> **Nota de escopo:** itens ⬜ novos que exijam **hardware** (LiDAR, sensor de
> chama, exaustão, rotativa) entram como **integração opcional** — o app segue
> funcional sem eles. Nada aqui quebra os invariantes do topo (sem nuvem
> obrigatória, offline, ≤ 3 cliques no fluxo principal, emergência sempre
> acessível).
