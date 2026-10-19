# Handoff — retomada do trabalho (desenho → G-code)

**Data:** 2026-10-18
**Branch:** `main`
**Estado:** código pronto, testado e commitado. A **v0.8.0** (performance,
painel "Máquina", pré-voo e Code 93 Full ASCII) está **publicada** — ver §10.
A v0.6.0 (símbolos) e a v0.7.0 (1D extras + Data Matrix + onboarding) também
estão publicadas — ver §8 e §9.

---

## 1. O que foi resolvido nesta sessão

Queixa do usuário: ao gerar o G-code de um desenho (2 × 2 no meio de uma
página 10 × 10), o preview mostrava uma **diagonal** que parecia ser gravada, e
o desenho "gerava o 10 × 10". Depois, o pedido ficou explícito:

> "por questões de alinhamento de onde vou gravar, coloco o objeto, posiciono o
> laser e ele não pode deslocar" / "começa a gravar em X0 Y0, sem deslocar a
> gravadora".

### Correções aplicadas

1. **Arte ancorada na origem (o principal)** — `src/shared/design.ts`
   O G-code era emitido em **coordenadas absolutas da prancheta** (um 2 × 2 no
   meio de uma página 10 × 10 saía em `X4/Y4`), então a máquina saía andando em
   diagonal até o desenho antes de queimar. Agora o **canto inferior esquerdo do
   desenho vira `X0 Y0`**:
   - `machineX = pageX − minX`
   - `machineY = maxY − pageY` (de pé, sem espelhar)
   A posição do objeto na prancheta não desloca mais o job. O usuário posiciona
   o laser no material, **define a origem ali** (`G10 L20`/`G92`) e o job começa
   sob o cabeçote.
2. **Início pelo canto mais próximo** — `src/shared/design.ts`
   Cada contorno começa no ponto mais próximo do cabeçote (contorno anterior
   termina onde o próximo começa); formas abertas podem inverter o sentido.
   Assim o primeiro `G0` aponta para o próprio `X0 Y0` (zero deslocamento).
3. **Preview pintava o `G0` como queima** — `public/renderer.js`
   `drawGcodePreview` lia `prog.burns` (campo inexistente) e caía em `moves`,
   pintando **todos** os `G0` na cor de queima. O `G0 X0 Y0` final herdava o `S`
   do último `M4` e virava uma **diagonal azul viva**. Agora usa só
   `previewProgram.burns`.
4. **Legenda do preview** — `public/index.html` + `public/style.css` + i18n
   A caixa tracejada da área de trabalho ($130/$131) ganhou a entrada
   **"Área de trabalho"** (pt/en/es) para não ser confundida com o job.
5. **Rodapé do editor** — i18n (`design.status.hint`): avisa que a gravação
   começa em X0 Y0 e que se deve posicionar o laser e definir a origem.

### G-code resultante (2 × 2 no meio de uma página 10 × 10)

```
G21
G90
G94
M5
G0 X0.000 Y0.000 F3000   ; zero deslocamento (laser DESLIGADO)
M4 S800
G1 X0.000 Y2.000 F1000
G1 X2.000 Y2.000 F1000
G1 X2.000 Y0.000 F1000
G1 X0.000 Y0.000 F1000   ; fecha o quadrado
M5
M5
G0 X0 Y0
```

---

## 2. Como retomar (após reiniciar o computador)

```bash
cd "/home/vinicius/dev/app/GRBL Studio"
npm install                    # só se node_modules não existir
npm run build                  # OBRIGATÓRIO: regenera dist/ e os bundles public/*.js
npx electron --no-sandbox .    # abre o app
```

> ⚠️ `npm start` **falha nesta máquina** (o `chrome-sandbox` do Electron não está
> com owner/mode `4755`) e aborta com `SIGTRAP`. Use sempre `--no-sandbox`
> (ou `npm run start:dev`, que faz build + abre).

