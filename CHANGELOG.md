# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [0.8.0] - 2026-10-18

### Added — painel Máquina (P0.7, RF-MAQ-1…10)

- **Ferramentas → Máquina** abre um painel que lê `$I`, `$$`, `$#`, `$G` e `$N`
  (uma consulta por vez, com a janela de envio vazia) e mostra firmware, curso,
  limites, laser, movimento, offsets, sonda e estado modal em cartões.
- **Diagnóstico copiável** em `chave=valor` (app, transporte, firmware,
  configurações, fatos derivados, estado, alarmes) para colar num relatório de
  bug sem expor caminhos de arquivo.
- As consultas são **seriais** e `$N` é opcional: firmware sem blocos de
  inicialização responde `error:` e o painel segue com `startup=[]`.
- E2E cobre o caminho completo main → IPC → renderer com um emulador GRBL por
  TCP (firmware, curso, offsets e relatório).

### Added — pré-voo antes de gravar (P0.8, MX-1…MX-15)

- Antes de iniciar o job, as regras **MX-1…MX-15** cruzam o G-code com os fatos
  da máquina (potência × `$30`, `$32`, curso × caixa do job, `$20`/`$22`,
  `G28`/`G30`, `G1` sem `F`, `Pn` ativo, `M7`/`M8` sem suporte, `G20` × `$13`,
  blocos `$N`, jog fora do limite, primeiro corte sem `S`, `sMax` do perfil ×
  `$30`, buffer não informado, retorno ao zero com hard limits).
- **Impedimento** abre um overlay com severidade, detalhe e sugestão; “Gravar
  assim mesmo” segue, “Cancelar” aborta. Avisos e informações viram um **chip**
  na aba Execução, sem bloquear.
- Falha da própria checagem **não** impede o job (o pré-voo é consultivo); o
  snapshot é reaproveitado do painel Máquina e lido uma vez se ainda não houver
  cache. Textos em pt-BR/en/es com paridade garantida pelo type-check.

### Added — símbolos (S3)

- **Code 93 Full ASCII**: 0–127 expandidos em pares de *shift* (`($)`, `(%)`,
  `(/)`, `(+)`), com C/K sobre os símbolos já expandidos e cross-check com o
  `jsbarcode` para todo o ASCII.
- **Validação de AIs GS1-128** (`validateGs1`): dicionário mínimo (00, 01, 02,
  10, 11, 13, 15, 17, 20, 21, 30, 37, 240–242, 250/251, 400, 410/412/414, 422),
  erros de formato/posição/data e integração testada com `encodeBarcode`.
  A validação é **opt-in** — o encoder continua só codificando.

### Docs

- **`docs/COMPARATIVO.md`** (P0.5): LaserGRBL, LightBurn, LaserWeb, GRBL
  Controller, Candle e GRBL Studio em 20 critérios, com data, fontes e a lista
  do que **não** está no orçamento. Tabela curta e link nos três READMEs.

### Performance — startup (RNF-11)

- **`electron-updater` e `serialport` sob demanda.** O updater (≈110 ms de
  `require` com cache quente, mais no primeiro acesso) só carrega depois da
  janela criada; a API de porta serial (≈33 ms + binding nativo) só é carregada
  ao listar/conectar. Nada muda no comportamento: o auto-update continua
  silencioso e a lista de portas continua no boot.
- **Splash fora do caminho crítico.** A janela principal começa o `loadFile`
  antes de qualquer janela auxiliar; o splash só aparece se a janela ainda não
  estiver pronta em 400 ms. Em máquina rápida ele nem pisca.
- **Bundles do renderer sob demanda.** As tabelas de QR/Data Matrix e de código
  de barras (108 KB) e o editor vetorial (65 KB em 8 bundles) saem do caminho do
  primeiro paint. Os símbolos são pré-aquecidos em `requestIdleCallback` 2 s
  depois do boot; o editor carrega ao abrir Desenho/importar SVG. Os 19
  `<script>` viraram 9.
- **Medição (Linux/Wayland, i3-5015U, A/B intercalado 4×):** `ready-to-show`
  **1 500 → 1 314 ms** (mediana), hook do main **694 → 546 ms**, startup total
  **1 846 → 1 779 ms**. No melhor par, 1 337 ms. Continua acima do orçamento de
  1 500 ms nesta máquina — números e ressalvas em `docs/BENCHMARK.md`.

### Fixed — máquina real: a 1ª leitura, o diagnóstico e o perfil (Sculpfun C1, 18/10)

- **`$I` recusado na 1ª leitura depois de conectar.** Evidência dos logs de
  sessão do usuário: em **9 de 9** conexões a primeira linha (`$I`) voltou
  `error:3` e `[VER:]`/`[OPT:]` **nunca chegaram** — o painel Máquina saía sem
  firmware e o histórico ganhava um `code 3` que não dizia o que falhou
  (`PLANO_MAQUINA.md` §11.7). Como é leitura idempotente, o cliente agora
  **repete essa linha uma vez** (e só ela) e registra o aviso no console — sem
  alarme no histórico.
- **O diagnóstico diz o que falhou.** `error:`/`ALARM:` no histórico e no
  "copiar diagnóstico" passam a guardar a **linha recusada** (`(cmd: $I)`) e a
  distinguir `ALARM n` de `error n` — antes os dois saíam como `code n`,
  indistinguíveis.
- **`firmware.options` não sai mais vazio.** As letras cruas de `[OPT:…]`
  (`H` na C1) eram descartadas e o relatório imprimia `firmware.options=`.
- **`useDollarJog` era documentado e ignorado.** O `$J=` é opcional no GRBL 1.1:
  a opção passou a ser respeitada e, se o firmware recusar o modo dedicado, o
  jog cai para `G91`/`G0`/`G90` (**três linhas**, cada uma com o seu `ok`) pelo
  resto da conexão — um aviso em vez de um erro por jog. **Na C1 o jog dedicado
  funciona** (§11.3): isto é defesa, não sintoma observado.
- **Perfil da C1 conferido contra a coleta:** `tests/machines.test.ts` agora
  falha se um perfil prometer escrever um `$` que a máquina não tem (escrever
  código inexistente responde `error:3`).
- **Porta morta: o app não fica mais "conectado" no vazio.** Depois do `ALARM`
  de fim de curso o controlador reinicia e o CDC USB re-enumera — o fd morre,
  mas os writes seguem aceitos por dezenas de segundos. O app passava **46 s**
  mostrando um DRO congelado como se estivesse tudo bem (`bad file descriptor`
  aparece em 6 logs de sessão). Agora um **vigia de silêncio** (≥ 5 s sem status
  `?` em repouso) avisa no console e volta para "desconectado", liberando o
  botão para reconectar. Com job na fila o silêncio é do job — quem cuida é o
  vigia de `ok` (`PLANO_MAQUINA.md` §11.8). O `SerialTransport.close()` também
  passou a resolver mesmo quando o callback do `serialport` nunca chega.

## [0.7.0] - 2026-10-18

### Added — Simbologias: 1D extras e Data Matrix (S2/S3, RF-SYM-7)

- **ITF-14**, **Codabar**, **Code 93** e **GS1-128** no gerador de código de
  barras, com as mesmas garantias das simbologias da 0.6.0: tabelas **geradas**
  (`scripts/gen-barcode-tables.mjs`, cross-check com o `jsbarcode`), verificador
  com *esperado × informado* (mod 10 do ITF-14, C/K mod 47 do Code 93) e dica de
  conteúdo por simbologia. No GS1-128 o **FNC1** vai logo após o start e `^`
  separa campos; a validação de AIs fica por conta do usuário.
- **Data Matrix ECC200** (ISO/IEC 16022): encoder próprio com 24 tamanhos
  quadrados (10×10 a 144×144), modo ASCII com par de dígitos e Latin-1, RS em
  **GF(256) 0x12D**, blocos intercalados (inclusive o caso especial do 144×144)
  e quiet zone de 1 módulo. O modal 2D agora escolhe **QR Code × Data Matrix**;
  a matriz é **decodificada no teste** com o `DataMatrixReader` do ZXing
  (`@zxing/library`, Apache-2.0, **devDependency** — não vai ao bundle).
- **`Prefs.symbols`**: o modal reabre com os últimos ajustes (símbolo, ECC ou
  tamanho, módulo, quiet zone, potência, velocidade, passadas, modo…). O
  `PrefsStore` sanitiza no main — só enums/números/booleanos conhecidos; o
  **conteúdo digitado nunca é persistido**.

### Added — Onboarding de primeira execução (P0.4, RF-ONB-1)

- **Tour de 5 passos** na primeira abertura: conectar → perfil da máquina →
  abrir a arte → pré-visualizar → gravar com segurança, cada passo com "onde
  fica" na interface. Reabrível em **Ajuda → Tour de boas-vindas**; a pref
  `onboarding` guarda a versão vista ("Não mostrar na próxima abertura").
- Esc fecha o tour e o modal de código de barras (que faltava na lista).

### Added — Testes de protocolo e cobertura (P0.2, P0.6)

- **E2E de job por PTY** (`tests/job-integration.test.ts`): `GrblClient` →
  `SerialTransport` → par de PTYs (`socat`) → emulador GRBL, cobrindo job de 30
  linhas com a janela de 128 B/16 blocos respeitada, **pausa/retomada**,
  **cancelamento** (`0x18`), **alarme** e `error:9`, além de provar que `?`,
  `!`, `~` e `0x18` vão como **byte único, sem `\n`**.
- **Fuzz determinístico** (`tests/protocol-fuzz.test.ts`, 6.000 casos) no parser
  e cobertura mínima de **90 %** (global) e **95 %** em `protocol.ts`.
