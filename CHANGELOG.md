# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

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
  editar. Dois modos: **vetor (contorno)** — traça a fonte do sistema em alta
  resolução (16 px/mm) com simplificação RDP; **traço único** (Hershey Simplex).
- **Navegação**: roda do mouse = zoom no cursor, botão do meio / `Space`+arraste
  = mover a tela, `F` ajustar à página, `0` voltar a 100 %, `+`/`-` zoom.
- **Tamanho da arte**: "Gerar e visualizar" abre um diálogo de **largura × altura
  (mm)**; com o cadeado travado (padrão), preencher um lado ajusta o outro na
  mesma proporção (`Esc` fecha só o diálogo). Confirmar escala a arte a partir do
  canto superior esquerdo e gera o G-code.
- Novo módulo **puro** `src/shared/designEditor.ts` (bounds, grupos, *hit-test*,
  z-order, simplificação RDP) + **17 testes**; bundle `public/designEditor.js`
  (`GRBL_DESIGN_EDITOR`).

### Fixed — editor de desenho
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
- Removido `<div>` de overlay duplicado em `public/index.html` (desbalanceava o
  DOM e escondia o restante da página).

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