> ⚠️ `public/design.js` e `public/i18n.js` são **gerados e gitignored**. Eles não
> vêm no `git clone`/checkout — por isso o `npm run build` é obrigatório.
> `public/renderer.js` **é fonte** (rastreado) e não precisa ser gerado.

---

## 3. Qualidade (rodado e verde)

- `npm run typecheck` ✅
- `npm test` ✅ **371 testes** (25 arquivos), inclui o novo teste de ancoragem em
  `tests/design.test.ts` *(contagem da sessão de desenho; na **v0.8.0** a suíte
  está em **715 testes / 41 arquivos**)*
- `npx biome check <arquivos alterados>` ✅
- `npx biome check .` tem **2 erros de formatação pré-existentes**
  (`public/renderer.js` e `public/style.css`) — já estavam no `HEAD`, não são
  deste trabalho.

---

## 4. Teste manual sugerido

1. Abrir **Desenhar**, desenhar um quadrado em qualquer lugar da prancheta.
2. **Gerar e visualizar** → o preview deve mostrar **só o quadrado**, começando
   em X0 Y0, **sem diagonal**.
3. Opcional: **Salvar** o `.gcode` e conferir que começa em `G0 X0 Y0` e que só
   há `G1` do próprio desenho.

---

## 5. Decisões em aberto / próximos passos

- [x] Validar na máquina real: posicionar o laser, **Definir origem** e gravar
      — confirmar que o cabeçote não se desloca antes de queimar.
      *(validado pelo usuário: “funciona bem, acabei de gravar para testar”)*
- [x] Confirmar se a **ancoragem na origem** é o comportamento definitivo.
      *(confirmada na v0.5.1; a alternativa de coordenadas absolutas foi
      descartada — `git log` tem a versão anterior se for preciso)*
- [x] Documentar a decisão de forma permanente em `docs/PRODUCT_SPEC.md`/
      `docs/DESIGN.md` (requisito `RF-DSN-*`), já que hoje o comportamento não
      está especificado. *(feito: módulo **M13 — Editor vetorial** com
      **RF-DSN-9** e nota de ancoragem em `DESIGN.md`)*

---

## 6. Arquivos deste trabalho

- `src/shared/design.ts`
- `public/renderer.js`
- `public/index.html`
- `public/style.css`
- `src/shared/i18n/pt-BR.ts`, `src/shared/i18n/en.ts`, `src/shared/i18n/es.ts`
- `tests/design.test.ts`
- `CHANGELOG.md`

> **Atualização (18/10/2026):** as alterações em `docs/ARCHITECTURE.md`,
> `docs/FEATURES_COMPARISON.md`, `docs/PLANO_PREMIUM.md`, `docs/PRODUCT_SPEC.md`,
> `docs/README.md`, `docs/ROADMAP.md` e o novo `docs/PLANO_QR_BARCODE.md`
> (plano de QR Code / código de barras) foram **commitadas** em
> `docs: planejamento dos geradores de QR Code e código de barras (v0.6)`. A
> ancoragem na origem foi especificada como **RF-DSN-9** (módulo M13) e o
> script `test:e2e` foi restaurado — ver `CHANGELOG.md` (`[Unreleased]`).

---

## 7. v0.6 S1 — gerador de QR Code (18/10/2026)

**Estado:** implementado, testado e na `main` (encoder próprio + ferramenta no
menu). Detalhes em `docs/PLANO_QR_BARCODE.md` §15; resumo para retomar rápido:

- **Ferramentas → QR Code…** (menu nativo → `MENU_ACTIONS.qrCode` → `#qrOverlay`).
  O fluxo é o das demais ferramentas: o modal só lê campos e chama o módulo puro
  (`window.GRBL_QR.qrToGcode`); o G-code entra em `applyJobLines` e o
  **posicionamento** (`openFrameModal`) abre para alinhar a origem.