- **Cinco bugs reais corrigidos** pelo fuzz: `Ov:abc` e `Bf:x` propagavam
  `NaN`; `MPos/WPos/WCO:1e999` viravam `Infinity` no DRO; `error:`/`ALARM:` com
  número absurdo viravam `Infinity`; `$<400 dígitos>` virava chave `Infinity`.

### Added — Catálogo de perfis de máquina (RF-MAQ-10)

- `src/shared/machines.ts`: **22 perfis** (Sculpfun, Ortur, AtomStack, TwoTrees,
  FoxAlien, Genmitsu, Wainlux, Comgrow, xTool) + **Genérico GRBL**, com curso,
  homing, módulo do laser, teto de `S` (`$30`) e o conjunto mínimo de `$` que o
  app aplica — nada disso chumbado no renderer. Origem: coleta real da
  Sculpfun C1 (`docs/PLANO_MAQUINA.md` §11) e fixture de teste.

### Added — Benchmark dos orçamentos (P0.1, Linux)

- **`npm run bench`** (`scripts/bench.mjs`) mede, com o app Electron real e sem
  hardware: startup (spawn → primeiro frame), RAM (RSS/PSS da árvore de
  processos), CPU ociosa e latência de ida e volta main → renderer → IPC. O main
  só registra os marcos com `GRBL_BENCH=1`. Metodologia, comandos e leitura em
  [`docs/BENCHMARK.md`](docs/BENCHMARK.md).
- **Resultado honesto:** CPU ociosa (~0 %) e latência de interação (p95 ~1 ms)
  **dentro** do orçamento; **startup (≥ 1 827 ms) e RAM (PSS 227,3 MB) acima**
  do RNF-11 na máquina de referência (Intel i3-5015U, carga ~3–4). FPS durante
  job, latência de `?` e DPI continuam manuais; Windows/macOS não medidos.
  Otimizar startup/RAM segue aberto.

### Fixed

- **Envio:** uma linha maior que o buffer RX do GRBL **não** é mais enviada — o
  job é abortado com erro claro (com trecho da linha) em vez de estourar o
  buffer e corromper o G-code. O cabeçalho gerado pelos símbolos passa a ser
  cortado por **bytes** (acentos Latin-1 ocupam 2) com teto por linha.
- **Protocolo:** `error:`/`ALARM:` que citam "ok" (ex.: `error:9 not ok`) não
  viram ACK — liberar a janela antes da hora; o código é extraído mesmo com
  texto depois do número.
- **Protocolo:** `splitLines` só quebra a linha no `>` que **fecha** um
  `<...>` de status; um `>` dentro de `[MSG:ferramenta > 3 mm]` não divide mais
  a mensagem.
- **Cliente:** iniciar um job com uma consulta enfileirada (mas ainda não
  despachada) a rejeita na hora, em vez de deixá-la pendurada até o timeout de
  8 s.
- **UI:** parada de emergência por teclado (`Esc`/`Ctrl+X`) volta a funcionar
  com o foco num campo (console, campos do modal) — era justamente o caso real;
  o `Ctrl+X` é tratado antes da guarda de digitação e o `Esc` para o job quando
  não há diálogo aberto.
- **Símbolos:** o Code 39 avisa que o conteúdo foi convertido para maiúsculas
  (antes mudava o dado em silêncio) e o modal 2D não mostra mais a chave crua
  `dm.err.bad-version` quando o erro não tem `code`.

### Changed — documentos

- `PLANO_DE_ACAO.md` §1.1, `ROADMAP.md`, `PRODUCT_SPEC.md` (RF-SYM-7 🟡,
  RF-ONB-1 ✅), `ARCHITECTURE.md`, `PLANO_QR_BARCODE.md` §17 e `DEVELOPMENT.md`
  reconciliados com o corte; `README.md`/`README.en.md`/`README.es.md` com as
  ferramentas de símbolos, os perfis de máquina e o tour.

## [0.6.0] - 2026-10-18

### Added — Ferramentas: gerador de código de barras 1D (v0.6, fase S2)

- **Ferramentas → Código de barras…**: gera um código de barras como G-code, no
  mesmo fluxo das outras ferramentas (modal → preview → **Play** ou **Salvar
  .gcode…**). Simbologias: **Code 128** (conjuntos A/B/C com troca automática),
  **EAN-13**, **EAN-8**, **UPC-A** e **Code 39** (razão 2:1/3:1 e mod 43
  opcional), com **HRI** (o texto legível sob as barras) desenhado pela fonte de
  traço único.
- **Encoders próprios, sem dependência de runtime** (ADR-11): os padrões das
  normas (ISO/IEC 15417/15420/16388) vêm de `src/shared/symbol/barcode/tables.ts`,
  **gerado** por `scripts/gen-barcode-tables.mjs` a partir do `jsbarcode` (MIT,
  **devDependency**). A saída é comum às simbologias: `bars: { x, w }[]` em
  módulos + `hri` + o dígito/caractere de verificação.
- **Dígito verificador com esperado × informado**: o conteúdo pode vir com ou
  sem o verificador — com um dígito a menos ele é calculado; com o total, é
  conferido e o erro diz exatamente *esperado × informado* (mod 10 no EAN/UPC,
  mod 103 no Code 128, mod 43 no Code 39).
- **Varredura ao longo das barras**: as barras são preenchidas com linhas
  **verticais** (direção alternada), o que garante as 3–4 linhas por barra
  estreita com **~30× menos segmentos** que o raster horizontal — menos `G0` e
  muito menos linhas de G-code. O overscan passa a respeitar o **eixo do
  movimento** e trechos verticais não são mais descartados.
- **Avisos de legibilidade**: X-dimension abaixo do mínimo da norma, barras mais
  baixas que o recomendado e HRI com caractere sem glifo, além dos avisos que o
  QR já tinha (quiet zone, linhas por módulo, área de trabalho).
- **Testes**: `tests/symbol-barcode.test.ts` faz *cross-check* de módulos com o
  `jsbarcode` (Code 128 A/B/C, EAN-13/8, UPC-A, Code 39), **decodifica** o Code
  128 de volta (valida a troca automática de conjunto) e cobre os vetores das
  normas e os erros; `tests/symbol-gcode.test.ts` cobre a varredura vertical, a
  polaridade, a ordem preservada e o HRI; E2E do fluxo Ferramentas → Código de
  barras… → gerar.

### Added — QR Code: tamanho alvo em largura × altura (RF-SYM-3)

- **Tamanho em mm, não só módulo**: o modal do QR ganhou **largura × altura**
  alvo (em branco usa o lado do módulo) com o cadeado **Quadrado**. Informar só
  um lado mantém o símbolo quadrado; informar os dois **estica** o símbolo e o
  gerador avisa (`stretched`), porque um QR esticado pode não ler.
- O alvo é limitado por módulo (0,05–20 mm): pedir um tamanho impossível para a
  versão escolhida **avisa** em vez de sair do ar.

### Added — Ferramentas: gerador de QR Code (v0.6, fase S1)

- **Ferramentas → QR Code…**: gera um QR Code como G-code de varredura, no mesmo
  fluxo das outras ferramentas (modal → preview → **Play** ou **Salvar
  .gcode…**). Campos: conteúdo (URL/texto), correção de erro (L/M/Q/H), versão
  (automática ou 1–40), lado do módulo, quiet zone, linhas/mm, potência,
  velocidade, passadas, modo (M4/M3), overscan e polaridade invertida.
