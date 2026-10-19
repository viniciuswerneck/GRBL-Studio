# GRBL Studio — Plano: geradores de QR Code e de código de barras

> **Status: S1 (QR Code), S2 (código de barras 1D) e S3 parcial (1D extras +
> Data Matrix) implementadas** — S1/S2 publicadas na v0.6.0 e a continuação na
> v0.7.0 (18/10/2026). Ver §15 (S1), §16 (S2) e §17 (S2 restante + S3 parcial)
> para o que foi entregue, medido e o que ainda falta.
> Complementa `PLANO_DE_ACAO.md` (fases 0–8) e `PLANO_PREMIUM.md` (P1–P4).
> Requisitos propostos: **RF-SYM-1…RF-SYM-9** (`PRODUCT_SPEC.md` §6, módulo **M12**).
> Orçamentos aplicáveis: **RNF-11** (performance) e **RNF-12** (precisão).
> Criado em 18/10/2026.

---

## 1. Resposta curta

**Sim, é possível — e cabe no que já existe**, sem novo IPC, sem nova janela e
sem tocar no protocolo (a Fase 1 já está concluída, então o gate de fases não é
violado).

Hoje toda "ferramenta" do menu segue o mesmo padrão: o menu nativo emite
`evAction` → o renderer abre um **overlay modal** → um **módulo puro** em
`src/shared/` gera o G-code → o G-code entra no pipeline normal de job
(`applyJobLines` → preview → Play) ou é salvo (`file:save-gcode`). É exatamente
esse padrão que as duas ferramentas novas reaproveitam, igual à "Grade de teste
de material" (`shared/materialTest.ts`) e ao editor "Desenhar"
(`shared/design.ts`).

**Esforço estimado do MVP (QR + Code 128): ~2 dev-semanas.**

---

## 2. Escopo

### 2.1 Dentro do escopo

| # | Ferramenta | Efeito |
| :--- | :--- | :--- |
| A | **QR Code** | conteúdo livre (texto/URL) → matriz QR (ISO/IEC 18004) → G-code de gravação no pipeline normal. |
| B | **Código de barras 1D** | dado → barras (Code 128, EAN-13, EAN-8, UPC-A, Code 39) → G-code de gravação. |

Comum às duas: dimensionamento em mm, posição, parâmetros de gravação
(F/S/passadas/M3-M4), pré-visualização, avisos de legibilidade, salvar `.gcode`
ou gravar direto.

### 2.2 Fora do escopo (por ora)

- Ler/decodificar símbolos a partir de imagem (não é o objetivo do app).
- QR Micro / rMQR; Data Matrix / PDF417 / Aztec (fase S3, §10).
- Fluxo em lote (lista → grade de símbolos) — fase S3.
- Símbolo como **objeto vetorial** dentro do editor "Desenhar" (fase S3; ver §7.3).

---

## 3. Onde isso encaixa no estado atual

### 3.1 Padrão "ferramenta" já existente (será replicado)

| Passo | Onde |
| :--- | :--- |
| Item no menu **Ferramentas** | `src/main/menu.ts:90-102` |
| Ação tipada do renderer | `MENU_ACTIONS` em `src/shared/channels.ts:66-74` |
| Ponte preload | `onAction` em `src/preload/index.ts:128-129` |
| Dispatch | `window.grbl.onAction(...)` em `public/renderer.js:7935-7938` |
| Overlay modal | `public/index.html` (`#matTestOverlay` 887+, `#designOverlay` 1322+) |
| Abrir/fechar/ler opções/gerar/salvar | `public/renderer.js` (ex.: `openMatTestModal` 4591, `generateMatTest` 4622, `saveMatTest` 4638) |
| Entrega ao job | `applyJobLines(name, gcode, source)` — `public/renderer.js:5961` |
| Enquadrar/Gravar | `openFrameModal()` — `public/renderer.js:629` |
| Salvar arquivo | `window.grbl.saveGcode(...)` → `CHANNELS.fileSave` → `src/main/ipc.ts:411-435` |
| Módulo puro + bundle esbuild | `src/shared/*.ts` → `public/*.js` (`package.json:9-25`) |
| Testes puros | `tests/*.test.ts` (Vitest) |

### 3.2 Comparação competitiva (o que é "paridade")

| Produto | QR Code | Código de barras |
| :--- | :--- | :--- |
| **LaserGRBL** | ❌ Não possui ferramenta de geração. | ❌ Não possui. |
| **LightBurn** | ✅ (ferramenta "QR Code Creator"; substituída pelo "Bar Code" a partir da 1.7) | ✅ **Bar Code** (`Tools → Create Bar Code`) com muitas simbologias, via biblioteca **zint** (C). |
| **GRBL Studio (meta)** | ✅ ferramenta dedicada, 1 clique, integrada ao pipeline de preview/gravação. | ✅ Code 128 / EAN-13 / EAN-8 / UPC-A / Code 39 no MVP; 2D na fase S3. |

Ou seja: já superamos o LaserGRBL nesse ponto; em relação ao LightBurn,
buscamos **paridade no essencial** com o argumento de sempre — leve, nativo,
gratuito, pt-BR/en/es e sem sair do fluxo de gravação.

---

