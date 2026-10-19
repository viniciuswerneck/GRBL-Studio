# GRBL Studio - Roadmap

> **Atualizado em 18/10/2026 (v0.6.0).** Este arquivo é a **visão de execução por
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

---

## Estado atual (v0.6.0)

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
- [x] **Importação SVG** (P1.6) e **grade de teste de material** (P1.7).
- [x] **Builds Win/macOS/Linux no CI** (P1.1) + **auto-update** (P1.2).
- [x] 11 temas (Fluent), **i18n pt-BR/en/es** (746 chaves), Assistente (wizard),
      log de sessão.
- [x] **Ferramentas de símbolo**: **QR Code** (ISO/IEC 18004 próprio, ECC L/M/Q/H,
      tamanho alvo em mm) e **código de barras 1D** (Code 128, EAN-13/8, UPC-A,
      Code 39) com **HRI** e avisos de legibilidade — v0.6.0.
- [x] **Perfis de máquina como dado** (`src/shared/machines.ts`, RF-MAQ-10):
      curso, homing, `S-max`, módulo e potência de apontar por máquina;
      `scripts/probe-machine.mjs` e `grbl-send.mjs` para estudar a máquina real.
- [x] **505 testes** (Vitest, 29 arquivos) + E2E Playwright + smoke headless.

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
- [ ] Mover para a posição clicada no preview → **v0.7 (P2.14)**

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
> e os **avisos de legibilidade**. O que segue na tabela ainda está aberto — e a
> ordem dele é a ordem de execução.

| # | Entregável | Esf. | DoD |
| :-- | :-- | :-- | :-- |
| P0.1 | **Benchmark público** dos orçamentos (startup, RAM, FPS, DPI) | S | Medido em 3 SOs, tabela em `DEVELOPMENT.md` + badge no README. |
| P0.2 | **E2E de job/protocolo** (PTY/socat) no CI | M | Job completo com pausa/retomada/cancelamento/alarme verde no CI. |
| P0.3 | **Distribuição 1-clique**: Flatpak → Flathub, winget, brew, AUR (= P1.3) | M | `flatpak install` e `winget install` documentados; porta serial com permissão. |
| P0.4 | **Onboarding** de primeira execução (P1.4) | S | Tour de 5 passos: conectar → perfil → abrir → preview → gravar. |
| P0.5 | **Comparativo público** de mercado (tabela da §7.5) | S | Página no README/site com data e fontes. |
| P0.6 | **Cobertura do parser > 90 % + fuzz** do protocolo | M | Nenhum crash com entrada corrompida. |
| P0.7 | **Painel "Máquina"** (`$I`/`$$`/`$#`/`$G`/`$N` → fatos + diagnóstico copiável) — M14/RF-MAQ-1…8, `PLANO_MAQUINA.md` | M | Firmware, curso, limites, laser e offsets visíveis (com "não informado" quando faltar); "copiar diagnóstico" sem rede. |
| P0.8 | **Pré-voo MX-1…MX-15** antes de gravar + chip de pinos (`Pn`) | M | Cada regra com teste + fixture real (Sculpfun C1); `block` só no que o GRBL rejeita ou queima errado. |
| P2.7 | **Gerador de QR Code** (Ferramentas) — *S1* | M | Conteúdo → matriz ISO/IEC 18004 → G-code; ECC L/M/Q/H, dimensões em mm, quiet zone, preview, salvar/gravar. |
| P2.8 | **Gerador de código de barras** (Ferramentas) — *S2* | M | Code 128/39, EAN-13/8, UPC-A com dígito verificador, quiet zone e **HRI**. |
| — | **Avisos de legibilidade** (módulo × spot do laser) e de área de trabalho — *S1* | S | Aviso com sugestão quando o símbolo não é legível/grava fora da área. |
| — | **Fase 7 restante**: acessibilidade (WCAG AA), estados vazios/loading e checklist visual (`DESIGN.md` §8) | M | Checklist fechado; foco visível, contraste e reduced-motion ok. |
| — | **Fase 8 restante**: cobertura de protocolo > 80 % e testes em hardware | M | Relatório de teste em máquina real (C1) anexado à release. |

### v0.7 — Paridade de produção

**Objetivo:** fechar o que hoje *trava o uso* e nos separa do LightBurn/Rayforge.