- **Núcleo puro** em `src/shared/symbol/`: `qr.ts` (ISO/IEC 18004 completo, com
  `qr.tables.ts` **gerado** por `scripts/gen-qr-tables.mjs`), `mask.ts`
  (matriz → faixas/segmentos) e `gcode.ts` (`qrToGcode`, overscan, polaridade,
  avisos). Bundle gerado: `public/qrcode.js` (`npm run build:qrcode`).
- **Sem dependência de runtime** (ADR-11). `qrcode-generator` e `jsqr` são só
  `devDependencies`, usadas em `tests/symbol-qr.test.ts` (cross-check de matriz +
  decodificação real).
- **Pendências da v0.6:** S2 (código de barras 1D + HRI) — **fechada na §8** —
  e S3 (2D/lote/objeto no editor).
- **Validar com hardware:** gerar um QR de 0,5 mm em papel/madeira com
  velocidade baixa e ler com o celular; se sair claro demais, aumentar potência
  ou reduzir a velocidade (os avisos do modal já cobrem módulo pequeno/linhas
  insuficientes).

---

## 8. v0.6 S2 — código de barras 1D (18/10/2026)

**Estado:** implementado, testado e **publicado na v0.6.0** (commits `37d640b`
S2 + tamanho alvo do QR e `5d2dbc1` bump/tag; release com 6 artefatos).
Detalhes em `docs/PLANO_QR_BARCODE.md` §16; resumo para retomar rápido:

- **Ferramentas → Código de barras…** (`MENU_ACTIONS.barCode` → `#barcodeOverlay`
  → `window.GRBL_BARCODE.barcodeToGcode`). Simbologias: Code 128 (A/B/C com troca
  automática), EAN-13, EAN-8, UPC-A e Code 39 (razão 2:1/3:1, mod 43 opcional),
  com **HRI** desenhado pela fonte de traço único.
- **Encoders puros** em `src/shared/symbol/barcode/`: `code128.ts`, `ean.ts` e
  `code39.ts` sobre `tables.ts` **gerado** por `scripts/gen-barcode-tables.mjs`
  (a partir do `jsbarcode`, devDependency MIT). A fachada `encodeBarcode()`
  devolve `bars: { x, w }[]` em módulos, `totalModules`, `data` e `hri`.
- **Varredura vertical** (`barsToVerticalSegments` em `mask.ts`): as linhas
  correm **ao longo das barras**, com direção alternada. O G-code usa
  `presorted` (sem zigue-zague), overscan por **eixo** e filtro por comprimento
  real. O HRI sai abaixo das barras e o símbolo é deslocado para Y ≥ 0.
- **Bundle gerado:** `public/barcode.js` (`npm run build:barcode`). Sem
  dependência de runtime (ADR-11); `jsbarcode` é só teste (cross-check).
- **Pendências seguintes (S3, v0.7):** Data Matrix/PDF417/Aztec, Code 93/GS1-128,
  o símbolo como **objeto** no editor "Desenhar"; ITF-14/Codabar da S2. (Data
  Matrix, 1D extras e a **grade** de símbolos já saíram.)
- **Validar com hardware:** gravar um Code 128 com X-dim 0,5 mm e ler com
  leitor/celular; se não ler, aumentar a quiet zone, a altura das barras ou o
  X-dimension (os avisos apontam qual).

---

## 9. v0.7.0 — símbolos extras, protocolo provado e onboarding (18/10/2026)

**Estado:** publicado — tag `v0.7.0` (commit do bump `e9acc4f` + `601449e` do
lint), release com os artefatos do CI. Resumo para retomar rápido:

- **Simbologias 1D extras:** ITF-14, Codabar, Code 93 e GS1-128 em
  `src/shared/symbol/barcode/` (tabelas em `tables.ts`, geradas por
  `scripts/gen-barcode-tables.mjs` a partir do `jsbarcode`, devDependency).
  Cross-check de módulos e verificadores (mod 10 GS1, C/K mod 47) em
  `tests/symbol-barcode-extra.test.ts`.