## 4. Arquitetura proposta

### 4.1 Módulos puros novos (`src/shared/symbol/`)

Segue a convenção já usada por `shared/image/*` (subpasta com módulos puros e
um bundler esbuild por entrada):

```
src/shared/symbol/
├── mask.ts          # máscara binária (QR) / barras (1D) → segmentos de varredura (puro)
├── gcode.ts         # símbolo + parâmetros → G-code GRBL (puro, sem DOM)
├── qr.ts            # encoder QR ISO/IEC 18004 → boolean[][] + metadados
├── barcode/
│   ├── tables.ts    # padrões L/G/R, caracteres Code 128/39, guardas EAN/UPC
│   ├── code128.ts   # Code 128 (A/B/C com troca automática) + checksum mod 103
│   ├── ean.ts       # EAN-13 / EAN-8 / UPC-A + checksum mod 10 + paridade
│   ├── code39.ts    # Code 39 (+ opção mod 43, ratio wide:narrow)
│   └── index.ts     # encodeBarcode(symbology, data) → { bars, hri, warnings }
└── entry.qr.ts / entry.barcode.ts   # entradas dos bundles (globals GRBL_QR / GRBL_BARCODE)
```

- `qr.ts` e `barcode/*` **não conhecem G-code**; devolvem geometria + avisos.
- `mask.ts` + `gcode.ts` são o núcleo compartilhado: transformam
  matriz/barras em segmentos e depois em G-code, aplicando os invariantes de
  segurança. Reaproveitam `zigzagHatch` de `src/shared/hatch.ts` e o
  `formatCoord`/invariante de área de `src/shared/image/format.ts`
  (`assertWorkArea`).
- Funções puras ⇒ testáveis sem hardware (RNF-5).

### 4.2 Bundles e build

```jsonc
// package.json (adicional aos scripts existentes)
"build:qrcode":  "esbuild src/shared/symbol/entry.qr.ts --bundle --format=iife --platform=browser --target=es2022 --global-name=GRBL_QR --outfile=public/qrcode.js",
"build:barcode": "esbuild src/shared/symbol/entry.barcode.ts --bundle --format=iife --platform=browser --target=es2022 --global-name=GRBL_BARCODE --outfile=public/barcode.js",
```

> `public/qrcode.js` e `public/barcode.js` são **gerados** — nunca editar
> (AGENTS.md). `public/index.html` e `public/renderer.js` são fonte.

### 4.3 UI (renderer)

Dois overlays em `public/index.html` (`#qrOverlay`, `#barcodeOverlay`), no mesmo
molde visual de `#matTestOverlay` (classes `overlay hidden` + `modal`, campos
com `data-i18n`), e a fiação correspondente em `public/renderer.js`
(`openQrModal` / `readQrOptions` / `generateQr` / `saveQr` e equivalentes).
Nada de lógica de símbolo na UI: ela só lê campos e chama o módulo puro.

---

## 5. O que precisa ser implementado nos encoders

### 5.1 QR Code (ISO/IEC 18004)

| Item | Detalhe |
| :--- | :--- |
| Modos | numérico, alfanumérico e **byte** (UTF-8), com auto-seleção pelo conteúdo. |
| Versões / ECC | 1–40 e L/M/Q/H; seleção automática da menor versão que caiba (ou versão fixa). |
| Correção de erro | Reed–Solomon em GF(256), polinômio primitivo `0x11D`; tabelas de blocos EC por versão/ECC; intercalação de blocos; *remainder bits*. |
| Estrutura | finder patterns + separadores, timing, alignment patterns (tabela por versão), *dark module*. |
| Máscara | 8 padrões + avaliação de penalidade (4 regras) por padrão; opção de máscara fixa (reprodutibilidade). |
| Metadados | formato BCH(15,5) XOR `0x5412`; versão BCH(18,6) `0x1F25` para v ≥ 7. |
| Saída | `boolean[][]` + `{ version, ecc, mask, modules, sizeMm }`. |
| Erros | conteúdo vazio; excede v40-H; caractere não representável. |

Volume: ~500–700 linhas de lógica + ~1.500 linhas de tabelas (blocos EC,
alignment, capacidades). É a parte mais "densa" do plano — e a que exige mais
teste (§9).

### 5.2 Código de barras 1D

| Simbologia | Regras | Check |
| :--- | :--- | :--- |
| **Code 128** | conjuntos A/B/C com troca automática (C para sequências de dígitos), start 103/104/105, stop 106 (13 módulos) | mod 103 |
| **EAN-13 / EAN-8** | padrões L/G/R, guardas 101 / 01010 / 101, tabelas de paridade, zonas de silêncio conforme a norma | mod 10 |
| **UPC-A** | derivado do EAN-13 com prefixo 0 (guardas e HRI próprios) | mod 10 |
| **Code 39** | 43 caracteres, `*` de start/stop, gap entre caracteres, ratio 2:1 ou 3:1 | opcional mod 43 |

Saída comum: `bars: { x, w }[]` em **unidades de módulo** (o chamador
converte para mm), `hri` (texto legível) e `warnings`. Validações: dígito
verificador (erro com *esperado × informado*), caracteres inválidos,
comprimento, X-dimension.