- **Encoder próprio, sem dependência de runtime** (ADR-11): ISO/IEC 18004
  completo — modos numérico/alfanumérico/**byte UTF-8** com seleção automática,
  versões 1–40, níveis L/M/Q/H, Reed–Solomon sobre GF(256), as 8 máscaras com a
  penalidade da norma e BCH de formato/versão — em `src/shared/symbol/qr.ts`.
  As tabelas de blocos EC e de *alignment patterns* são **geradas** por
  `scripts/gen-qr-tables.mjs` (proveniência no cabeçalho do arquivo gerado).
- **Avisos de legibilidade** antes de gravar: módulo pequeno para o ponto do
  laser, módulo abaixo de 0,3 mm, quiet zone insuficiente, menos de 3 linhas de
  varredura por módulo e símbolo que não cabe na área de trabalho.
- **Núcleo reutilizável** para a fase S2: `src/shared/symbol/mask.ts`
  (matriz/barras → faixas e segmentos de varredura, inversão de polaridade) e
  `src/shared/symbol/gcode.ts` (`symbolToGcode` com zigue-zague, `M5` antes de
  cada deslocamento, passadas, `S ≤ $30`, 3 casas decimais).
- **Testes**: cross-check de matriz com `qrcode-generator` (v1–v33, todos os
  níveis) e **decodificação real** com `jsqr` (incluindo UTF-8/emoji, as 8
  máscaras e v1–v40) — ambas **devDependencies** MIT; invariantes de G-code em
  `tests/symbol-gcode.test.ts`; E2E do fluxo Ferramentas → QR Code… → gerar.

### Documentação

- `docs/PLANO_QR_BARCODE.md` §15: estado da S1 (arquivos, testes, decisões
  ratificadas e o bug de *alignment pattern* × *timing* corrigido no caminho).
- `docs/PLANO_QR_BARCODE.md` §16: estado da S2 (simbologias, varredura vertical,
  HRI, testes e o que fica para S3).

## [0.5.2] - 2026-10-18

### Fixed — desenho (revisão: itens C)

- **Espelhar preserva o sentido do contorno (winding)**: refletir inverte a ordem
  dos pontos e, num contorno fechado, isso troca o sinal da área — o
  `offsetLoop` decide crescer/encolher pelo sinal, então um **furo espelhado
  passava a engordar** como peça. Agora a ordem é invertida em formas fechadas.
- **A área de pega enxerga a espessura do traço**: o clique era comparado com a
  linha do meio, não com a faixa de `width` mm que o usuário vê.
- **`strokeOffsets` com o passo certo**: as passadas ficam a múltiplos exatos do
  passo — `strokeOffsets(0.1, 0.1)` devolvia **3 passadas** em vez de 1 (o traço
  saía com o dobro da densidade pedida). Estourado o limite de linhas, elas se
  espalham até a borda como antes.
- **Grupo vazio não junta objetos soltos**: formas com `group: ''` caíam todas no
  mesmo balde e viravam um bloco único (mover uma movia as outras).
- **Campos de propriedades inertes sem seleção** (X/Y/L/A/R e P/V/N/E/px).

### Added — desenho

- **Passadas por objeto (`shape.passes`)**: campo novo **N** na barra de
  propriedades (ao lado de P/V/E), copiado no "copiar estilo" e **respeitado na
  geração** — antes o valor era ignorado pelo `designToGcode`.
- Acessibilidade/i18n: o `aria-label` dos botões de fechar do desenho agora é
  traduzível (`data-i18n-aria`) e as chaves mortas `design.font` /
  `design.sel.count` saíram dos três idiomas.

### Fixed — CI (job E2E)

- O script `test:e2e` havia sumido do `package.json`, então o job **E2E
  (Playwright)** falhava sempre com `Missing script: "test:e2e"` — a suíte já
  existia (`e2e/app.spec.ts`) e passa. Os workflows também deixaram de baixar os
  navegadores do Playwright (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`): o E2E usa o
  Electron do projeto.

### Documentação

- **Módulo M13 — Editor vetorial ("Desenhar")** no `PRODUCT_SPEC.md`: 12
  requisitos `RF-DSN-1…12` (prancheta em mm, formas, transformações, snap,
  parâmetros por objeto, booleanas, contorno paralelo, nós, geração de G-code,
  preferências e preview), linha na matriz de paridade e critério de aceite 9.
- **Ancoragem da arte na origem (RF-DSN-9)**: a decisão virou requisito e está
  documentada em `DESIGN.md` §4 — a prancheta compõe a arte, mas o G-code começa
  em `X0 Y0`, com o fluxo "posicionar o laser → Definir origem → Play".
- **Planejamento das ferramentas de QR Code e código de barras** (v0.6, fases
  S1–S3, `RF-SYM-1…9`, módulo M12): novo `docs/PLANO_QR_BARCODE.md` e atualização
  de `ARCHITECTURE`, `FEATURES_COMPARISON`, `PLANO_PREMIUM`, `ROADMAP` e índice.

## [0.5.1] - 2026-10-18

### Fixed — gravação ancorada na origem e preview (X0 Y0)

- **A arte agora é ancorada na origem (começa em X0 Y0)**: para gravar alinhado
  ao material, o usuário posiciona o laser onde vai queimar e **define a origem
  ali** — então o G-code tem de começar sob o cabeçote. O `designToGcode` emitia
  em coordenadas **absolutas da prancheta** (um 2 × 2 no meio de uma página
  10 × 10 saía em X4/Y4), o que obrigava a máquina a sair andando em diagonal
  até o desenho antes de queimar. Agora o **canto inferior esquerdo do desenho
  vira X0 Y0** (`machineX = pageX − minX`, `machineY = maxY − pageY`) e cada
  contorno começa pelo **canto mais próximo** do cabeçote — o `G0` inicial
  aponta para o próprio X0 Y0 e o contorno segue sem cruzar o desenho. A posição
  do objeto na prancheta continua servindo para compor a arte, mas não desloca
  o job.
- **O preview pintava o deslocamento (`G0`) como se fosse queima**: a caixa
  tracejada da área de trabalho e o `G0` de retorno à origem não fazem parte do
  job, mas o `drawGcodePreview` lia `prog.burns` (campo que não existe no
  programa interpretado) e caía em `moves`, pintando **todas** as linhas na cor
  de queima. Como o `G0` final roda depois do último `M4`, ele herdava o `S` e
  virava uma **diagonal azul viva** do desenho até a origem — parecia que o
  quadrado seria gravado com um rabisco. Agora só os trechos que realmente
  queimam (`previewProgram.burns`) usam a cor de queima; o `G0` fica cinza
  discreto. A caixa tracejada ganhou a entrada **"Área de trabalho"** na legenda
  para deixar claro que é só referência.


### Fixed — revisão do módulo de desenho (P2.1 / §11)
- **Potência por objeto saía quase apagada**: o campo “P” da barra de
  propriedades grava **porcentagem** (0–100), mas `designToGcode` emitia o valor
  cru como `S` — um objeto a 80 % virava `M4 S80` (≈ 8 % do `$30`) em vez de
  `S800`. Agora `power` é percentual (igual ao `powerPercent` global), derivado do
  `$30` da máquina na hora de gerar.
- **Parâmetros inválidos quebravam o job no meio**: `F0`/`F-500` (velocidade) e
  `S-50`/`S2000` (potência acima do `$30`) fazem o GRBL responder `error:` e
  abortar a gravação — com material já queimado. Agora `feed`, `travelFeed`,
  `sMax` e `passes` caem em padrões seguros quando não-finitos/inválidos, a
  potência fica em 0–100 % e `passes < 1` gera uma passada.
- **Coordenadas `NaN`/`Infinity` iam para o G-code** (`G1 XNaN`, `; área NaN ×
  5,00 mm`). Agora pontos não-finitos são descartados e uma forma sem 2 pontos
  válidos não entra no cabeçalho nem no corpo.
- **Contorno "fechado" de 2 pontos sumia ao ganhar espessura** (`strokePaths`
  exige 3 pontos) e deixava o `cursor` no canto errado, jogando o próximo `G0`
  para longe. Agora um "fechado" de 2 pontos é tratado como linha — na geração
  **e** na caneta (que não fecha mais um laço que ficaria com 2 pontos).
- **Espigão de centenas de mm ao encolher contorno fino** (`offsetLoop`): com
  arestas quase colineares a intersecção das retas deslocadas caía a ~200 mm do
  vértice — **fora da peça** — e o traço grosso saía queimando longe da arte
  (ex.: `G1 X-189.005`). Agora a passada é descartada quando o contorno
  encolhido não fica **dentro** do original; quinas agudas legítimas (o vértice
  real do inset) continuam intactas.
- **Rótulo de zoom 4× maior**: `scale` é px/mm (100 % = 4 px/mm), mas o rótulo
  fazia `scale × 100` — com a página ajustada aparecia "490 %" em vez de "123 %".
- **Nomes crus na lista de Objetos**: "Subtrair"/"Intersecção" procuravam
  `design.bool.difference`/`design.bool.intersection` e a caneta fechada,
  `design.kind.polygon` — chaves que não existiam, então o objeto nascia como
  `design.bool.difference 1`. As três chaves foram adicionadas (pt/en/es).
- **Atalhos sumiam dos tooltips**: o i18n reescreve o `title` dos botões e as
  traduções não traziam o atalho, apagando "(Ctrl+Z)", "(R)", "(Del)" etc. Agora
  os textos incluem o atalho real — e o botão Desagrupar anuncia
  **Ctrl+Shift+G** (o código sempre foi `Ctrl+Shift+G`; o tooltip dizia Ctrl+U).
- **Diálogos travados ao fechar o editor**: fechar "Desenhar" pelo `Esc` global
  escondia o overlay sem a desmontagem própria (`closeDesignModal`), deixando o
  menu de booleanas/diálogos de tamanho e matriz "abertos" para a próxima
  abertura.
- **Atalhos agindo no desenho escondido**: com o modal "Posicionar a gravadora"
  por cima, `Del`/setas/`R`… ainda mexiam no desenho; agora só o `Esc` age
  enquanto ele estiver aberto.


## [0.5.0] - 2026-10-18

### Added — editor de desenho estilo CorelDRAW (P2.1)
- **Workspace novo**: caixa de ferramentas vertical com **ícones SVG**, barra de
  propriedades contextual (X/Y/L/A/rotação, travar proporção, alinhamento à
  página, ordem Z, agrupar/desagrupar, duplicar), **réguas** em mm, **prancheta**
  com a área útil da máquina (150 × 130 mm, persistida) e painel de **Objetos**
  (uma linha por bloco, não por contorno).
- **Seleção e edição**: multi-seleção (clique + `Shift`), **marquee**, mover,
  redimensionar por 8 *handles*, **rotacionar** por alça (com passo de 15° com
  `Shift`), *nudge* pelas setas, `Ctrl+D` duplicar, `Ctrl+C`/`Ctrl+V`,
  `Ctrl+G`/`Ctrl+Shift+G` agrupar/desagrupar, `Ctrl+[`/`Ctrl+]` ordem Z,
  `Ctrl+A` selecionar tudo, `Del` excluir e `Ctrl+Z`/`Ctrl+Y` desfazer/refazer
  (80 níveis).
- **Texto como bloco**: todos os contornos de um texto formam um **grupo** que
  se move/redimensiona/rotaciona inteiro; **duplo clique** reabre o texto para
  editar. Três modos: **vetor (contorno)** — traça a fonte do sistema em alta
  resolução (16 px/mm) com simplificação RDP; **preenchido (cheio)** — contorno
  + **preenchimento por varredura** (linhas/mm configurável, com zig-zague) para
  gravar texto sólido; **traço único** (Hershey Simplex).
- **Seletor de fontes**: além da lista curada e da fonte single-stroke, o campo
  Fonte lista as **famílias instaladas no sistema** (`fontconfig` via IPC
  `app:fonts:list`), em ordem alfabética, com busca pelo próprio `<datalist>`.
- **Gravação por objeto**: a barra de propriedades tem **potência (%)**,
  **velocidade (mm/min)** e **espessura do traço (mm)** por objeto. Campo vazio
  = usa o parâmetro global (que
  aparece em cinza como `placeholder`); valores diferentes na seleção mostram
  `—`, e a lista de Objetos exibe o que cada um sobrescreve (`35% · 600 · 2 mm`). Os
  botões **Copiar estilo**/**Colar estilo** (`Ctrl+Shift+C`/`Ctrl+Shift+V`)
  replicam a gravação de um objeto na seleção — ex.: contorno fraco e
  preenchimento forte no mesmo desenho, sem gerar dois arquivos.