| # | Entregável | Esf. | DoD |
| :-- | :-- | :-- | :-- |
| P2.2 | **Camadas / multi-operação** (parâmetros por camada) | M | Gravar + cortar numa execução; reordenar arrastando; `M5` e troca de potência corretos. |
| P2.3 | **Simulação de job** (playback + tempo) | M | Play/pause/seek na velocidade real; reusa o preview. |
| P2.4 | **Importação DXF + PDF** | M | Reusa `shared/svg.ts`/contornos; testado com arquivos reais. |
| P2.5 | **Catálogo 30+ máquinas** + **import `.lbdev`** + **smart connect** | S | Ao conectar, ler `$$` e sugerir o perfil; importar perfil do LightBurn. |
| P1.10 | **Editor de G-code** (syntax highlight + numeração + reenvio) | M | Editar, validar e reenviar trecho. |
| P2.9 | **Biblioteca de jobs** (miniatura + re-executar + duplicar) | S | Últimos 50 jobs persistidos com parâmetros. |
| P2.14 | **Clicar no preview para mover** (pendência da v0.3) | S | Clique → `G0` para o ponto (com confirmação). |
| — | **Validar Windows/macOS** em hardware real + assinatura de código | M | Relato/vídeo por SO; instalador sem aviso de "desenvolvedor desconhecido". |
| — | **Nesting simples** (encaixe por caixa, reusa matriz/booleanas) | M | Aproveitamento de chapa demonstrado. |

### v0.8 — Lote e produção em série

**Objetivo:** a cadeia que **nenhum concorrente grátis** faz ponta a ponta
(planilha → várias peças gravadas).

| # | Entregável | Esf. | DoD |
| :-- | :-- | :-- | :-- |
| P2.10 | **Lote / dados variáveis**: CSV/planilha → **fila de gravação** | M | Cada linha = 1 peça (QR/código de barras/texto variável), pausa para trocar a peça, contador e retomada. |
| P2.11 | **Modo produção**: repetir job N vezes, contador, trava de UI | S | Ciclo contínuo seguro (pausa/emergência sempre acessíveis). |
| P2.12 | **Galeria de presets de material** (JSON import/export + repo oficial) | S | Baixar/compartilhar perfis. |
| P2.13 | **Teste de foco / spot** (2 linhas de potência) | S | Determinar o melhor foco por material. |
| — | **S3 opcional**: Data Matrix, PDF417, Aztec; ITF-14/Codabar/Code 93 | M | Simbologias com testes vetoriais. |
| — | **S3 opcional**: símbolo como **objeto no editor "Desenhar"** | M | Gerar QR/barcode dentro do editor, com estilo e camada. |
| — | **Grade/lote de símbolos** (lista → grade com espaçamento) | S | N símbolos numa página, com réguas. |

### v0.9 — Pro features (paridade com LightBurn/Rayforge)

| # | Entregável | Esf. | DoD |
| :-- | :-- | :-- | :-- |
| P3.1 | **Câmera** (captura USB + alinhamento visual) | L | Overlay da peça; posicionar arrastando. |
| P3.2 | **Rotativa (eixo A)** | L | Jog e job em cilindro; calibração por diâmetro. |
| P3.7 | **Nesting avançado** (encaixe real) | M | Aproveitamento de chapa melhor que o encaixe por caixa. |
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
| Startup · RAM (10 min) · CPU ociosa | ≤ 1,5 s · ≤ 200 MB · ≈ 0 % |
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

1. **v0.6 (agora)** — P0.1 benchmark, P0.2 E2E de job, P0.3 Flatpak/winget/brew/AUR,
   P0.4 onboarding, P0.5 comparativo, P0.6 fuzz, **P0.7 painel "Máquina" e P0.8
   pré-voo MX-1…MX-15** — ver [`PLANO_MAQUINA.md`](PLANO_MAQUINA.md); e **QR Code
   (S1) → código de barras (S2)** — ver
   [`PLANO_QR_BARCODE.md`](PLANO_QR_BARCODE.md).
2. **v0.7** — camadas/multi-operação, simulação, DXF/PDF, catálogo 30+ + `.lbdev`,
   editor de G-code, biblioteca de jobs e validação Win/macOS.
3. **v0.8** — lote/dados variáveis, modo produção, presets de material e
   simbologias extras.
4. **v0.9/v1.0** — câmera, rotativa, nesting, API/CLI, plugins e migração do
   renderer para TypeScript.

> **Nota (17/10/2026):** as pendências pontuais de status/jog/console e o log
> persistente de sessão (RNF-9) foram concluídos — ver `CHANGELOG.md` e
> `PLANO_DE_ACAO.md` §1.1.