**Fase S2** acrescenta ITF-14 e Codabar; **S3** acrescenta Code 93 e GS1-128.

### 5.3 2D extra (fase S3, opcional)

Data Matrix ECC200 (reaproveita GF(256) do QR), PDF417 e Aztec. Sem
compromisso no MVP.

---

## 6. Do símbolo ao G-code (núcleo compartilhado)

`symbolToGcode(symbol, params)` — puro, sem DOM:

**Entrada**

- geometria: matriz binária (QR) **ou** lista de barras (1D);
- escala: `targetWidthMm`/`targetHeightMm` (tamanho **final** do símbolo, quiet
  zone inclusive — vence o resto), `moduleMm` / `xDimmMm`, `barHeightMm`,
  quiet zone;
- posição: `originX`, `originY`;
- gravação: `powerPercent`→`S`, `feed`, `passes`, `mode` (`M3`/`M4`), `sMax`;
- varredura: `linesPerMm` (padrão 10 = 0,1 mm), direção, `polarity`
  (escuro-sobre-claro / invertido), `overscanMm`, `minRunMm`.

**Estratégia de gravação (padrão `fill`)**

- varredura linha a linha: cada linha produz um segmento por trecho escuro
  contínuo (para o código de barras, cada segmento é uma barra);
- zigue-zague entre linhas (ida/volta) para reduzir `G0` — reusa
  `zigzagHatch` de `shared/hatch.ts`;
- passo de varredura recomendado ≥ 3–4 linhas por módulo (ou por barra
  estreita), para o módulo sair sólido e legível;
- **overscan** opcional (estende o traço além do segmento) para não queimar a
  borda quando a direção inverte — bem como a polaridade, é um refinamento que
  pode ficar para depois.

**Modos alternativos (fase S2/S3)**

- `outline`: contorno dos módulos escuros (marcação/corte, sem preencher);
- `dots`: um ponto no centro de cada módulo escuro (marcação rápida; avisar que
  exige tamanho de ponto compatível).

**Invariantes embutidos (AGENTS.md — não quebram)**

- `G21` / `G90` / `G94` no cabeçalho; `M5` inicial;
- **`M5` antes de todo `G0`** e `M5` no fim; `G0 X0 Y0` na cauda;
- `M3`/`M4 S<valor>` com `S ≤ sMax`;
- **nunca arredondar** coordenadas do símbolo — 3 decimais no texto, como
  `shared/materialTest.ts` (`toFixed(3)`), RNF-12;
- cabeçalho comentado (`;`) com tipo, conteúdo, versão/ECC, módulo/altura,
  dimensões e contagem de linhas;
- passes múltiplos marcados com `; pass N/M` (o preview colore por passada, RF-GC-6);
- o envio continua sendo o `GrblClient` com janela por bytes — o gerador só
  produz texto, não fala com a máquina (RNF-1).

**Avisos de legibilidade / segurança**

| Condição | Aviso |
| :--- | :--- |
| `moduleMm` (ou X-dim) < 2× o spot do laser (0,08 mm na COMGO Z1) | módulo pequeno demais para o ponto do laser. |
| `moduleMm` < ~0,3 mm (QR) / X-dim abaixo do mínimo da norma | risco de o leitor não conseguir ler. |
| símbolo (com quiet zone) fora da área de trabalho `$130`/`$131` | não cabe na área; reposicione/redimensione. |
| quiet zone reduzida abaixo do padrão | a leitura pode falhar. |
| largura ≠ altura (símbolo esticado num eixo) | o QR sai retangular: a leitura pode falhar. |
| alvo em mm esmagaria o módulo abaixo de 0,05 mm | o tamanho pedido é impossível: o módulo fica no mínimo e o símbolo maior que o alvo (o status mostra o tamanho real). |

**Orçamento (RNF-11)**

- codificar um QR típico: ≤ 5 ms; geração do G-code: ≤ 50 ms (limite de
  interação: 100 ms);
- tamanho do arquivo: um QR v3 com módulo de 0,5 mm (~15 mm) a 10 linhas/mm
  gera ~1.500 linhas; um QR grande (v10, 57 módulos, ~28 mm) fica na casa de
  ~10.000 linhas. Se algum caso passar de ~2 s (improvável), aí sim avaliar o
  worker (`src/renderer/gcode.worker.ts`) — não antes.

Exemplo de dimensionamento: módulo 0,5 mm → v3 (29 módulos) = **14,5 mm**;
módulo 1 mm → v10 (57 módulos) = **57 mm**.

---

## 7. UI, i18n e integração

### 7.1 Modal "QR Code…"

| Grupo | Campos |
| :--- | :--- |
| Conteúdo | `textarea` (texto/URL), contador de caracteres, ECC (L/M/Q/H, padrão **M**) |
| Tamanho | **largura × altura** finais em mm (quiet zone incluída); caixa "quadrado" copia a largura na altura; em branco, cai no lado do módulo (mm); quiet zone (4 módulos, exibida); posição X/Y |
| Gravação | potência (%), velocidade (mm/min), passadas, modo M3/M4 |
| Varredura | linhas/mm, direção, polaridade, overscan |
| Preview | `<canvas>` nítido em `devicePixelRatio` (RNF-12) desenhando a matriz e a grade |
| Rodapé | **Gerar e visualizar** · **Salvar .gcode…** |
| Status | versão, ECC, máscara, nº de módulos, dimensões (L × A mm), lado do módulo efetivo, avisos |