- **Data Matrix ECC200:** `src/shared/symbol/datamatrix.ts` (24 tamanhos
  quadrados, modo ASCII/Latin-1, RS GF(256) 0x12D, intercalação, Utah). O
  pipeline 2D é comum (`matrixToGcode` em `gcode.ts`) e o modal virou **Código
  2D** (`#qrSymbology` = `qr` | `datamatrix`). Testes decodificam com o
  `DataMatrixReader` do **ZXing** (`@zxing/library`, devDependency).
- **`Prefs.symbols`** com sanitização no main (só enums/números/booleanos;
  **o conteúdo nunca é persistido**).
- **Tour de boas-vindas** (P0.4): `TOUR_VERSION`/`TOUR_STEPS` no renderer,
  `#tourOverlay` no HTML, pref `onboarding` (versão vista) sanitizada.
- **P0.2:** `tests/job-integration.test.ts` + `tests/helpers/{grbl-emulator,pty}.ts`
  (job por PTY/socat, pausa/retomada/`0x18`/alarme/`error:9`).
- **P0.6:** `tests/protocol-fuzz.test.ts` (6.000 casos, semente fixa) e
  `vitest.config.ts` com 90 % global / 95 % em `protocol.ts`. O fuzz achou 5
  bugs reais de `NaN`/`Infinity`.
- **P0.1:** `scripts/bench.mjs` + `npm run bench` + `docs/BENCHMARK.md`.
  **Cuidado:** startup (≥ 1 827 ms) e RAM (PSS 227,3 MB) **não** atendem ao
  RNF-11 nesta máquina; CPU ociosa e latência estão dentro. Otimizar performance
  é o trabalho aberto mais importante antes de divulgar o benchmark.
- **Correções da revisão** (commit `804d0d6`/`6742d7d`): linha maior que o
  buffer RX aborta o job em vez de corromper; `error:`/`ALARM:` com "ok" não
  viram ACK; `splitLines` só quebra no `>` de status; consulta em fila é
  rejeitada no Play; `Esc`/`Ctrl+X` funcionam com o foco num campo; Code 39 avisa
  a conversão para maiúsculas.
- **Pendências:** PDF417/Aztec, DM retangular/C40/Base256/ECI, Code 93 Full
  ASCII, validação de AIs do GS1 e o símbolo como objeto no editor (§17 de
  `PLANO_QR_BARCODE.md`); P0.3/P0.5/P0.7/P0.8; e a performance do RNF-11. (A
  **grade** de símbolos, RF-SYM-9, saiu em 19/10/2026.)
- **Validar com hardware:** ler um Data Matrix e um ITF-14 gravados com o
  leitor/celular (o DM aceita só Latin-1 — travessão e emoji dão `bad-chars`).

## 10. v0.8.0 — performance, painel "Máquina", pré-voo e Code 93 Full ASCII (18/10/2026)

**Estado:** a publicar (bump `0.8.0`, tag e release com os artefatos do CI).
O que entrou desde a 0.7.0:

### Performance (RNF-11)

- `electron-updater` e `serialport` carregados **sob demanda** (≈110 ms e
  ≈33 ms + binding nativo fora do boot); splash adiado 400 ms e `show()` antes
  de criá-lo; bundles de QR/Data Matrix/código de barras (108 KB) e do editor
  vetorial (65 KB) sob demanda, com pré-aquecimento só dos símbolos em
  `requestIdleCallback` (2 s). Os 19 `<script>` viraram 9.
- **A/B intercalado (4 pares):** `ready-to-show` 1 500 → 1 314 ms (mediana),
  hook do main 694 → 546 ms, startup total 1 846 → 1 779 ms.
- Medição de 10 min (X11): startup 1 720,6 ms (⚠ acima de 1,5 s), RAM RSS
  826,7 MB / **PSS 366,3 MB** (❌ acima de 200 MB; o PSS agora inclui o processo
  GPU, por isso não é comparável ao 227,3 MB antigo), CPU ociosa 7,4 % de 1
  core no fim do dwell (❌; 0 % nos primeiros 20 s), latência p95 2,59 ms (✅).
  **Nada foi maquiado:** `docs/BENCHMARK.md` §1 e §6.3 têm os números e as
  ressalvas. FPS, latência de `?` e DPI continuam manuais.