- **Espessura do traço**: cada objeto pode gravar uma **faixa de N mm centrada
  no caminho** (como um traço de caneta: metade para cada lado), com os campos
  `E` (mm) e `px` da barra de propriedades — os dois são a mesma medida
  (**1 px = 0,25 mm**, como o traço aparece na tela em zoom normal), então dá
  para digitar `2px`/`3px` e ver o valor em mm equivalente. A gravação preenche
  a faixa com linhas paralelas espaçadas de ~0,1 mm (o mesmo *kerf* do
  preenchimento por varredura) e o desenho mostra o traço com a espessura real
  (WYSIWYG); `0`/vazio mantém a linha simples e espessuras dentro do feixe não
  mudam nada. Vale para retângulos, elipses, polígonos, textos e linhas — e a
  espessura é um parâmetro de gravação em mm: **não escala** junto com o
  desenho (o traço também não é reeditado ao reaproveitar o estilo de um
  objeto).
- **Caneta (desenho livre)**: nova ferramenta `P` na barra de ferramentas —
  clique e arraste para criar traços livres; ao soltar, os pontos são
  simplificados (RDP, tolerância 0,5 mm) e, se o traço voltar perto do início,
  a forma fecha automaticamente.
- **Edição de nós**: botão `N` na barra de ferramentas — com um objeto
  selecionado, entra no modo edição; clique num nó para arrastar, clique num
  segmento para inserir nó, `Delete`/`Backspace` remove nó, `Esc` sai do modo.
  Os nós são desenhados sobre a forma (círculo azul no nó ativo) com a mesma
  escala do zoom.
- **Booleanas e contorno paralelo** (menu da barra de propriedades): **unir**,
  **subtrair** (o objeto de trás menos os da frente), **intersecção** e
  **exclusão** entre 2+ objetos fechados — com furos corretos (paridade de
  contornos, ex.: texto vetorizado) e contornos aninhados do resultado andando
  juntos como um bloco. **Contorno paralelo** (offset): distância em mm
  (positiva cresce, negativa encolhe), **passadas** concêntricas, cantos em
  bico/arredondados/chanfrados e opção de manter a forma original. Furos andam
  ao contrário (encolhem quando a forma cresce).
- **Repetir e alinhar**: **matriz de cópias** (colunas × linhas com passo X/Y, já
  preenchido com o tamanho do objeto; a cópia de um bloco vira um bloco
  independente), **espelhar** na horizontal/vertical em torno da seleção e
  **distribuir** o espaçamento (folgas iguais entre as caixas) em X ou Y com 3+
  objetos selecionados.
- **Snap a objetos**: ao arrastar, a seleção encaixa nas **bordas e no centro
  dos outros objetos** e da página (tolerância de 8 px na tela), com **linha de
  guia** mostrando o alinhamento; sem alvo por perto, cai na grade. Os alvos são
  calculados uma vez por arrasto, não a cada movimento (RNF-11).
- **Navegação**: roda do mouse = zoom no cursor, botão do meio / `Space`+arraste
  = mover a tela, `F` ajustar à página, `0` voltar a 100 %, `+`/`-` zoom.
- **Tamanho da arte**: "Gerar e visualizar" abre um diálogo de **largura × altura
  (mm)**; com o cadeado travado (padrão), preencher um lado ajusta o outro na
  mesma proporção (`Esc` fecha só o diálogo). Confirmar escala a arte a partir do
  canto superior esquerdo e gera o G-code.
- **Conectar no modal de posicionamento**: botão **Conectar máquina** (área de
  status do modal) para quem esqueceu de conectar antes — não é mais preciso
  fechar o desenho e refazer tudo.
- **Parâmetros de gravação valem para o desenho**: potência, velocidade e
  passadas ajustadas no modal "Posicionar a gravadora" alimentam a prancheta e
  regeram o G-code a partir das formas (antes só afetavam a imagem). O slider de
  velocidade do modal vai até 20000 mm/min.
- Novo módulo **puro** `src/shared/designEditor.ts` (bounds, grupos, *hit-test*,
  z-order, simplificação RDP, espelhar, distribuir, matriz de cópias) + **27
  testes**; bundle `public/designEditor.js` (`GRBL_DESIGN_EDITOR`).
- Novo módulo **puro** `src/shared/hatch.ts` (preenchimento por varredura +
  zig-zague) + **9 testes**; bundle `public/hatch.js` (`GRBL_HATCH`).

### Fixed — editor de desenho
- **Menu de booleanas nascia aberto** ao abrir "Desenhar": a regra
  `.design-menu { display: flex }` vinha depois de `.hidden` no CSS e ganhava
  pela ordem (mesma especificidade). Agora há `.design-menu.hidden`, como nos
  demais overlays.
- "Gerar e visualizar" não produzia G-code: `designToGcode` recebia o array de
  formas em vez do documento (`{ shapes, width, height }`).
- O conteúdo era pintado duas vezes por quadro e a lista de objetos era
  reconstruída a cada movimento do mouse (violava RNF-11); agora o render é
  agendado por `requestAnimationFrame` e a lista só muda quando necessário.
- Alinhamento usava pixels do canvas como se fossem mm; agora usa a página (mm).
- Elipse agora é desenhada canto-a-canto (como no CorelDRAW); antes era centrada
  no ponto inicial do arraste.
- O modal **"Posicionar a gravadora"** aparecia atrás do editor (z-index); agora
  abre por cima e `Esc` fecha só ele.
- **"Gerar e visualizar" parecia não fazer nada**: o modal de posicionamento e o
  editor de desenho tinham o **mesmo `z-index`**, e como o editor vem depois no
  DOM ele pintava por cima — o usuário precisava fechar o desenho para ver o
  modal (e o "Conectar máquina"). Agora `#frameOverlay` tem empilhamento próprio
  (`z-index: 110`).
- **Queimar com o editor aberto**: ao iniciar a gravação pelo modal, o editor de
  desenho (que cobre a janela inteira) continuava aberto escondendo DRO,
  progresso, `Pausar` e `Cancelar`. Agora ele fecha antes do envio começar.
- **Acentos na fonte de traço único**: "Ação" era gravado como "A??O" (a fonte
  só tinha A–Z e o desconhecido caía em `?`). Agora o caractere é normalizado
  (`á`→`A`, `ç`→`C`, `ß`→`SS`, …) e, quando ainda não há glifo, o editor avisa
  quais caracteres ficarão como `?` em vez de gravar em silêncio.
- Removido `<div>` de overlay duplicado em `public/index.html` (desbalanceava o
  DOM e escondia o restante da página).
- **"▶ Gravar" não funcionava para o desenho**: o botão do modal de
  posicionamento só regenerava o G-code da **imagem** (e voltava sem fazer nada
  quando não havia imagem). Agora o app guarda a origem do job (`image`,
  `design`, `file`): no desenho o G-code é regerado a partir das formas com os
  parâmetros do modal; num arquivo aberto ele apenas inicia o envio já carregado.
- **A área do job agora é a arte**: `parseGcode` passou a expor `cutBounds` (só
  os movimentos de queima, sem `G0`). O modal "Posicionar a gravadora" usava a
  área total — que inclui o deslocamento até a origem — e por isso um desenho de
  2 × 3 mm no canto enquadrava/contornava a tela inteira.
- **Barra de status do desenho** conta **objetos** (blocos), não contornos: um
  texto preenchido mostra "1 objeto selecionado" em vez de "306 objetos".
- **O pré-visualizar enquadra a arte**: o preview usava a área total (com o `G0`
  de volta à origem) e deixava a arte minúscula num canto; agora usa `cutBounds`.
- **As preferências do desenho são lembradas** entre sessões (velocidade,
  potência, passadas, modo M3/M4, grade e o último texto: fonte, tamanho, modo,
  negrito e espaçamento) — não é mais preciso redigitar tudo ao abrir de novo.
- **A página do desenho parte da área da máquina** (`$130`/`$131`): sem
  preferência salva, uma máquina de 400 × 400 abre com 400 × 400 em vez do
  padrão fixo de 150 × 130.
### Performance — o PC não interfere mais na gravação (RF-IMG-11 / RNF-11/12)
- **Preview em camadas**: redesenhar o caminho inteiro a cada quadro era o maior
  gasto de CPU do app durante a gravação (medido com um raster de 270 mil
  trechos: **~300 ms por quadro**, até 719 ms — a CPU ficava em 100 % e o envio
  para o GRBL atrasava, travando a máquina no meio do movimento). Agora a
  camada **estática** (área de trabalho + `G0` + queima) é pintada uma vez por
  programa/vista/tema e o **trecho já executado é incremental** (só o que
  terminou desde o quadro anterior): **~3 ms por quadro** (máx. 6 ms).
- **Progresso do job no IPC a ~10 Hz** (`PROGRESS_INTERVAL_MS`): antes cada
  `ok` (um por linha, centenas por segundo) emitia um evento de progresso ao
  renderer. O último evento (fim/início) é sempre entregue.