### 7.2 Modal "Código de barras…"

| Grupo | Campos |
| :--- | :--- |
| Tipo | Code 128 · EAN-13 · EAN-8 · UPC-A · Code 39 (dica de formato por tipo) |
| Conteúdo | dado (+ dígito verificador calculado/exibido) |
| Tamanho | X-dimension (mm), altura das barras (mm), quiet zone (padrão por norma, editável) |
| Texto (HRI) | mostrar texto sob as barras (fase S2) reusando `shared/fonts.ts` (traço único) |
| Gravação / Varredura | iguais ao QR |
| Preview | canvas com barras + cotas de largura/altura |
| Rodapé / Status | Gerar/Salvar · nº de barras, largura total, avisos |

Acessibilidade: foco visível, rótulos `data-i18n`, alvos ≥ 32 px, contraste AA
(RNF-13); sem atalho global novo (evita conflito com o console/prancheta).

### 7.3 Integração com o fluxo de job

1. `applyJobLines('qrcode.gcode' | 'barcode.gcode', gcode, 'qrcode' | 'barcode')`
   → preview, info do arquivo e **tempo estimado** (o pipeline já calcula).
2. `openFrameModal()` ganha um ramo para `jobSource` das novas ferramentas:
   sincroniza F/S/passadas com os campos do símbolo e, ao clicar **Gravar**,
   **regenera** o G-code com os valores do modal — exatamente como o editor
   "Desenhar" faz hoje (`dFrameParamsToDesign` em `renderer.js`).
3. Salvar: `window.grbl.saveGcode(...)` (canal `file:save-gcode`) — **sem IPC
   novo** (RNF-3, IPC mínimo).
4. Preferências: novo campo opcional `symbols?: { qr?, barcode? }` em `Prefs`
   (`src/shared/types.ts:243`) para lembrar a última configuração (RF-CFG-5).
5. Menu: item em `src/main/menu.ts` (§Ferramentas) + valor em `MENU_ACTIONS`
   (`src/shared/channels.ts`) + `else if` em `public/renderer.js:7935-7938`.
   ⚠️ `tests/i18n.test.ts` exige que **todo** `MENU_ACTIONS` seja tratado no
   renderer — o teste pega esquecimento.
6. Sinergia futura (S3): expor "símbolo" como **objeto** do editor "Desenhar",
   para compor com texto/formas/offset/booleanas.

### 7.4 i18n

Chaves novas nas **três** línguas (`pt-BR` é a fonte; `en`/`es` com `satisfies`
quebram o type-check se faltar):

- `menu.qrcode`, `menu.barcode`;
- `qr.*` (conteúdo, ECC, módulo, largura, quiet zone, avisos…);
- `bar.*` (tipo, X-dim, altura, HRI, checksum, avisos…).

Estimativa: 70–90 chaves por idioma.

---

## 8. Testes (o que garante que "escaneia de verdade")

Módulos puros ⇒ testes Vitest rápidos, sem hardware (RNF-5).

**QR**

- vetores canônicos (matriz completa) para v1, v2, v7, v10 e cada ECC;
- *cross-check* com implementação independente: **`qrcode-generator`** (MIT, sem
  dependências) como **devDependency** — compara a matriz para centenas de
  conteúdos/comprimentos/ECC. **Não** entra no bundle;
- **prova de leitura**: rasterizar a matriz e decodificar com **`jsqr`**
  (devDep, MIT) — inclusive testando a zona de silêncio;
- propriedades: capacidade por versão/ECC, seleção de versão, penalidade de
  máscara, formato/versão, erros de entrada.

**Código de barras**

- tabelas e checksums com exemplos da norma (Code 128 mod 103; EAN mod 10;
  Code 39 mod 43);
- *cross-check* com **`jsbarcode`** (MIT, 1D) para Code 128 / EAN-13 / Code 39
  comparando a sequência de larguras;
- guardas, quiet zones e erros de dígito/caractere.

**G-code (`mask.ts` + `gcode.ts`)**

- nenhum `S`/laser ligado em área clara ou na quiet zone;
- cobertura: os segmentos cobrem exatamente os módulos escuros (tolerância);
- invariantes: `G21/G90/G94`, `M5` antes de cada `G0`, `M5` final,
  `G0 X0 Y0`, `; pass N/M`, `S ≤ sMax`;
- precisão de 3 decimais; bounds = símbolo + quiet zone; avisos de área/spot.

**i18n / E2E**

- paridade das 3 línguas por type-check + `tests/i18n.test.ts`;
- E2E (Playwright, opcional na S2): menu → gerar → preview → salvar.

---

## 9. Documentação a atualizar (já feita / a manter)