- **Re-medição de 10 min (19/10, com linha do tempo e quebra por processo):**
  a CPU ociosa aos 10 min deu **0,00 %** (16 amostras consecutivas de 0 % entre
  2 e 10 min) e o perfil CDP do renderer confirmou 99,9 % idle — o 7,40 % de
  18/10 **não se reproduz**. O que existe é uma **cauda de aquecimento de ~90 s**
  (33 % → 18 % → 23 % → 1 % → 0 %) que a janela única de 5 s não mostrava.
  Startup 1 581,3 ms (carga 4,34) e PSS 298,8 MB na mesma corrida. Detalhes e a
  ressalva de que o valor antigo fica como **não reproduzido** (não como erro)
  em `docs/BENCHMARK.md` §6.4. FPS, latência de `?` e DPI continuam manuais.

### P0.7 — painel "Máquina"

- `MachineSnapshot` no main: `$I`, `$$`, `$#`, `$G` e `$N` em **série** via
  `query()` (janela de envio vazia); `$N` é opcional (`error:` → `[]`).
- `src/shared/machine.ts` (contrato + parsers puros) e `entry.machine.ts`
  (`GRBL_MACHINE`, carregado só ao abrir o painel).
- Painel em **Ferramentas → Máquina**: firmware/versão/build, curso e limites,
  laser, movimento, estado modal, offsets, sonda e blocos `$N`, com
  "não informado" onde o firmware não responde; diagnóstico **copiável** em
  `chave=valor`, sem caminhos de arquivo.
- **Incidente:** o primeiro `public/machine.js` foi gerado antes da lane de
  parsing, saiu com 1,7 KB e o painel quebrava com `parseFirmware is not a
  function`. Rebuild + **E2E novo com emulador TCP** (main → IPC → renderer)
  cobrem firmware, curso, offsets e relatório.

### P0.8 — pré-voo

- `src/shared/preflight.ts`: MX-1…MX-15 puras (sem texto de UI), com `block`
  só no que o GRBL rejeita (`error:10/17/22`) ou queima errado (S acima do
  teto, `Pn` ativo, primeiro corte sem `S`); `warn`/`info` para o resto.
- **Iniciar** roda as regras com os fatos da máquina (snapshot do painel,
  lido uma vez se não houver cache). Impedimento → overlay com severidade,
  detalhe, sugestão e **"Gravar assim mesmo"/"Cancelar"**; avisos/informações →
  chip `N aviso(s)` na aba Execução. Falha da checagem **não** impede o job.
- i18n pt/en/es (42 chaves por idioma, paridade por type-check); E2E: `G1` sem
  `F` bloqueia e a confirmação libera.

### Símbolos (S3)

- **Code 93 Full ASCII** (0–127 em pares de shift, C/K sobre os símbolos
  expandidos, cross-check com `jsbarcode`).
- **`validateGs1`** (AIs 00/01/02/10/11/13/15/17/20/21/30/37/240–242/250/251/
  400/410/412/414/422) — **opt-in**, o encoder não valida sozinho.

### Docs

- `docs/COMPARATIVO.md` (P0.5) + tabela curta e link nos três READMEs.

### Pendências

- PDF417/Aztec; Data Matrix C40/Base256/ECI; dicionário GS1 completo e ligar a
  validação à UI; P0.3 (Flatpak/winget/brew/AUR); câmera, rotativa, nesting,
  WebGL; validação em hardware Windows/macOS; FPS/DPI/`?` manuais.
- **Validar com hardware:** painel Máquina na COMGO Z1 (o emulador cobre o
  parsing, não o firmware real) e o pré-voo num job com `G1` sem `F` de
  propósito (deve bloquear, não enviar nada).