- **Barra de status com altura fixa**: progresso/DTG/restante mudam de largura
  durante o job e a barra quebrava linha, encolhendo o preview a cada
  atualização (o desenho “pulsava”). Em janelas estreitas o “Restante”
  (`≤1040 px`) e o “Para ir” (`≤980 px`) saem antes de espremer o DRO.

### Added — grade de teste de material (material test grid)
- Novo módulo puro `src/shared/materialTest.ts` + 9 testes: gera uma grade de
  quadrados, cada um com uma combinação distinta de velocidade (F) e potência
  (S), com zig-zague, cabeçalho com a legenda (índice → velocidade/potência)
  e retorno à origem.
- Modal **Ferramentas → Grade de teste de material…** (640 px, duas colunas
  de campos) com colunas/linhas, faixas de velocidade e potência, tamanho da
  célula, espaçamento, passadas e modo (M3/M4). **Gerar e visualizar**
  carrega a grade no preview; **Salvar .gcode…** grava o arquivo.
- `build:materialTest` no pipeline de build (bundle `public/materialTest.js`,
  global `GRBL_MATERIAL_TEST`).

### Changed — modal "Posicionar a gravadora" (sem rolagem, duas colunas)
- Diálogo ampliado (920 px) em **duas colunas**: "Mover a cabeça" (pad de jog 3×3
  + definir/ir para origem) e "Conferir a área" (desenhar contorno + marcar
  centro, dica e parâmetros de gravação). Cabe sem barra de rolagem a partir
  de 1024×700 (medido).
- Rodapé com a ação principal à direita (Fluent) e o status à esquerda;
  fechar por um ícone `✕` no cabeçalho.
- Rótulo da potência renomeado para "Potência da gravação (%)" (o valor
  alimenta o `S-max` do job), deixando claro que o contorno continua usando
  laser bem fraco (S=5).

### Changed — envio do job em “janela” (contagem de caracteres)
- O envio era **estritamente send-response**: a próxima linha só saía depois do
  `ok`. Como o `ok` só chega após a ida-e-volta pelo USB-serial (latência do
  driver + agendamento do SO), qualquer carga no PC **esvaziava o buffer do
  GRBL** e a máquina parava no meio do movimento (queima irregular e mais lenta).
- Agora o `GrblClient` mantém uma **janela** de linhas sem `ok` limitada em
  **bytes pelo buffer RX da própria máquina**, lido de `[OPT:…]` na resposta do
  `$I` (padrão 128 B) — e, além disso, nunca mais linhas que a profundidade do
  planner. O GRBL segue no controle do fluxo, o buffer nunca estoura e o envio
  continua cheio mesmo com a CPU ocupada.
- O job só é dado como **concluído quando o último `ok` chega** (enviar ≠
  executar) — e **nunca em pausa**, para o operador não perder o **Retomar**.
- Em pausa (feed hold) o envio do job para; ao retomar, continua de onde estava.
  O vigia de "sem resposta" também fica desligado durante a pausa: o GRBL deixa
  de confirmar enquanto está em hold, e isso **não** é falha.
  `cancelar`/soft reset e `ALARM:` descartam a janela (a máquina limpou a fila).
- Consultas (`$$`, `$I`, `$G`…) continuam saindo **uma por vez e com a janela
  vazia**, para o corpo da resposta não se misturar com os `ok` do job.

### Added — mais velocidade de gravação (RF-IMG-11)
- **Varredura bidirecional (zigue-zague)**, agora padrão (`engrave.bidirectional`
  / caixa **Bidirecional**): a linha seguinte é gravada no sentido inverso, sem
  o `G0` de retorno. Num raster de 60×45 mm a 10 linhas/mm o deslocamento cai de
  28 749 mm para 8 343 mm e o tempo estimado de 10 min para 6 min.
- **Linhas inteiras em branco são puladas** (margens da imagem) e a área de
  gravação (`bounds`) continua sendo a da imagem — enquadramento, “marcar
  centro” e preview não mudam.
- **Menos linhas no arquivo**: trechos consecutivos que resultam no **mesmo `S`
  e `F`** viram um único `G1`, e `M5`/rearme (`M4`/`M3 S0`) só são enviados
  quando o laser **estava ligado** — o modal do GRBL sobrevive aos `G0`.

### Added — aviso de velocidade acima do limite da máquina (RF-IMG-12)
- A aba Imagem mostra o **máximo dos eixos** lido da própria máquina
  (`$110`/`$111`) e avisa quando a velocidade pedida — já contando a
  **velocidade no claro** — passa desse valor: acima do limite o GRBL corta a
  velocidade e a queima enfraquece (peça mais clara).

### Added — identidade visual: ícone e splash (RF-APP-4 / §13)
- **Ícone do app**: `docs/icone.png` → `build/icon.png` (512×512), usado pelo
  `electron-builder` no AppImage/.deb (atalho do desktop) e pela janela
  principal (`BrowserWindow.icon`).
- **Splash de abertura**: `docs/splash.png` → `public/splash.png`, exibido por
  `public/splash.html` numa janela frameless 738×401 (arte + barra de
  progresso indeterminada). Fecha em `ready-to-show`; fica desligado em
  smoke test e E2E (`GRBL_SMOKE_TEST`/`GRBL_E2E`).

### Added — “Marcar centro” ao posicionar (RF-PRV-6)
- O modal **Posicionar a gravadora** ganhou **Marcar centro**: leva a cabeça ao
  centro da área da imagem com `M5` + `G0` (**laser desligado**), para conferir
  com a ponta do laser onde será o centro antes de gravar.
- O modal passou a usar a caixa do G-code aberto quando não há imagem gerada na
  sessão (contorno/centro também funcionam para arquivos `.gcode`).
- Segurança (RF-STA-5): os botões que movem/enviam G-code no modal (jog, homing,
  definir origem, ir para origem, contorno, centro e gravar) ficam desabilitados
  durante job/pausa e em `Alarm`/`Door`.
- O conteúdo do modal ganhou **corpo rolável** (`.modal-body`) com espaçamento:
  em janelas baixas os botões não se sobrepõem mais e as passadas ficam
  acessíveis por rolagem.