| Documento | Mudança |
| :--- | :--- |
| `PRODUCT_SPEC.md` | ✅ novo módulo **M12** com RF-SYM-1…9; linha na matriz de paridade; critério de aceite global. |
| `FEATURES_COMPARISON.md` | ✅ seção **Ferramentas** com QR/código de barras (LaserGRBL ❌). |
| `PLANO_PREMIUM.md` | ✅ P2.7 (QR) e P2.8 (código de barras). |
| `docs/README.md` | ✅ este documento no índice. |
| `ARCHITECTURE.md` | ✅ subseção "Símbolos (QR / código de barras) — planejado". |
| `CHANGELOG.md` | *ao implementar* cada fase. |

---

## 10. Fases, esforço e Definition of Done

| Fase | Entregável | Esforço | DoD |
| :--- | :--- | :--- | :--- |
| **S1 — Fundação + QR** ✅ | `shared/symbol/{mask,gcode,qr,qr.tables}.ts` + bundle + modal QR + menu + i18n + testes (feito em 18/10/2026 — §15) | M–L (1,5–2 dev-semanas) | QR gerado em ≤ 3 cliques; matriz validada por cross-check e decodificada no teste; preview/Play/Salvar funcionando; avisos de legibilidade; orçamentos RNF-11/12 verificados. |
| **S2 — 1D + HRI** ✅ | Code 128, EAN-13/8, UPC-A, Code 39 (+ ITF-14, Codabar) + HRI (fonte single-stroke) + modal | M (1–1,5 dev-semanas) | Checksums corretos (testes da norma + cross-check); larguras de barra corretas; HRI opcional legível; E2E básico. **(feito — §16 e §17)** |
| **S3 — Extras** (parcial: 1D extras + Data Matrix ✅ + grade ✅) | Data Matrix/PDF417/Aztec; lista → grade (lote); símbolo como objeto no editor "Desenhar" | L (2–3 dev-semanas) | 2D decodificado em teste; lote com espaçamento e preview; símbolo editável/movível junto dos demais objetos. **Faltam:** PDF417/Aztec e símbolo como objeto. (A **grade** RF-SYM-9 saiu em 19/10/2026.) |

Sequência sugerida: **S1 → S2** (MVP útil: QR + Code 128/EAN) e só então S3.
As fases são independentes de P2.1 (design) e P3.x (câmera/rotativa), mas
compartilham `fonts.ts`/`hatch.ts` — sem conflito, sem tocar no protocolo.

---

## 11. Decisões (ratificadas e já aplicadas na S1)

| # | Decisão | Resultado |
| :--- | :--- | :--- |
| A | **Encoder próprio × dependência.** Usar biblioteca pronta (`qrcode-generator` p/ QR; `bwip-js`/`jsbarcode` p/ 1D) ou implementar? | **Implementar** os encoders no projeto e usar bibliotecas **apenas como devDependency nos testes** (cross-check + decodificação). Mantém runtime sem dependência nova (ADR-11/leveza), licenças limpas (MIT) e controle total da geometria/avisos. |
| B | **Escopo do MVP** | QR + **Code 128** (mais versátil) + **EAN-13/UPC-A** (produto) + **Code 39** (indústria). |
| C | **HRI** (texto legível sob o código de barras) | Fase **S2** (não trava o MVP, reusa `fonts.ts`). |
| D | **Overscan / polaridade** | Implementar já na S1, com padrão **desligado** (barato e evita retrabalho). |
| E | **Ponto de entrada** | 2 itens no menu **Ferramentas** (conforme pedido). Expor também como objeto no editor "Desenhar" fica para S3. |
| F | **Versões/ECC padrão do QR** | ECC **M**, versão automática, módulo **0,5 mm** como padrão inicial. |
| G | **Orientação da varredura 1D** | **Ao longo das barras (vertical)**, com direção alternada a cada linha. Cumpre "3–4 linhas por barra estreita" e reduz ~30× o número de segmentos em relação ao raster horizontal do plano (§6). Exige `presorted` no `symbolToGcode` (sem zigue-zague), filtro por **comprimento real** do segmento e overscan no **eixo do movimento**. |
| H | **Quiet zone 1D** | **Um valor único** para os dois lados, igual ao mínimo da norma (10 módulos Code 128/39, 11 EAN-13, 7 EAN-8, 9 UPC-A). Reduzir dispara o aviso `quiet-zone-small`. |
| I | **Dígito verificador** | O usuário pode informar o conteúdo **com ou sem** o verificador: com `n − 1` dígitos ele é calculado; com `n` é **conferido** e o erro diz *esperado × informado* (`check-digit`). |

---

## 12. Riscos e mitigação

| Risco | Prob. | Impacto | Mitigação |
| :--- | :--- | :--- | :--- |
| Erro sutil na RS/máscara do QR (código inválido, mas "com cara" de válido) | Média | Alto | Cross-check automatizado com referência independente + **decodificação real** (`jsqr`) nos testes. |
| Símbolo gravado fica ilegível na peça (módulo pequeno, queima nas bordas) | Média | Médio | Avisos de X-dimension/módulo × spot; presets de material; sugestão de 3–4 linhas por módulo; overscan opcional. |
| G-code muito grande em símbolo grande | Baixa | Baixo | Limites + aviso de tempo/linhas; worker só se necessário. |
| Escopo inflar (50 simbologias como o LightBurn) | Alta | Médio | Gate S1/S2/S3; MVP com 5 simbologias. |
| Licença de biblioteca usada em teste | Baixa | Baixo | Apenas MIT/Apache em devDependencies; nada em runtime. |
| Regressão de i18n (chave faltando em en/es) | Baixa | Baixo | `satisfies` + `tests/i18n.test.ts` quebram o build. |

