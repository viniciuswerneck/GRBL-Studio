# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

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