### Changed — botão ◐ (Aparência) saiu da barra
- Tema e idioma continuam no menu **Exibir** (submenus **Tema**/**Idioma**); o
  modal **Aparência e idioma…** (que também guarda a pasta de arquivos) abre
  por **Exibir → Aparência e idioma…**.

### Changed — barra de controles da gravação (RF-GC-4/8)
- **Pausar / Retomar / Cancelar** agora ficam numa **barra flutuante fixa**
  (`#jobBar`, `body.job-active`) visível durante todo o job, em qualquer aba e
  **sobre o Assistente** — antes os botões só existiam dentro da aba “Execução”.
  Mostra o estado (Gravando…/Pausado) e o progresso (`linhas (%), restante`).
  A antiga alternância Pausar/Retomar virou dois botões explícitos.
- `Cancelar` (`run.cancel`) preserva a função de parada de emergência
  (`Esc`/`Ctrl+X` continuam valendo).

### Changed — “Modo Básico” virou **Assistente** (RF-APP-4/§15)
- O botão no cabeçalho da barra lateral agora é **“Assistente”** (aceso enquanto
  o guia está aberto, `aria-pressed`) e o cartão do guia tem o título
  “Assistente — guia iniciante”. O antigo par “Básico/Avançado” sai da UI;
  a preferência interna segue em `prefs.mode` (`basic`/`advanced`).
- Chaves de i18n renomeadas (`mode.open/close/title` → `assistant.*`).

### Fixed — preview durante a gravação (RF-PRV-3)
- O **crosshair** (posição do laser) e o **DTG** agora usam a **posição de
  trabalho** correta: `WPos` quando o GRBL informa, senão `MPos − WCO`. Antes,
  quando o status vinha só com `MPos`, a cruz aparecia deslocada do desenho (o
  `G92`/origem de trabalho era ignorado). O **DRO** passou a mostrar a mesma
  posição, ficando consistente com o preview.
- **`WCO` é intermitente**: com `$10=1` o GRBL manda `MPos` em quase todos os
  relatórios e o `WCO` só de vez em quando (~10–30). O último `WCO` agora fica
  em cache (`state.wco`, via `GRBL_PREVIEW.workPosition`) e é aplicado a todos
  os relatórios — sem isso a cruz pulava para `MPos` entre um `WCO` e outro.

### Fixed — preview de imagem virava um bloco maciço (RF-PRV-5)
- O parser agora lê a **potência `S` modal** de cada trecho (`moves[].s`) e o
  preview desenha a queima com **alfa/briho proporcional ao `S`** (12 níveis,
  um stroke por nível). Antes toda linha `G1` saía na mesma cor e uma gravação
  line-to-line aparecia como um retângulo azul; agora a imagem aparece como
  será gravada. Vale também para arquivos gerados antes desta mudança.
- O trecho já executado mantém a **cor por passada**, agora com a mesma
  modulação de intensidade.

### Changed — cores por passada no preview (RF-PRV-5 / RF-GC-6)
- O trecho já gravado é desenhado **com uma cor por passada** (paleta com o
  “ok” do tema + 6 cores). Com múltiplos passes os caminhos são os mesmos, e a
  cor distinta evita perder a referência de onde o laser está; a passada
  corrente fica por cima das anteriores.
- O gerador marca cada passada com `; pass N/M` (só quando `passes > 1`) e o
  parser (`parseGcode`) associa `moves[].pass`; a legenda mostra
  “Passada N/M” com a cor corrente.

### Added — requisitos pendentes das Fases 2/3/7 (RFs + RNF-9)
- **RF-STA-5** (segurança): em `Alarm`/`Door`, a UI desabilita o que move
  (jog, homing, origem, ir p/ zero, play e macros) e mantém `Unlock ($X)`/`Reset`;
  o `runHint` mostra a ação recomendada.
- **RF-STA-4**: cada código de alarme ganhou uma **ação recomendada** localizada
  (`alarmfix.1`…`alarmfix.9`) exibida no console junto da causa.
- **RF-STA-2**: novo campo **DTG** ("para ir") na barra de status — distância até
  o fim do segmento em execução (cursor amortizado sobre o preview).
- **RF-STA-7**: **histórico persistente de alarmes** (até 100 entradas em
  `prefs.alarmHistory`), com card dedicado e limpeza.
- **RF-CON-5**: ao conectar, lê `$I` e `$G` (serializado com `$$`) e mostra
  firmware/estado modal no console.
- **RF-CON-14/15**: barra do console com **pausar rolagem**, **limpar** e
  **salvar log** (diálogo nativo `.log`/`.txt`).
- **RF-GC-2/5**: tempo **estimado** no rótulo do arquivo (novo puro
  `estimateSeconds` em `shared/preview.ts`, com `feed` por movimento) e tempo
  **restante** no progresso do job.
- **RF-JOG-2**: jog **contínuo** ao segurar o botão (toque = passo; ≥ 250 ms =
  movimento até soltar, cancelado com o byte de tempo real `0x85`).
- **RF-JOG-6**: atalhos de teclado (setas = X/Y, `Home` = homing) ignorados em
  campos de texto e overlays.
- **RF-CFG-4**: **perfis de configuração** — salvar/reaplicar/remover conjuntos
  de `$$` (`prefs.settingProfiles`).
- **RF-CFG-5**: preferência de **pasta de arquivos**, usada como `defaultPath`
  dos diálogos (memoriza a última pasta automaticamente).
- **RNF-9**: **log persistente de sessão** (`main/services/SessionLog.ts` →
  `<userData>/logs/session-*.log`, escrita agrupada) + menu **Ajuda → Abrir pasta
  de logs**.

### Fixed — correções da revisão do DoD
- **Abas de `$$`**: o seletor `#settingsOverlay .tabs .tab` não captura mais as
  abas da sidebar — clicar em “Imagem”/“Execução” durante um job não disparava
  mais um `$$` (que, com a gravação em curso, podia interromper o corte).
- **Aborto por erro colateral**: `GrblClient.onNack` só aborta o job quando a
  linha rejeitada **é do job**; um `error:` de comando avulso/consulta não
  interrompe o corte.
- **Classificação**: `[MSG:…]` é checado **antes** do `ok`, então um aviso que
  contenha “ok” (ex.: `[MSG:Jog ok]`) não é confundido com um ACK (mantém o
  envio send-response).
- **DTG (RF-STA-2)**: usa `WPos` (coordenadas de trabalho, como o crosshair) e o
  preview do arquivo aberto passa as linhas já filtradas, alinhando
  `moves[].line` com `state.doneFile` — sem desvio em arquivos com linhas vazias.
- **RF-GC-2**: o rótulo do arquivo agora inclui o **tamanho** (`file.info*`).
- **RF-STA-7**: só erros/alarmes do GRBL (com código) entram no histórico.
- **RF-JOG-6**: `PageUp`/`PageDown` fazem jog de Z (setas = X/Y, `Home` = homing).
- **Acessibilidade (DESIGN §5)**: alvo de clique mínimo de 32 px; `Esc`/`Ctrl+X`
  acionam a parada do job; `Esc` fecha overlays (um único handler, respeitando
  campos de texto); rótulo do console re-sincroniza ao trocar de idioma.
- **`SessionLog`**: `close()` é final (sem timer órfão nem novas linhas).
- **Type-check** passa a cobrir `tests/` e `e2e/` (`tsconfig.test.json`).

### Added — testes
- `tests/preview-estimate.test.ts` (tempo estimado), `tests/prefs-store.test.ts`
  (sanitização de perfis/histórico/pasta) e `tests/session-log.test.ts`.
- `tests/grbl-client.test.ts`: `cancelJog` (`0x85`) e ação recomendada no alarme.
- `tests/protocol.test.ts`: campos parciais do status (`F`, `Pn`, `Bf`, extra) e
  casos de borda de `classifyLine` (cobertura do protocolo → 100 % linhas).
- `tests/preview.test.ts`: atribuição de `moves[].pass` pela marca `; pass N`
  (incluindo a forma entre parênteses e arquivos sem marca);
  `tests/image-gcode.test.ts`: marcadores `; pass N/M` e invariante de `M5`
  antes de `G0` tolerando linhas de comentário.

### Added — qualidade e distribuição (Fase 7/8)
- **Cobertura** do núcleo do protocolo (`shared/protocol.ts`, `shared/preview.ts`)
  com limiares de **80 %** em `vitest.config.ts`; script `npm run test:coverage`.
- **E2E Playwright + Electron** (`e2e/app.spec.ts`, `playwright.config.ts`):
  abre o app real com `userData` temporário, valida console, modal de Aparência
  e troca de idioma em tempo de execução; script `npm run test:e2e`.
- **CI**: novo job `e2e` (xvfb) e passo de cobertura no job `quality`.
- **Release automatizada**: `.github/workflows/release.yml` publica AppImage+deb
  no GitHub Releases em tags `v*` (e só artefatos via `workflow_dispatch`).
- **Flatpak** (RF-APP-4, “Could”): esqueleto em `build/flatpak/` (manifesto +
  lançador `zypak-wrapper` + README) e script `npm run package:flatpak`.
- Docs atualizadas: `DEVELOPMENT.md` (testes/cobertura/E2E/CI/Flatpak).

## [0.4.0] - 2026-10-17

### Added — temas (RF-APP-1): 11 temas claro/escuro/alto contraste
- `shared/themes.ts`: catálogo único dos **11 temas** (5 claros: `light`,
  `solarized-light`, `sand`, `arctic`, `silver`; 4 escuros: `dark` (padrão),
  `midnight`, `solarized-dark`, `oled`; 2 de alto contraste: `hc-black`,
  `hc-white`), com variante, rótulo i18n e amostra para o picker.
- `public/tokens.css` ganhou blocos `html[data-theme="…"]` que **só sobrescrevem
  variáveis** (zero CSS duplicado). Nos temas de alto contraste as cores são
  sólidas, o foco usa `outline: 3px` e as sombras são desligadas.
- Modal **Aparência e idioma** (`◐` na barra superior) e menu **Exibir → Tema**;
  a escolha persiste em `prefs.theme` (validada por `isThemeId`) e é aplicada em
  `<html data-theme>` antes do primeiro paint.

### Added — i18n (RF-APP-2): pt-BR, en e es
- `shared/i18n/{pt-BR,en,es}.ts` (484 chaves por idioma); `en`/`es` usam
  `satisfies Record<keyof typeof ptBR, string>` — o type-check recusa chave
  faltando/sobrando (paridade reforçada em `tests/i18n.test.ts`).
- Núcleo puro e compartilhado (`shared/i18n/index.ts`): `t`/`hasKey`/
  `setLocale`/`detectLocale`/`slugify`. O `main` traduz menu nativo, diálogos e
  as mensagens de alarme/erro reclassificadas em runtime; o renderer usa
  `t()` + `data-i18n*` (`applyDom`).
- Bundle `public/i18n.js` (esbuild, IIFE `GRBL_I18N`, sem dependências).
- Idioma do SO detectado na 1ª execução (`app.getLocale()` → `detectLocale`);
  a troca em tempo de execução atualiza a UI **e** o menu nativo, e persiste em
  `prefs.lang`.

### Added — identidade do app (RF-APP-6/7)
- **Barra inferior** com nome, versão e crédito "Desenvolvido por WerneckLab"
  (link para `lab.werneck.dev.br`).
- Menu **Ajuda → Sobre**: modal com nome, versão, licença (MIT), autor e links
  (WerneckLab/GitHub). A versão vem de `app.getVersion()` via IPC `app:info`
  (nunca hardcoded). `shared/appInfo.ts` centraliza os metadados e a whitelist;
  links externos abrem por `shell.openExternal` apenas para `https:` de hosts
  na whitelist (`lab.werneck.dev.br`, `github.com`, via `isAllowedExternalUrl`);
  a janela também nega navegação e abertura de janelas pelo renderer
  (`will-navigate`/`setWindowOpenHandler`).
- `main/menu.ts`: menu nativo (Exibir/Tema/Idioma/Ajuda→Sobre) reconstruído no
  idioma e tema ativos.

### Changed — documentação em 3 idiomas
- `README.md` revisado + `README.en.md` e `README.es.md`; `PRODUCT_SPEC.md`
  (RF-APP-1/2/3 atualizados; RF-APP-6/7 novos), `DESIGN.md` (§2.3, §6, §8),
  `ARCHITECTURE.md` (§6.1) e `PLANO_DE_ACAO.md` (Fase 7).

### Changed — build
- `package.json`: script `build:i18n` integrado ao `build`.
- Biome ignora os bundles gerados `public/*.js` (listados em `biome.json`);
  `public/renderer.js` continua sendo fonte e permanece no lint. Modal **Sobre**
  e links do rodapé usam `<button>` (a11y) em vez de `<a href="#">`.

### Fixed
- `PrefsStore.sanitize`: preserva `machineProfile` ao validar as preferências.

## [0.3.0] - 2026-10-16

### Added — catálogo de máquinas (perfis GRBL)
- `MACHINE_PROFILES` com 23 modelos (Sculpfun, Ortur, AtomStack, TwoTrees,
  FoxAlien, Genmitsu, Comgrow, xTool, Creality, Wainlux, AlgoLaser, NEJE,
  Longer, Vevor, OMTech) + **Genérico GRBL**: área útil, homing, potência do
  módulo, linhas/mm, modo M3/M4 e notas de foco/manutenção.
- Seletor **Perfil de máquina** no topo da barra lateral; a escolha persiste.
- Selecionar o perfil ajusta área de trabalho, módulo (3W/5W/10W) e avisos.
- Planejamento completo em `PLANO_DE_ACAO.md` §14.

### Added — Modo Básico (wizard para leigos) — §15
- Toggle **Básico / Avançado** no cabeçalho, persistido (`prefs.mode`).
- Wizard de **6 passos** em modal que bloqueia a tela: Conectar → Escolher
  imagem → Tamanho/tipo/material → Gerar G-code → Posicionar → Gravar.
  Cada passo mostra só o necessário; **Próximo** só habilita quando o passo
  foi cumprido.
- Os campos são espelhos dos controles avançados (`imgWidth`, `imgAlgorithm`,
  perfis de material), então o G-code gerado é idêntico ao do modo Avançado.
- Documentação do fluxo em `docs/MODO_BASICO.md`.

### Added — perfis de material 3W (Sculpfun C1)
- `shared/materials.ts` ganhou o módulo **3W** com a matriz do manual da
  Sculpfun C1 (§6): kraft, compensado, madeira, bambu, alumínio, cortiça,
  couro, silicagel, feltro e lata.

### Changed — G-code: fundo branco nunca vira G1
- Trechos com `S=0` sempre viajam com `G0` (laser desligado), para trechos
  curtos e longos — menos queima fantasma e job mais curto.
- Removido o limiar `gapThresholdMm` (o `G0` é sempre preferível a um `G1 S0`).

### Changed — protocolo p/ firmware "sujo" (Grbl 1.3a)
- `GrblClient.onData` descarta caracteres de controle espúrios sem usar regex
  de classe de caracteres (evita falso positivo com bytes multibyte).
- Desconexão iniciada pelo usuário (`disconnect()`) não emite mais "Conexão
  encerrada" como erro.

### Changed — UX
- Após conectar, a aba **Imagem** abre automaticamente (o botão *Gerar
  G-code* fica à vista).
- Wizard: título/status alinhados ao conteúdo real de cada passo; **Concluir**
  habilitado no passo 6; nome da arquivo exibido no passo 2.

### Fixed — wizard do Modo Básico
- Botão **Próximo** avançava **dois passos** por clique (havia dois listeners
  registrados para o mesmo botão).
- Painel do passo 3 (tamanho/tipo/material) nascia com `hidden` e nunca era
  reexibido.

## [0.2.0] - 2026-10-16

### Added — Empacotamento Linux (RF-APP-4) e permissões de porta (RF-APP-5)
- `electron-builder.yml` + scripts `package`/`package:linux`: gera
  `release/GRBL Studio-0.1.0.AppImage` e `release/grbl-studio_0.1.0_amd64.deb`,
  com rebuild automático de `serialport` (`@electron/rebuild`).
- `docs/DEVELOPMENT.md`: instruções de build/release e de permissão de porta
  serial no Linux (grupo `dialout`, udev) para RF-APP-5.
- `release/` incluído no `.gitignore`.

### Added — RF-CON-7: conexão WiFi (TCP)
- `services/TcpTransport.ts`: transporte sobre `node:net` para ESP8266/ESP32 com
  firmware serial-over-TCP (Telnet 23), com a mesma interface do
  `SerialTransport` (`data`/`open`/`close`/`error`, `writeLine` com `\n` e
  `writeRealtime` sem `\n`).
- `ConnectOptions` ganhou `kind: 'serial' | 'tcp'` + `host`/`tcpPort`;
  `GrblClient` escolhe o transporte por `defaultTransportFactory`.
- UI: seletor de transporte no card **Conexão** (Serial/WiFi) com campos de
  host/porta; a escolha e as credenciais persistem em `prefs.json`.
- Testes: `tests/tcp-transport.test.ts` (servidor TCP local).

### Added — RF-MAC-1/2: macros e botões customizados
- `shared/macros.ts` (puro, empacotado como `public/macros.js`): modelo de
  macro (`id`, `label`, `gcode`, `group`), conjunto padrão, `macroLines`,
  `sanitizeMacros`, `parseMacroFile` e `serializeMacros` (import/export JSON de
  lista ou `{ "macros": [...] }`).
- Card **Macros** no painel: botões agrupados (executam as linhas uma a uma pela
  fila `send-response`), editor inline (rótulo, grupo, G-code, remover),
  adicionar, restaurar padrão, importar/exportar via diálogos nativos
  (`file:open-macros` / `file:save-macros`).
- Macros persistem em `<userData>/prefs.json` (campo `macros`).
- Testes: `tests/macros.test.ts`.

### Added — RF-GC-7: retomada de job interrompido
- `shared/resume.ts` (puro, empacotado como `public/resume.js`): reconstrói o
  estado modal vigente antes da linha escolhida (`G17`–`G19`, `G20/G21`,
  `G90/G91`, `G90.1/G91.1`, `G93/G94`, `G54`–`G59`, `M3/M4/M5`) e devolve
  `[M5, …modais…, …cauda…]`. `M3` é reafirmado como `M3 S0` para o laser não
  acender parado; `suggestStart(done, N)` sugere `done − N`.
- Card **Retomada** no painel de execução: mostra a linha interrompida, aceita a
  linha inicial, sugere N linhas antes e reinicia o job com o preâmbulo. O
  preview destaca o trecho pelo índice no arquivo (compensando o preâmbulo).
- Testes: `tests/resume.test.ts` (12 casos).

### Added — Fase 3: configurações `$$`, consultas e preferências
- **`GrblClient.query()`** (RF-CFG-1/2/3): envia uma linha e devolve as respostas
  até o `ok`, preservando o *send-response*. `$$`, `$n=valor`, `$#`, `$I` e `$G`
  passam pelo mesmo caminho; erro/alarme/timeout rejeitam a consulta.
- **Editor de `$$`** (RF-CFG-1/2/6): modal agrupa os parâmetros por função,
  mostra nome + ajuda contextual (`shared/grblSettings.ts`) e o espaço `$n`
  remonta a lista. A edição de um campo reenvia só aquele `$n=valor`.
- **Consultas especiais** (RF-CFG-3): abas exibem `$#` (offsets), `$I` (build)
  e `$G` (estado modal) via `window.grbl.querySpecial`.
- **Preferências** (RF-CFG-5, RF-CON-3): `PrefsStore` grava
  `<userData>/prefs.json` (tema, unidade, porta/baud, auto-conexão). No boot a
  UI restaura tema/unidade/porta e reconecta à última porta (`autoConnect`).
- **Unidade mm/pol na UI** (RF-APP-3, exibição): o seletor na barra de status
  converte o DRO (in = mm/25,4). O G-code segue em mm para não reinterpretar
  jogs/comandos.
- **Área de trabalho** (RF-GC-9): a leitura de `$130/$131` alimenta o aviso do
  preview quando o caminho sai da área — inclusive ao editar esses valores.
- Testes: `tests/grbl-settings.test.ts`; `tests/grbl-client.test.ts` cobre
  `query()` (sucesso, erro, timeout, concorrência e desconexão).

### Added — Fase 4: overrides e preview 2D
- **Overrides em tempo real** (RF-OVR-1…4): override de feed (0x90–0x94),
  potência/spindle (0x99–0x9d) e deslocamento rápido em 3 níveis (0x95–0x97).
  A UI mostra os valores ativos lidos do status (`Ov:`) e oferece reset.
- **Preview 2D do caminho** (RF-PRV-1…5): parser puro de G-code
  (`shared/preview.ts` → bundle `public/preview.js`) interpreta G0/G1/G2/G3,
  G20/G21, G90/G91, G90.1/G91.1, G92, comentários e números de linha, com
  segmentos em mm. O canvas desenha rápidos × queima, caixa delimitadora e
  área de trabalho, com zoom/pan (roda, arrastar) e crosshair ligado ao status.
  Durante o job, o trecho já executado é destacado por progresso (RF-PRV-5).
- Testes: `tests/preview.test.ts` (parser completo).

### Added — RF-GC-6: múltiplos passes
- Campo **Passadas** (1–99) no card de imagem. O emissor repete todo o caminho
  de queima N vezes, desligando o laser (`M5`) e voltando ao início entre
  passadas. Vale para os três algoritmos (`line`, `dither`, `vector`).
- `passes` entra em `ImageToGcodeOptions` (padrão 1, sem regressão); as
  estatísticas (queima, deslocamento, tempo) somam todas as passadas.

### Added — RF-IMG-8: perfis de material
- `shared/materials.ts` reproduz as matrizes do manual da COMGO Z1 (§9.1, 5W;
  §9.2, 10W): potência (%), velocidade (mm/min) e notas (preparo de superfície,
  nº de passadas) por módulo × ação × material.
- Seletor **Perfil de material** no card de imagem: escolher módulo (5W/10W),
  ação (gravação/corte) e material preenche **Velocidade** e **S-max**
  (`powerPercentToS`, referência `$30 = 1000`) e mostra a recomendação do manual.
- Exposto ao renderer como `public/materials.js` (esbuild, `global-name=GRBL_MATERIALS`),
  seguindo o mesmo padrão do worker; artefato de build (`.gitignore`).
- Testes: `tests/materials.test.ts` (integridade da matriz, busca e conversão %→S).

### Added — CI (GitHub Actions)
- `.github/workflows/ci.yml` com dois jobs em cada push para `main` e PR:
  **quality** (`npm ci` → Biome lint → `tsc` → Vitest com `socat` instalado →
  build) e **smoke** (Electron headless sob `xvfb`, esperando `SMOKE_OK`).
- Badge de status no `README.md`; seção "Integração contínua" no
  `docs/DEVELOPMENT.md`.

### Added — Fase 0: licença, CONTRIBUTING e lint/format
- **Licença MIT** (`LICENSE`, campo `license` no `package.json`).
- `CONTRIBUTING.md` com setup, Definition of Done e regras de estilo.
- **Biome** como linter + formatter (`biome.json`, scripts `lint`, `lint:fix`,
  `format`, `format:check`). A stack ESLint + `typescript-eslint` é inviável
  com o **TypeScript 7** (compilador nativo, sem API JS); o Biome traz parser
  próprio. Config equivalente ao estilo do repo (aspas simples, `;`, 2 espaços,
  80 colunas); `style/noNonNullAssertion` desativada de propósito.

### Changed — Fase 0: documentação unificada (B9)
- Removidas duplicatas exatas: pasta `leia/` e `docs/manual laser gbrl.pdf`
  (md5 idênticos a `docs/comgo_z1_lasergrbl_user_manual.md` e
  `docs/lasergrbl-manual.pdf`), mais o índice secundário `docs/README_MAIN.md`.
- `docs/README.md` atualizado (referência única ao PDF do LaserGRBL).

### Changed — formatação
- Código formatado com Biome e correções seguras de lint (`useTemplate`,
  `useOptionalChain`, `Number.isFinite`), sem mudança de comportamento.
- `public/index.html`: `lang="pt-BR"` e `type="button"` nos botões (a11y).

### Added — RF-IMG-6: vetorização (contorno / recorte)
- Novo algoritmo **`vector`** no card "Imagem → G-code": gera só o contorno
  da forma (recorte/line-art) em vez de varredura raster.
- Traçador de contorno próprio e puro em `src/shared/image/contour.ts`:
  arestas do quadrado de cada pixel de matéria (vizinhança 4), resolução de
  canto de sela (dois pixels na diagonal ficam em laços separados),
  simplificação Ramer–Douglas–Peucker e área por fórmula do sapato.
  Sem dependência externa (`potrace` dispensado).
- `src/shared/image/vector.ts`: limiar pelo **Limiar B&W** (mesmo ajuste do
  modo B&W), ilhotes de 1 px descartados como ruído, conversão canto de pixel
  → mm exata dentro da área pedida e emissão fechada a `S-max` com as
  invariantes de sempre (M5 antes de G0, sem F em G0, 3 decimais).
- `src/shared/image/format.ts` compartilhado pelos dois emissores
  (`formatCoord`, `MAX_S` e a invariante da área de trabalho).
- UI: opção "Vetorizar (contorno / recorte)", campo **Suavização (px)**
  (padrão 0,5) e ocultação automática de Linhas/mm, Direção e Ponto no modo
  vetor (e da suavização nos modos raster). Estatísticas agora mostram
  "N contornos".
- **18 testes novos** (`tests/image-contour.test.ts`): pixel único, bloco,
  furo (2 contornos), canto de sela, borda da imagem, simplificação, mapeamento
  exato px → mm, invariantes de G-code e filtro de ruído.

### Changed — preview do modo vetor mostra o contorno de verdade
- O preview do modo `vector` desenhava só a grade binária da matéria
  (blocos preenchidos), então parecia igual à varredura raster e não dava
  para ver o caminho de corte. Agora o worker devolve os contornos
  (`contourPaths`, 0..1, comprimento-prefixado) e o preview os traça em
  `--accent` sobre a grade, que fica discreta (alpha 0,22). Só no modo vetor;
  os modos raster não mudam.

### Added — Fase 5 (parcial): preparação de arquivo (imagem → G-code)
- Pipeline **puro** em `src/shared/image/*` (100 % testável): `adjust.ts`
  (grayscale com composição sobre branco, brilho, contraste, white clip,
  inversão, B&W), `dither.ts` (Floyd–Steinberg + limiar), `raster.ts`
  (geometria de varredura + reamostragem bilinear) e `gcode.ts` (emissão
  M3/M4, S entre `sMin` e `sMax`, gaps com `G0`, compensação do ponto do laser).
- **Web Worker** `src/renderer/gcode.worker.ts`, empacotado pelo esbuild em
  `public/gcode.worker.js` — a conversão não trava a UI (ADR-7 refinada).
- UI "Imagem → G-code": importar PNG/JPG/BMP/GIF, preview em `<canvas>`
  (retina, grade processada), dimensionar com proporção/offset, algoritmo,
  linhas/mm, direção, ponto, ajustes, velocidade, S-min/S-max e M3/M4.
- Salvar `.gcode` via diálogo nativo (`file:save-gcode`, só escreve o conteúdo
  gerado na UI — nenhum caminho vem do renderer).
- CSP com `img-src 'self' blob: data:` (necessário para `URL.createObjectURL`)
  e `worker-src 'self'`.
- **37 testes novos** (`tests/image-adjust.test.ts`, `tests/image-gcode.test.ts`)
  cobrindo invariantes críticos: posições sempre dentro da área de trabalho,
  `S` limitado a `{0} ∪ [sMin, sMax]`, `G0` sem `F`, `M5` antes de todo
  deslocamento e precisão de 3 decimais.
- Hook `SMOKE_EVAL` no modo smoke test para probes de UI headless.

### Changed — Fase 5: abertura de arquivos e clareza do fluxo
- **Diálogos nativos de abertura** substituem os `<input type=file>` crus:
  `file:open-image` e `file:open-gcode` devolvem apenas nome + bytes/texto
  (o renderer nunca informa um caminho). Filtros em `src/shared/fileFilters.ts`,
  com "Imagens (PNG, JPG, BMP, GIF, WebP, AVIF)" como filtro padrão e
  "Todos os arquivos" como fallback — acaba com o "tive que escolher todos os
  arquivos" e cobre extensões em maiúsculas (GTK é sensível a caixa).
- Botões estilizados (`Escolher imagem…`, `Abrir G-code…`) no lugar do
  `input[type=file]` nativo; a imagem aceita agora também WebP e AVIF.
- **Mensagens de estado**: `#runHint` (Execução) e `#portHint` (Serial) dizem o
  que falta — "gere o G-code", "conecte a máquina" — e `title` explica cada
  ação desabilitada. O fluxo de 3 passos (escolher imagem → gerar → conectar e
  enviar) fica explícito no card "Imagem → G-code".
- Erros de decodificação de imagem aparecem na própria UI (`#imageInfo`, em
  vermelho) em vez de só no console.
- 10 testes novos (`tests/file-filters.test.ts`).

### Fixed — Fase 5: "Manter proporção" (RF-IMG-3)
- A proporção passa a ser aplicada **ao vivo** (evento `input`), não só no
  `change` — antes, digitar a largura sem sair do campo não atualizava a altura
  e parecia que a caixa não fazia nada.
- Removida a sincronização no `change`/blur do campo: clicar em "Manter
  proporção" disparava o blur com a caixa **ainda marcada** e a medida parecia
  ser importada mesmo quando o usuário acabava de desmarcar.
- Digitando um valor transitório (campo vazio/inválido) o outro campo não é
  apagado mais.
- Re-marcar a caixa volta a travar a proporção na hora (largura como mestre).
- A escolha do travamento é persistida (`localStorage`) e explicada por um
  auxiliar em texto: "proporção travada" × "proporção livre".
- Precisão do cálculo subiu para 3 casas (mesma precisão do G-code/DRO).

### Added — Fase 1: core de comunicação confiável
- Módulo de protocolo puro `src/shared/protocol.ts`: parse de status report,
  classificação de linhas (`ok`/`error`/`ALARM`/`[MSG]`/settings), tabelas de
  alarmes e erros do GRBL 1.1, split de linhas e formatação de posição.
- `GrblClient` (`src/main/services/GrblClient.ts`) com **fila send-response**
  (só envia a próxima linha após `ok`), polling de status, watchdog de resposta,
  overrides e comandos de controle.
- `SerialTransport` (`src/main/services/SerialTransport.ts`) com line framing
  e escrita de comandos de tempo real (byte único, sem `\n`).
- Camada **IPC tipada** (`src/shared/channels.ts`, `src/main/ipc.ts`) e preload
  como `contextBridge` (`window.grbl`), empacotado com esbuild e mantendo
  `sandbox: true`.
- Renderer reescrito usando `window.grbl`: console com respostas reais da máquina,
  DRO de posição, badge de estado, progresso do job, jog via `$J=`, pausar/retomar/
  parar corretos.
- Design tokens Fluent/Windows 11 (`public/tokens.css`) e estilos base.
- Suíte de testes (Vitest): 29 testes — parser de protocolo, fila do `GrblClient`
  (transporte falso) e integração real de `SerialTransport` via PTY (socat).
- Modo smoke test headless (`GRBL_SMOKE_TEST=1`) para CI.
- Documentação: `PRODUCT_SPEC`, `PLANO_DE_ACAO`, `DESIGN`, `ARCHITECTURE`,
  índice `docs/README.md` e kit de IA (`AGENTS.md` + skills).

### Fixed
- Nenhum dado serial chegava ao renderer (B1): agora o console exibe as respostas.
- Envio de G-code era *fire-and-forget* (B2): agora é send-response com `ok` (B2).
- Comando de Feed Hold enviado com `\n` (B3): agora é o byte `!` puro.
- Jog enviava 3 comandos em uma linha (B4): agora usa `$J=`.

### Removed
- `src/main-serial.ts.bak` e o código legado em `src/main.ts`, `src/main-serial.ts`,
  `src/preload.js` (substituídos pela nova arquitetura).