---

## 13. Checklist de arquivos (implementação)

**Novos (S1 — feitos)**

- `src/shared/symbol/mask.ts`, `src/shared/symbol/gcode.ts`
- `src/shared/symbol/qr.ts`, `src/shared/symbol/qr.tables.ts` (gerado)
- `src/shared/symbol/entry.qr.ts`
- `scripts/gen-qr-tables.mjs` (gera `qr.tables.ts` a partir da referência)
- `tests/symbol-qr.test.ts`, `tests/symbol-gcode.test.ts`
- (gerado) `public/qrcode.js`

**Novos (S2/S3 — a fazer)**

- `src/shared/symbol/barcode/{tables,code128,ean,code39,index}.ts`
- `src/shared/symbol/entry.barcode.ts`
- `tests/symbol-barcode.test.ts`
- (gerado) `public/barcode.js`

**Alterados (S1 — feitos)**

- `package.json` (script `build:qrcode` + devDeps de teste `qrcode-generator`,
  `jsqr`), `package-lock.json`
- `src/main/menu.ts` (item "QR Code…" em Ferramentas)
- `src/shared/channels.ts` (`MENU_ACTIONS.qrCode`)
- `src/shared/i18n/{pt-BR,en,es}.ts` (namespace `qr.*`)
- `public/index.html` (`#qrOverlay` + `<script src="./qrcode.js">`)
- `public/style.css` (`.qr-modal`, `.qr-fields`)
- `public/renderer.js` (`openQrModal`/`readQrOptions`/`generateQr`/`saveQr`,
  dispatch do menu, overlay no Esc/clique-fora)
- `e2e/app.spec.ts` (teste do fluxo Ferramentas → QR Code…)
- `.gitignore` (`public/qrcode.js`)
- `CHANGELOG.md`, `docs/HANDOFF.md`, `AGENTS.md`, este documento

**A alterar na S2**: `src/shared/types.ts` (`Prefs.symbols?`) e os documentos de
produto (`PRODUCT_SPEC.md`, `FEATURES_COMPARISON.md`, `PLANO_PREMIUM.md`,
`docs/ARCHITECTURE.md`, `docs/README.md`).

---

## 14. Referências

- ISO/IEC 18004 — QR Code (modos, RS, máscaras, formato/versão).
- ISO/IEC 15417 — Code 128. · ISO/IEC 15420 — EAN/UPC.
- ISO/IEC 16388 — Code 39. · ISO/IEC 16022 — Data Matrix (fase S3).
- `docs/DESIGN.md` (Fluent/tokens), `docs/ARCHITECTURE.md` (módulos),
  `docs/PROTOCOL`/`AGENTS.md` (invariantes do GRBL).
- LightBurn — *Tools → Create Bar Code* (referência de UX; motor `zint`).
- Projeto interno: `src/shared/materialTest.ts` e `src/shared/design.ts`
  (modelos de "módulo puro → G-code") e `src/shared/hatch.ts` (varredura).

---

## 15. Estado da implementação — S1 (18/10/2026)

**Entregue e no `main` quando esta seção foi escrita** (bundle `GRBL_QR`):

| Camada | Arquivo | O que faz |
| :--- | :--- | :--- |
| Encoder | `src/shared/symbol/qr.ts` | ISO/IEC 18004 completo: modos numérico/alfanumérico/**byte UTF-8** (auto-seleção), v1–40, L/M/Q/H, RS sobre GF(256), máscaras 0–7 com penalidade da norma, informação de formato/versão (BCH). Erros tipados (`QrError`: `empty`/`too-long`/`bad-version`). |
| Tabelas | `src/shared/symbol/qr.tables.ts` | 160 linhas de blocos EC + 40 de *alignment patterns*, **geradas** por `scripts/gen-qr-tables.mjs` (proveniência no cabeçalho). |
| Geometria | `src/shared/symbol/mask.ts` | matriz → faixas; barras 1D → faixa (S2); varredura por linhas, inversão de polaridade, `bandsToScanSegments`. |
| G-code | `src/shared/symbol/gcode.ts` | `symbolToGcode` (zigue-zague + `M5` por trecho + passadas), `applyOverscan`, avisos, `qrToGcode` (fachada). |
| Bundle/UI | `entry.qr.ts` → `public/qrcode.js`; `#qrOverlay`; menu **Ferramentas → QR Code…** | Camuflagem padrão das ferramentas: modal → módulo puro → `applyJobLines` → preview/Play/Salvar + posicionamento. |

**Testes (todos verdes nesta data: 460 no total, 64 do símbolo)**

- `tests/symbol-qr.test.ts` — **cross-check de matriz** contra `qrcode-generator`
  (v1–v33, todos os níveis; a máscara é lida da informação de formato do símbolo
  de referência e reaplicada no nosso encoder) + **decodificação real** com
  `jsqr` (incluindo UTF-8/emoji, as 8 máscaras e v1–v40) + estrutura (finders,
  *timing*, alinhamento, módulo escuro, BCH) + erros e escolha de modo/versão.
- `tests/symbol-gcode.test.ts` — geometria, varredura, polaridade, invariantes de
  segurança (nunca `G0` com o laser armado), 3 casas, passadas, avisos de
  legibilidade e limites da área de trabalho.
- `e2e/app.spec.ts` — menu → modal → **gerar** → status com as dimensões →
  posicionamento aberto.

**Decisões confirmadas na prática**

- **A (encoder próprio)**: `qrcode-generator` e `jsqr` ficaram **só em
  `devDependencies`** (MIT); o bundle não leva dependência de runtime (33 kB,
  sem framework) — ADR-11 preservado.
- **D (overscan/polaridade)**: implementados com padrão **desligado**
  (`overscanMm: 0`, `invert: false`).
- **F**: ECC **M**, versão **automática**, módulo **0,5 mm**, quiet zone **4
  módulos**, **10 linhas/mm** (5 linhas por módulo — acima do mínimo de 3 que os
  avisos usam).

**Bug encontrado e corrigido no caminho:** a partir da versão 7 há *alignment
patterns* sobre a linha/coluna 6; desenhá-los **depois** do *timing* apagava
módulos de sincronismo e o símbolo **não lia**. A ordem correta (alinhamento →
*timing*) está travada por teste.

**Divergências do plano (de propósito):**

- Nomes alinhados nesta revisão: entrada `entry.qr.ts` e bundle
  `public/qrcode.js` / `build:qrcode` (o plano já os previa).
- `symbolWarnings()` devolve **códigos estáveis** (`module-small`,
  `module-tiny`, `quiet-zone-small`, `lines-too-few`, `outside-work-area`) — o
  renderer é quem traduz (`qr.warn.*`). Nada de texto de UI no módulo puro.
- Sem `Prefs.symbols` nesta fase: os campos do modal já têm os padrões certos;
  persistir preferências fica na S2, junto com a segunda ferramenta.

**Próximo passo (S2):** `symbol/barcode/` (Code 128, EAN-13/8, UPC-A, Code 39),
HRI com `fonts.ts`, modal `#barcodeOverlay`, `build:barcode` e o item de menu
correspondente — sem tocar no núcleo (`mask.ts`/`gcode.ts`) já pronto.

---

## 16. Estado da implementação — S2 (código de barras 1D, 18/10/2026)

**Entregue** (bundle `GRBL_BARCODE`, menu **Ferramentas → Código de barras…**),
e **publicada na v0.6.0** junto com a S1:
Code 128 (A/B/C com troca automática), EAN-13/EAN-8/UPC-A e Code 39, com **HRI**
(reusa `fonts.ts`) e os mesmos avisos de legibilidade do QR.

| Camada | Arquivo | O que faz |
| :--- | :--- | :--- |
| Tabelas | `src/shared/symbol/barcode/tables.ts` | 107 padrões Code 128 (ISO/IEC 15417), 44 do Code 39 (15420→16388), L/G/R do EAN/UPC e a paridade do EAN-13. **Geradas** por `scripts/gen-barcode-tables.mjs` a partir do `jsbarcode` (MIT, devDependency); asserts de forma na geração (Code 39 com 9 elementos e exatamente 3 largos, L/G/R de 7 módulos). |
| Encoders | `barcode/{code128,ean,code39}.ts` | Code 128 com **mod 103** e troca automática de conjunto (`C` para sequências de dígitos); EAN/UPC com **mod 10** e paridade; Code 39 com `*`, gap de 1 módulo, razão **2:1/3:1** e **mod 43** opcional. Erros tipados (`BarcodeError`: `empty`/`bad-chars`/`bad-length`/`check-digit`/`bad-option`), com *esperado × informado* no verificador. |
| Fachada | `barcode/index.ts` | `encodeBarcode()` devolve `bars: { x, w }[]` **em módulos**, `totalModules`, `data` (com o verificador), `hri` e `BARCODE_SPECS` (quiet zone/X-dim/altura mínimas, padrões e exemplo por simbologia). |
| Geometria | `mask.ts` → `barsToVerticalSegments()` | Barras → segmentos de **varredura vertical** (ao longo das barras), `round(largura × linhas/mm)` linhas por barra (mínimo 1), direção alternada; `invert` queima o complemento, inclusive as quiet zones. |
| G-code | `gcode.ts` → `barcodeToGcode()` | Barras + **HRI** (fonte de traço único) abaixo do símbolo; `presorted` (a ordem da varredura é preservada); overscan **por eixo**; filtro por comprimento real; avisos `x-dim-small`, `bar-height-small`, `hri-chars` somados aos do QR. |
| Bundle/UI | `entry.barcode.ts` → `public/barcode.js`; `#barcodeOverlay`; item de menu | Mesmo padrão das outras ferramentas: modal → módulo puro → `applyJobLines` → preview/Play/Salvar + posicionamento. Trocar de simbologia aplica os padrões da norma (quiet zone/X-dim/altura) e mostra razão + mod 43 só no Code 39. |

**Testes.** `tests/symbol-barcode.test.ts` faz **cross-check** com o `jsbarcode`
(Code 128 A/B/C, EAN-13/8, UPC-A; Code 39 sem o gap final que a referência deixa)
e ainda **decodifica** o Code 128 de volta (prova independente de que os
conjuntos e a troca automática codificam o texto pedido), além dos vetores das
normas (mod 103/10/43) e dos erros. `tests/symbol-gcode.test.ts` cobre a
varredura vertical, a polaridade, a ordem preservada (`presorted`), o overscan
por eixo, o HRI e os avisos.

**Divergências do plano (de propósito).**

- **Varredura vertical** em vez do raster horizontal do §6 (decisão G): o
  X-dimension é pequeno e o raster horizontal geraria um número enorme de
  segmentos; vertical, cada barra recebe o mesmo número de linhas e o total cai
  ~30×. Por isso o núcleo **foi** tocado (`mask.ts`/`gcode.ts`), ao contrário do
  que a §15 previa.
- **Tamanho alvo do QR** (`targetWidthMm`/`targetHeightMm`, aviso `stretched`)
  foi concluído junto: fecha o RF-SYM-3 (o modal já tinha largura × altura).
- **ITF-14/Codabar** (§5.2) ficaram para a continuação da S2 (entregues na
  v0.7.0 — ver §17); **Code 93/GS1-128** seguiram na S3, como o plano previa.
- Os nomes de classe do modal (`#qrOverlay`/`#barcodeOverlay`) usam
  `.sym-modal`/`.sym-fields`/`.sym-size-row`, genéricos para as duas ferramentas.
- **Sem `Prefs.symbols`** na v0.6.0: os campos do modal abriam com os padrões
  certos por simbologia; a persistência entrou na v0.7.0 (§17).

**Próximo passo (S3, na época):** Data Matrix/PDF417/Aztec (2D), Code
93/GS1-128, lote (vários códigos numa página) e o símbolo como **objeto** no
editor "Desenhar".

---

## 17. Estado da implementação — S2 restante + S3 parcial (v0.7.0, 18/10/2026)

**Entregue** (mesmos bundles/modais, sem IPC novo):

| Item | Onde | O que foi feito |
| :--- | :--- | :--- |
| **ITF-14** | `barcode/itf.ts` + tabelas geradas | 13 dígitos → calcula o **mod 10 GS1**; 14 → confere (erro `check-digit` com esperado × informado). 5 barras por par, start/stop próprios; quiet zone de 10 módulos e X-dim mínimo da norma. |
| **Codabar** | `barcode/codabar.ts` | Guards `A–D`, padrão `A…A`, alfabeto `0–9 -$:/.+`; HRI sai **sem** os guards. |
| **Code 93** | `barcode/code93.ts` | Alfabeto básico (47 símbolos), verificadores **C e K** (mod 47) automáticos, start/stop e terminação. *Full ASCII* (shifts) ficou fora. |
| **GS1-128** | `barcode/code128.ts` (`gs1: true`) | **FNC1** logo após o start e `^` no conteúdo → FNC1 (separador de campo). **Não valida AIs** (decisão: tabela de AIs fica para quando houver caso real). |
| **Data Matrix ECC200** | `symbol/datamatrix.ts` + `gcode.ts` | 24 tamanhos quadrados (10…144), modo ASCII (par de dígitos + Upper Shift Latin-1), RS em **GF(256) 0x12D**, intercalação (inclui o caso especial do 144×144), colocação Utah e quiet zone de 1 módulo. `dataMatrixToGcode()` reusa o pipeline 2D do QR. |
| **UI 2D** | modal **Código 2D** (Ferramentas) | Seletor **QR Code × Data Matrix**: campos exclusivos aparecem sozinhos (ECC/versão × tamanho do símbolo); quiet zone do DM fixa em 1. |
| **UI 1D** | `#barcodeOverlay` | As 4 simbologias novas no `select`, com dica de conteúdo por simbologia e padrões da norma aplicados ao trocar. |
| **Preferências** | `Prefs.symbols` + `PrefsStore` | O modal reabre com os últimos ajustes (símbolo, ECC/tamanho, módulo, quiet zone, potência/velocidade/passadas…). Sanitizado: só enums/números/booleanos conhecidos, **nunca o conteúdo**. |

**Validação.** `tests/symbol-barcode-extra.test.ts` (26 testes) faz cross-check
de módulos com o `jsbarcode` (ITF/ITF14, Codabar, Code 93) e vetores de mod 10 /
mod 47; `tests/symbol-datamatrix.test.ts` (24) compara o vetor `"123456"` com a
referência e **decodifica** com o `DataMatrixReader` do **ZXing**
(`@zxing/library`, Apache-2.0, **devDependency**) em 9 tamanhos, do 10×10 ao
144×144, incluindo acentos Latin-1 e 2/6/10 blocos intercalados. Há ainda testes
de G-code do DM/ITF-14 e E2E dos dois modais e da persistência.

**Fora do escopo (segue aberto).** PDF417 e Aztec; Data Matrix retangular e os
modos C40/Text/X12/EDIFACT/Base256/ECI; Code 93 Full ASCII; validação de AIs do
GS1; e o símbolo como **objeto** no editor "Desenhar" (S3). A **grade** de
símbolos (RF-SYM-9) foi **entregue** em 19/10/2026.
