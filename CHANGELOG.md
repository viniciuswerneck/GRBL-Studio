# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

## [0.24.0] - 2026-10-29

**Release do editor de desenho** — nova tela **Design** com biblioteca de
símbolos, migração incremental das views para Svelte 5 e site multilíngue.

### Added — Tela Design + Biblioteca de Símbolos (RF-DSN-27)

- **Tela Design** (`DesignView.svelte`): canvas vetorial com zoom/pan,
  seleção múltipla, arraste, exclusão e inserção de símbolos por clique ou
  arraste, com tamanho configurável em mm.
- **Biblioteca de símbolos**: 14 símbolos prontos em 3 categorias (básicas,
  natureza e decorativas) — estrelas, hexágono, coração, raio, seta, lua, sol,
  moldura, cantos, check, cruz, xis e divisória.
- **FAB flutuante**: botão de atalho para abrir a biblioteca de símbolos de
  qualquer tela.

### Added — Migração incremental para Svelte 5 (Fase 4)

- `App.svelte` com **7 views** (connection, jog, file, preview, config, image,
  design) e 13 componentes Svelte 5 (ThemeProvider, I18nProvider, AppShell,
  NavRail e views).
- Chaves i18n da tela de conexão (`connection.*`) nos três catálogos.
- A UI de produção continua no renderer vanilla (`public/renderer.js`) até o
  cutover; ver `PROGRESS.md` e `docs/SVELTE_MIGRATION_GUIDE.md`.

### Added — Site multilíngue

- Landing page em **pt-BR, en e es** (`site/assets/i18n/*.json`), com seletor
  de idioma acessível (combobox/listbox, navegação por teclado).
- Links de download apontando para a página de releases do GitHub.
- Crédito ao WerneckLab no rodapé.

### Fixed

- **E2E flaky**: teste `fila grava os dois programas` — o emulador passou a
  atrasar cada `ok` (120 ms) para a barra "Parar fila" aparecer antes da
  asserção de visibilidade.
- **Lint/CI**: formatação Biome de `public/renderer.js`, `src/main/ipc.ts`,
  `site/*` e componentes Svelte; a11y do seletor de idioma do site.
- **Seletor de idioma**: `aria-expanded` agora fica no botão que controla o
  dropdown (antes estava no contêiner e não era atualizado).

## [0.23.0] - 2026-10-26

**Release de infraestrutura e fundação** — automação completa de release, migração para electron-vite, Flatpak, guia de primeiros passos, checklist de hardware, splash animado e base Svelte 5.

### Added — Release Automation (P0-4)
- **Workflow GitHub Actions completo** (`.github/workflows/release.yml`): build, lint, typecheck, testes unitários + E2E, benchmark informativo, empacotamento AppImage + deb, changelog automático e publicação em GitHub Releases (Flatpak é build manual em `build/flatpak/`).

### Added — Getting Started Guide (P0-5)
- **`docs/GETTING_STARTED.md`**: guia completo em 11 seções (instalação AppImage/deb/Flatpak, permissão `dialout`, onboarding 5 passos, conectar máquina, carregar arquivo/imagem/desenho, preview/posicionamento, gravar, troubleshooting, FAQ, links úteis).

### Added — Hardware Checklist Automatizado (P1-3)
- **`scripts/hardware-checklist.mjs`**: CLI com 10 testes sequenciais (conexão, homing, jog, job 5/10 min, pause/resume/stop, alarme, overrides, retomada, fila) + relatório JSON.
- **Workflow CI** (`.github/workflows/hardware-check.yml`): execução manual + semanal em runner com hardware real.

### Added — Electron-Vite + Svelte 5 Base (P1-5 / P0-1 fundação)
- **`electron.vite.config.ts`**: config unificada (main, preload, renderer) com aliases `@shared`, `@main`.
- **`src/renderer/vite.config.ts`**: renderer Svelte 5 (runes) + `@sveltejs/vite-plugin-svelte`.
- **Providers reativos**: `ThemeProvider` (11 temas Fluent/Win11) + `I18nProvider` (pt-BR/en/es).
- **Store centralizado**: `connectionStore` (runes) para IPC tipado.
- **Componentes base Fluent**: Button, Select, Card, Badge, Spinner, NavRail, AppShell.
- **Tela Conexão**: `ConnectionScreen.svelte` completa (porta, baud, 30+ perfis, badge animado, status grid).
- **Guia migração**: `docs/SVELTE_MIGRATION_GUIDE.md` (plano 8 semanas, componentes, bloqueadores).

### Added — Flatpak (P0-2)
- **`build/flatpak/com.grblstudio.app.yml`**: manifesto completo com `zypak-wrapper`, udev rules, desktop file, ícone 256x256.
- **`build/flatpak/README.md`**: instruções dev + CI/CD Flathub + troubleshooting.

### Added — Splash Animation (P2-5)
- **`public/splash.html`**: fade-in 300ms + slide up 20px, logo pulse sutil, progress bar indeterminada, versão dinâmica, `prefers-reduced-motion`.

### Added — Acessibilidade + Benchmarks Base (P1-2, P1-4)
- **`src/renderer/test/a11y.setup.ts`**: axe-core WCAG 2.1 AA (color-contrast desabilitado para temas HC).
- **`vitest.bench.config.ts` + `scripts/check-bench.mjs`**: thresholds CI (startup ≤1.8s, PSS X11≤300MB/Wayland≤320MB, IPC p95≤20ms).

### Changed
- **Build unificado**: `package.json` scripts simplificados (`build` → `electron-vite build` + preload + worker); 30+ scripts `build:*` legados consolidados.
- **Package.json**: novas deps `electron-vite`, `@sveltejs/vite-plugin-svelte`, `svelte`, `vitest-axe`, `@testing-library/svelte`.
- **TypeScript**: `tsconfig.json` paths `@shared/*`, `@main/*`; renderer excluído do typecheck principal.
- **i18n**: catálogos pt-BR/en/es atualizados com chaves novas (tema, conexão, splash, a11y).

### Fixed
- **E2E flaky**: teste "fila grava dois programas" (timing do botão "Parar fila") — conhecido, será corrigido em P1-1.

## [0.22.0] - 2026-10-21

Fecha a **fila ativa**: o **centerline** (imagem → linha única) era o último
item de software puro do backlog. Agora o logo de traço grosso vira um desenho
de **uma passada só**, no centro do traço, em vez do contorno duplo.

### Added — centerline (RF-IMG-16)

- Novo algoritmo **“Linha única (centerline)”** na Conversão da aba Imagem:
  reduz cada traço ao seu **esqueleto de 1 px** (afinamento de Zhang–Suen) e
  emite **polilinhas abertas** no G-code. Serve para letras, logos e carimbos
  desenhados com traço grosso — mais rápido e mais fino que vetorizar o contorno.
- **Ramo mínimo (px)** poda esporões curtos do esqueleto (ruído do afinamento) e
  a **Suavização (px)** tira o degrau de 1 px (RDP) preservando as duas pontas.
  Imagens grandes são reduzidas só para esqueletizar (até 900 px no maior lado);
  um traço fino de 1 px **não desaparece** na redução (bloco escuro = matéria).
- O preview desenha os **traços abertos** (o contorno fechado continua fechado)
  e as estatísticas contam **traços** em vez de contornos.
- O Assistente ganhou o tipo **“Linha”** ao lado de Foto/P&B/Contorno.

### Changed

- O afinamento reavalia só a **lista de borda** (o custo acompanha o perímetro,
  não a área): sólidos grandes não travam a thread do worker.
- O traçado usa 8-vizinhos **sem atalho diagonal** — anéis e cantos não se
  fragmentam em triângulos de 1 px.

## [0.21.0] - 2026-10-20

Fecha os dois últimos itens **M/S** da fila ativa fora do centerline: o
**catálogo de materiais com avisos** (gravar com segurança) e a **fila de
trabalhos** (gravar vários programas em sequência).

### Added — catálogo de materiais (RF-IMG-15)

- Botão **“Materiais…”** na aba Imagem: catálogo **offline** de 26 fichas por
  material (madeira, papel, plástico, couro, tecido, metal, vidro, pedra e
  outros), com **família**, **espessura típica**, a **recomendação do manual**
  (potência, velocidade e passadas para o módulo 3 W/5 W/10 W e a ação
  gravar/cortar) e o **preparo** do material.
- Cada ficha traz o **aviso de segurança**. **PVC, policarbonato, ABS, vinil,
  fibra de vidro e espuma de poliuretano** são marcados como **Perigo** e os
  botões ficam desligados — o aviso explica o gás liberado (cloro/HCl, HCN, pó
  de vidro). Os demais avisam sobre fumaça, formaldeído, risco de incêndio e
  preparo (tinta/papel térmico no vidro, exaustão em metal e couro).
- **Aplicar** preenche módulo, ação, material, velocidade e `S-max` pelo mesmo
  caminho do perfil de material; **Aplicar e salvar preset** abre o preset com
  nome e notas prontos. Filtro por família e busca por nome.

### Added — fila de trabalhos (RF-GC-13)

- Cartão **“Fila de trabalhos”** na aba Execução: **adicionar arquivos**
  (múltipla escolha), **reordenar** (↑/↓), **remover**, **limpar** e **iniciar**.
  Um item por caminho; o tamanho e o estado aparecem na lista.
- A fila é **persistida** em `queue.json` (só caminho/nome/estado — os programas
  não são copiados) e sobrevive ao reinício. Item que estava “gravando” volta a
  “na fila”.
- **Iniciar** grava um item por vez: o **pré-voo roda uma vez** no primeiro, o
  item concluído **avança sozinho** (com o retorno ao zero), e a barra de
  gravação mostra `Fila x/y: nome` com **“Parar fila”**. Parar devolve o item
  atual para a fila; **erro/alarme** marcam o item como falhou e pausam a agenda;
  iniciar de novo **continua de onde parou** (só as falhas voltam; peças prontas
  não são regravadas).
- O Stop e o **emergência** da barra continuam valendo durante a fila. O renderer
  só lê arquivos que estão na fila (lista de permissão no main).

### Changed

- O pré-voo do job agora informa se o envio realmente começou (a fila não fica
  presa esperando um job que não partiu).

## [0.20.0] - 2026-10-20

Fecha os dois últimos itens **S** da fila ativa: **biblioteca de símbolos**
para começar a arte com uma forma pronta e **tira de teste de código** para
descobrir o menor símbolo que o scanner lê no material.

### Added — biblioteca de símbolos (RF-DSN-27)

- Botão **“Biblioteca…”** na barra do editor: catálogo **offline** de 14 formas
  (estrela 5/6 pontas, hexágono, coração, raio, seta, lua, sol, moldura, cantos,
  check, cruz, X e divisória), com **prévia vetorial** e nome em pt-BR/en/es.
- **Clique** insere a forma no centro da página; **arrastar** até a prancheta
  solta a forma no ponto do ponteiro. O campo **Tamanho (mm)** vale para a maior
  dimensão (a forma não estica) e cada inserção é **um grupo** + **um desfazer**,
  na camada ativa.

### Added — tira de teste de código (RF-DSN-28)

- Opção **“Tira de teste (vários tamanhos)”** no editor de símbolo: gera o
  **mesmo código** em até 10 tamanhos (ex.: `10, 15, 20, 25, 30`), enfileirados
  com **espaço** ajustável (1–50 mm) e o tamanho **escrito embaixo** com a fonte
  de traço único. Grava-se uma vez e o menor tamanho legível define o tamanho a
  usar no material.
- A tira entra como **um bloco** (mesmo grupo), é centralizada no ponto de
  inserção, presa à página e guarda os tamanhos no bloco — **reeditar** (duplo
  clique) abre o painel com a tira marcada. Menos de dois tamanhos: aviso e nada
  é inserido.

### Changed

- Painéis flutuantes de **texto** e **símbolo** se reencaixam na área visível
  quando mostram/escondem campos (o botão de confirmar não sai mais da tela).

## [0.19.0] - 2026-10-20

Dois itens da fila ativa de uma vez: **gabarito (molde)** para repetir a peça
no mesmo ponto e **texto em curva/arco** no editor 2D — mais o conserto do
botão de maximizar do editor.

### Added — gabarito (RF-DSN-25)

- Botão **“Gabarito…”** na barra do editor: gera o **molde** em volta da peça
  (seleção ou arte inteira) deslocando o **contorno externo** pela folga de
  encaixe — a peça é apoiada dentro do molde e volta sempre ao mesmo lugar.
- Folga de 0–5 mm (padrão 0,4 mm) e **marcas de registro (L)** opcionais em
  volta do molde, com distância configurável.
- Só **contornos fechados** viram molde (o mesmo critério *even-odd* do kerf):
  furos, ilhas e linhas abertas ficam de fora — o status avisa quantas formas
  foram ignoradas. Molde e marcas entram como **um grupo** e **um passo de
  desfazer**.

### Added — texto em curva/arco (RF-DSN-26)

- Campo **“Arco (raio, mm)”** no editor de texto: `0` mantém reto, positivo
  curva para cima e negativo para baixo. O bloco é dobrado sobre o arco **sem
  esticar as letras** (comprimento de arco e altura preservados), com as linhas
  extras acompanhando como arcos concêntricos.
- **Raio mínimo** calculado pela largura do texto (aviso com o valor mínimo em
  vez de gerar um texto fechado em círculo) e o raio fica guardado no bloco —
  **reeditar** o texto mantém a curva.

### Fixed

- **Maximizar o editor de desenho** agora ocupa a janela inteira: o overlay
  perde o padding quando maximizado (antes o modal de `100vh` estourava 16 px
  em cima e embaixo e **cortava a barra de status**). O botão também troca para
  **“Restaurar”** (ícone e dica) enquanto está maximizado.
- **Painel de texto**: o campo de **preenchimento** aparecia mesmo no modo
  vetor (o `.hidden` global perdia para o `display: flex` do campo) e o painel
  podia passar da área visível com o novo campo do arco — agora ele mede a
  própria altura antes de se posicionar.

## [0.18.0] - 2026-10-20

Peças paramétricas: **caixa com encaixe** e **engrenagem** saem prontas do
editor — um grupo por peça, com o kerf da camada aplicado como em qualquer
contorno.

### Added — geradores paramétricos (RF-DSN-24)

- Botão **“Geradores…”** na barra do editor, com duas abas:
  - **Caixa**: medidas externas L×P×A, espessura do material, largura do dedo,
    folga da fenda e tampa opcional. Saem 5 ou 6 peças (frente, fundo, laterais,
    base, tampa) deitadas na chapa **sem sobreposição**: frente/fundo com fendas
    nas verticais e na base, laterais com dedos que atravessam a espessura,
    base/tampa com dedos nos quatro lados e **vãos nos cantos** (nada de dedo
    órfão). A fenda é o dedo **mais a folga**, para montar sem forçar.
  - **Engrenagem**: módulo, número de dentes, ângulo de pressão e furo central
    opcional. Perfil **evolvente** (não é um desenho aproximado), com arco de
    raiz entre os dentes.
- **Prévia em escala** no próprio diálogo (peças rotuladas, círculo primitivo
  tracejado na engrenagem e resumo com a chapa/Ø), atualizando enquanto você
  digita.
- A inserção é **um grupo** — a caixa inteira anda/escala junto, a engrenagem e
  o furo também — e **um único passo de desfazer**.

### Fixed

- Os campos do modo “Engrenagem” não apareciam/escondiam no diálogo por causa da
  especificidade do `display: grid` — agora `.design-size-fields.hidden` vence.
- Painéis da caixa são posicionados pela **caixa real** (com os dedos), então
  não invadem o vizinho na chapa mesmo com material grosso.

## [0.17.0] - 2026-10-20

Frente e verso: o editor passa a gerar os **dois lados** de uma peça com o
registro já alinhado — e o traçado de caminhos abertos (marcas em L, traços
livres) foi corrigido.

### Added — gravar dos dois lados (RF-DSN-23)

- Botão **“Gravar dos dois lados…”** na barra do editor: gera **dois
  programas** na mesma pasta — `peca-lado-a.gcode` (como está) e
  `peca-lado-b.gcode` (**espelhado na horizontal** em torno do centro da arte).
  O documento **não muda**: os dois arquivos são calculados na hora.
- Os dois programas têm a **mesma caixa e a mesma origem (X0 Y0)**, porque o
  espelho é feito em torno do centro da arte. As **marcas de registro** (L
  simétricos) caem exatamente nas mesmas coordenadas: ao rodar o lado B, o laser
  **refaz as marcas do lado A** — se passarem por cima, a peça está alinhada.
- Opção **“Incluir marcas de registro (L)”** (ligada por padrão) com distância e
  tamanho ajustáveis; as marcas entram só nos programas, não no desenho.

### Fixed — caminho aberto não é mais rotacionado

- O gerador escolhia o vértice mais próximo do laser para começar o traçado e
  **rotacionava a lista** de pontos. Num contorno fechado isso é inofensivo, mas
  num caminho **aberto** cria um segmento entre a última e a primeira ponta que
  não existe no desenho — as **marcas em L** (3 pontos) saíam com uma diagonal
  e os traços livres de 3+ pontos também. Agora, em caminho aberto, só as duas
  pontas podem ser o início (com inversão do sentido quando a outra ponta está
  mais perto).
- Teste de regressão garante que um L gravado tem só as duas pernas (nada de
  diagonal) e comprimento total correto.

## [0.16.0] - 2026-10-20

Alinhamento físico: **marcas de registro** em volta da arte e **prévia do plano de
tiles** no diálogo de divisão.

### Added — marcas de registro/fiduciais (RF-DSN-22)

- Botão **“Marcas de registro…”** na barra do editor: coloca `L`s nos quatro
  cantos ou **cruzes** no meio dos lados, **fora da arte** (distância e tamanho
  ajustáveis). Servem para alinhar a peça na mesa (jogar o laser até a marca e
  zerar o eixo), conferir frente/verso e remontar peças.
- As marcas entram como **um grupo** na camada ativa, com nome próprio
  (“Marcas 1”), e são **linhas abertas**: gravam sem compensação de kerf e sem
  fechar a peça. Usam a seleção como referência, se houver; senão, a arte
  inteira.

### Changed — prévia do plano de tiling

- O diálogo “Dividir em tiles…” agora desenha a **prévia do plano** no próprio
  diálogo: arte e janelas em escala, rotuladas como os arquivos (`r1c1`,
  `r1c2`…), atualizando enquanto você muda tamanho/sobreposição.

## [0.15.0] - 2026-10-20

Marco **peça grande**: o programa é fatiado em janelas do tamanho da mesa com
sobreposição (um arquivo por tile) e a prancheta mostra o caminho compensado
pelo kerf antes de gerar.

### Added — tiling: peça maior que a mesa (RF-DSN-21)

- Botão **“Dividir em tiles…”** no editor: o programa é fatiado em janelas do
  tamanho útil da máquina com **sobreposição** na emenda. Saem N arquivos
  (`peca-r1c2.gcode`) numa pasta escolhida, cada um com a **origem no canto
  inferior esquerdo da sua janela** — é só reposicionar material/zero e rodar o
  próximo.
- O plano mostra **quantos tiles** vão sair (`3 × 2 = 6 tiles`) e recusa plano
  absurdo (mais de 200) antes de gravar. A janela padrão é a **área da máquina**
  (`$130/$131`) ou o tamanho da página.
- O recorte é feito nos **movimentos já parseados**: kerf, abas e passadas do
  programa original são preservados, `G1` sem potência não vira corte e nenhuma
  coordenada sai da janela.

### Changed — a prancheta mostra o caminho compensado pelo kerf

- Com folga de corte na camada, o editor desenha o **caminho real** do laser em
  **tracejado laranja** (externos crescem, furos encolhem). Antes só dava para
  conferir depois de gerar o G-code.

## [0.14.0] - 2026-10-20

Marco **oficina**: a peça pequena fica presa por abas, a emenda do corte não
queima e o diálogo de tamanho mostra quanto a peça custa. Inclui o sobre-corte
(lead-in/out) e o custo por peça.

### Added — abas de retenção e sobre-corte por camada (RF-DSN-18/19)

- **Abas de retenção**: a camada informa quantas “pestanhas” seguram a peça e a
  largura de cada uma (mm). O contorno fechado é dividido em trechos de corte
  separados pelas abas, onde o laser **desliga** — a peça pequena não se solta
  nem voa, e cada trecho tem sua própria ignição. Contorno curto demais reduz
  a contagem; sem espaço para nenhuma aba, corta inteiro (nada de job vazio).
- **Sobre-corte (lead-in/out)**: continua o corte além da origem do contorno
  para a emenda não ficar com um “bico” queimado (ponto duplo de ignição).
  Ignorado quando a camada tem abas, que já dividem o contorno.
- Os dois ficam num bloco **“Corte: abas e sobre-corte”** fechado por padrão no
  editor de camada (não rouba altura do painel), aparecem na lista de camadas
  (`A 4`, `S 0.4`) e vão para o cabeçalho do G-code (`; abas 4 × 2 mm`).
  Persistem no documento `.gstudio`.

### Added — custo por peça (Anexo B)

- O diálogo **“Tamanho da arte”** passa a mostrar o custo estimado da peça:
  **tempo de máquina** (o mesmo `estimateSeconds` do rótulo do G-code × tarifa
  por hora) + **material** (área da arte × preço do m²). Moeda em R$, US$ ou €.
- Tarifa, preço do material e moeda ficam nas **preferências** e voltam no
  próximo desenho; a prévia recalcula ao mudar o tamanho (com *debounce*) e
  **não toca no desenho** — só o “Gerar e visualizar” aplica a escala.

## [0.13.0] - 2026-10-20

Marco **oficina**: o desenho passa a ser um documento que se salva e reabre, e
a camada compensa a largura que o laser come — a peça sai no tamanho desenhado.
Inclui a correção do “Salvar .gcode”, que gravava o nome do arquivo em vez do
programa em quase todos os fluxos.

### Added — folga de corte (kerf) por camada (RF-DSN-17)

- **Campo “K”** no editor de camada: informa a largura que o laser remove (mm).
  O G-code passa a compensar a geometria — contornos **externos crescem
  `kerf/2`**, **furos encolhem `kerf/2`** e **ilhas dentro de furos** voltam a
  crescer (profundidade par/ímpar por contenção). É o que faz uma peça de
  encaixe sair no tamanho desenhado em vez de “folgada”.
- Só contornos fechados e **sem traço grosso** entram na compensação: linha
  aberta e preenchimento por traço (`width`) são gravação. Furo menor que a
  folga é **omitido** e o motivo fica registrado no G-code.
- A **âncora X0 Y0** passa a usar a área **realmente percorrida** (com o kerf),
  para o job não começar em coordenada negativa; o cabeçalho mostra o kerf da
  camada (`K 0.2 mm`) e a lista de camadas mostra `K 0.2`.
- O kerf é salvo no documento `.gstudio` (limitado a 10 mm na leitura).

### Fixed — “Salvar .gcode” gravava o nome do arquivo em vez do programa

- A ordem dos argumentos de `saveGcode` no preload estava trocada em relação a
  **nove dos dez** pontos de uso (SVG, DXF, PDF, desenho, teste de material,
  teste de foco, símbolos e editor de G-code): o arquivo salvo recebia o texto
  `design.gcode` (o nome sugerido) e o programa era descartado. A API passou a
  ser `(conteúdo, nome sugerido)` e o E2E do kerf confere o G-code salvo.

### Added — salvar/abrir o desenho (`.gstudio`, RF-DSN-16)

- **Documento do editor “Desenhar”**: botões no painel **Documento** e atalhos
  **Ctrl+S**/**Ctrl+O** salvam e reabrem a arte inteira — página, formas com
  estilo/potência/velocidade/espessura, **camadas** (com a ordem de execução),
  camada ativa, texto e **símbolo** (com os metadados de reedição). O nome do
  arquivo e a marca de “não salvo” aparecem na barra de título do editor.
- Formato **JSON versionado** (`kind: grbl-studio/design`, `version: 1`), legível
  e diffável, em módulo puro (`src/shared/designDoc.ts`): coordenadas vão como
  estão (**sem arredondar**), metadados passam pelos mesmos sanitizadores da
  edição e a leitura **nunca lança** — arquivo corrompido, de outro app ou de
  versão futura devolve um código de erro que a UI traduz.
- Abrir pede confirmação quando há alterações não salvas, substitui o desenho e
  vira o **novo ponto do undo/redo**; os contadores de grupo/camada continuam a
  numeração do arquivo (sem ids repetidos depois de abrir).
- O painel lateral agora **rola** em janelas baixas, mantendo a lista de objetos
  com altura mínima (antes ela era esmagada quando o conteúdo passava da tela).
- **Testes**: 8 unitários (`tests/design-doc.test.ts`: ida e volta sem perder
  precisão, versão/formato, pontos inválidos, números fora de faixa, camadas
  repetidas, numeração e documento vazio) e 1 E2E (desenhar → salvar → conferir
  o JSON → limpar → abrir com confirmação → Ctrl+O).

## [0.12.0] - 2026-10-20

Marco **design 2D de verdade**: os símbolos viram objetos do desenho e as peças
passam a ser **encaixadas na chapa**. Nada muda no protocolo nem no caminho de
gravação — as duas funções caem no mesmo G-code do editor.

### Added — símbolo como objeto no editor “Desenhar” (S3)

- **Ferramenta Símbolo** (barra do editor, atalho **Q**): QR Code, Data Matrix,
  PDF417, Aztec e código de barras entram na prancheta como **um bloco de
  formas** — mover, escalar, girar, espelhar, alinhar, dar camada e
  potência/velocidade como qualquer outro objeto, e cair no **mesmo G-code**
  do desenho (sem gerar programa avulso).
- Painel com tipo, conteúdo, simbologia 1D, correção (QR), **tamanho/largura
  em mm** e **linhas de varredura por mm**; os campos aparecem conforme o
  tipo, com os mesmos avisos de legibilidade dos modais (`qr.warn.*`/`bar.warn.*`).
- **Duplo clique** no símbolo (no canvas **ou** na lista de objetos) reabre o
  painel preenchido e substitui o bloco no mesmo lugar (tamanho atual, sem
  perder potência/velocidade/passadas/espessura/camada).
- A geometria de cada trecho de varredura é traduzida por um módulo puro
  (`src/shared/designSymbol.ts`): Y invertido para o editor, origem no canto
  superior esquerdo e descarte de trechos inválidos (`NaN` no caminho abortaria
  o job). O `Shape.symbol` guarda a especificação para reeditar.
- **Testes**: 11 unitários (`tests/design-symbol.test.ts`, incluindo o caminho
  QR → formas → `designToGcode` e EAN-13 com HRI) e 1 E2E (inserir QR, trocar
  para 1D, gerar e visualizar).

### Added — encaixe na chapa / nesting (P3.7)

- **Encaixar na chapa…** no editor “Desenhar” (atalho **J**): distribui a
  seleção — ou todos os objetos, quando nada está selecionado — na chapa com
  **margem**, **espaçamento** entre peças e **rotação de 90°** quando couber
  melhor. A chapa vem preenchida com o tamanho do documento e pode ser trocada.
- Algoritmo **MaxRects** (best area fit, sem girar quando não precisa) em módulo puro
  (`src/shared/nesting.ts`): encaixa as peças maiores primeiro, fatia os
  retângulos livres e informa o **aproveitamento** da chapa. Peças que não
  couberem **não são cortadas nem movidas** — o status avisa quantas ficaram
  de fora.
- O posicionamento reusa a geometria do editor (`placeEntities`): a peça é
  transladada (e girada 90° em torno do próprio centro quando escolhido) sem
  perder camada, estilo, potência/velocidade nem o sentido do contorno (furos
  continuam furos). A operação entra no **undo/redo**.
- **Testes**: 14 unitários (`tests/nesting.test.ts`: folga, margem, rotação,
  sem rotação desnecessária, peça grande demais, entradas inválidas,
  determinismo, não sobreposição e a transformação de entidades) e 1 E2E (duas peças → encaixe → canto na margem
  → chapa pequena demais).

## [0.11.0] - 2026-10-20

Marco **v0.8**: lote/dados variáveis, modo produção, presets de material
(com dose e JSON) e teste de foco — somados ao editor de G-code, à
biblioteca de jobs, ao clique-no-preview e ao orçamento de RAM (RNF-11).

### Added — presets de material, dose e JSON (P2.12 / RF-IMG-14)

- **Ferramentas → Presets de material…** (e o botão no grupo “Perfil de
  material”): salva os ajustes atuais como **receita** — nome, notas, módulo,
  ação (gravar/cortar), potência %, velocidade, passadas e modo — e permite
  **aplicar**, **excluir** e **exportar/importar JSON** para compartilhar.
- **Dose (J/mm)** em cada receita (`watts × potência × 60 / velocidade`, com
  passadas na dose total) e o botão **Ajustar à máquina**, que converte a
  potência para o módulo atual (3 W/5 W/10 W) preservando a dose — e avisa
  quando o módulo não alcança.
- A lista vive em `prefs.materialPresets` (sanitizada no main: faixas, ids,
  teto de 100 e descarte de lixo), com lógica pura em
  `src/shared/materialPresets.ts` (22 testes) e bundle próprio
  (`presets.js`, `GRBL_PRESETS`) carregado sob demanda (RNF-11).
- **Correção**: o percentual de potência passa a usar o `$30` do **perfil da
  máquina** como referência (antes o próprio campo `S-max` era a referência, o
  que fazia o percentual “derivar” ao aplicar perfis em sequência e mostrava
  sempre 100 % no controle da moldura).
- **3 testes E2E**: salvar/aplicar/excluir, ajuste pela dose e round-trip
  exportar → importar JSON.

### Fixed — sugestão de perfil ao conectar (RF-MAQ-9)

- A **sugestão de perfil** (smart connect) podia não aparecer logo após
  conectar: o snapshot da máquina chegava vazio enquanto a leitura inicial de
  `$$` ainda estava em voo (ou a consulta colidia com ela). Agora o app relê a
  máquina — no máximo duas tentativas — antes de desistir.

### Added — teste de foco / spot (P2.13 / RF-IMG-13)

- **Ferramentas → Teste de foco (spot)…**: grava uma **escada de Z** com
  **duas potências por passo** (baixa, para a marcação; alta, para o corte). A
  linha mais fina e uniforme indica a **melhor altura de foco** daquele
  material — sem precisar de auto-foco.
- O Z é **relativo ao Z atual** (`G91`/`G90`, com `M5` antes de cada movimento):
  o programa desce até o primeiro passo, sobe a escada e **volta ao Z de
  partida**. Nada de coordenada Z absoluta (o app não sabe onde fica o zero de
  Z da máquina) e nada de mover o Z com o laser ligado.
- Campos: passos (3…31), passo de Z, **sentido** (Z+ afasta/aproxima),
  comprimento e espaço das linhas, avanço, potências e modo M3/M4. A prévia
  mostra a faixa (`-0.5 a 0.5 mm`) e avisa quando as duas potências são iguais.
- Lógica pura em `src/shared/focusTest.ts` (10 testes) com bundle próprio
  (`focusTest.js`, `GRBL_FOCUS_TEST`) carregado sob demanda (RNF-11) e
  **2 testes E2E** (menu → modal → gerar; normalização + aviso).

### Added — modo produção: repetir o job N vezes (P2.11 / RF-GC-12)

- **Modo produção** (cartão **Execução** → *Modo produção*): escolha **Cópias**
  (1…999) e **▶ Produção** repete o **programa atual** N vezes. Entre uma peça e
  outra o app **para** (nada de emendar uma peça na outra): troque/conferira a
  peça na mesa e clique em **▶ Próxima peça**. O **pré-voo roda uma vez por
  série** — enquadramento e programa não mudam entre as cópias.
- **Contador sempre à mão** na barra de gravação (`Peça 3 de 10 · 2 concluídas`,
  `Peça 3 de 10 pronta — troque a peça`) e na barra lateral; **Encerrar** fica ao
  lado de Pausar/Cancelar, que continuam acessíveis durante toda a série
  (RF-GC-8).
- **Peça interrompida** (erro, alarme ou cancelamento) **não anda o contador**:
  o botão vira **▶ Repetir peça** e repete a mesma cópia depois de reposicionar.
  A última cópia fecha a série (`Produção concluída: 10 peças`).
- **Trava de UI**: durante a série o programa não pode ser trocado — abrir
  arquivo, editar e o lote ficam desabilitados, e qualquer outro caminho que
  troque o programa (imagem, desenho, símbolo, biblioteca) **encerra** a
  produção em vez de repetir o programa errado.
- Máquina de estados **pura** em `src/shared/production.ts` (12 testes), bundle
  mínimo `production.js` (`GRBL_PRODUCTION`) carregado sob demanda (RNF-11) e
  **3 testes E2E** (série com contador, trava/Encerrar e troca de programa).
  O estado vive na sessão; o programa continua no arquivo.

### Added — lote / dados variáveis: planilha → fila de gravação (P2.10 / RF-SYM-10)

- **Lote de dados variáveis** (Ferramentas → **Lote de dados variáveis…**):
  cole ou abra uma planilha **CSV/TSV** e cada linha vira **uma peça** — o app
  grava a peça, **pausa para a troca** na mesa e só envia a próxima quando você
  confirma em **Próxima peça**. A peça pode ser um **código 2D** (QR, Data
  Matrix, PDF417, Aztec) ou **código de barras 1D**, com a geometria dos ajustes
  do modal do símbolo.
- **Modelo de cada peça** com campos posicionais (`{1}`, `{2}`), por cabeçalho
  (`{nome}`), contador (`{i}`, `{i:03}`) e `{total}` — dá para imprimir número de
  série, nome, lote e o que mais estiver na planilha. `{{`/`}}` escrevem chave
  literal. Erros de modelo (coluna inexistente, chave aberta, contador inválido)
  aparecem com o motivo, e **Iniciar lote** fica bloqueado até corrigir.
- **CSV tolerante**: separador `,`/`;`/tab/`|` detectado sozinho (e corrigível
  no seletor **Separador**),
  aspas com quebra de linha, BOM/CRLF, cabeçalho detectado (e corrigível),
  limite de **2 000 peças / 64 colunas** e células cortadas em 200 caracteres —
  com aviso do que ficou de fora.
- **Contador e retomada**: a barra de gravação mostra `Peça 3 de 50 · 2
  concluídas`; interromper a máquina **para a fila naquela peça** (não pula
  sozinho) e o lote fica guardado nas preferências — ao reabrir o app,
  **Retomar lote** continua na peça certa. Planilhas acima de 200 KB não são
  persistidas (aviso no console) para não inchar o `prefs.json`.
- O G-code de cada peça é gerado **na hora** (não guarda N programas na RAM) e
  o lote abre o gerador do símbolo sob demanda — bundle próprio (`batch.js`),
  carregado preguiçosamente como o QR/código de barras (RNF-11). Peças de lote
  **não** entram na biblioteca de jobs (senão 50 peças empurrariam para fora os
  jobs de verdade); o cartão **Execução** fica visível com um lote guardado,
  mesmo sem G-code carregado, para o "Retomar lote" não ficar escondido.
- Lógica pura e testável em `src/shared/batch.ts` (CSV → tabela → modelo →
  peças), com 30 testes; fluxo completo coberto por **5 testes E2E** com o
  emulador GRBL (peça → pausa → próxima → conclusão, retomada, via 1D,
  separador forçado e erro de modelo).

### Changed — performance: serviço de rede dentro do processo browser (RNF-11)

- O Chromium subia um processo `utility` só para o **serviço de rede**
  (~26 MB de PSS com o app ocioso) — e o GRBL Studio só usa a rede para
  procurar atualizações. A feature `NetworkServiceInProcess2` mantém o stack de
  rede no processo browser: **−11 MB** no total e **um processo a menos**
  (281,7 → 270,3 MB em X11; 300,9 → 290,4 MB em Wayland; ver `BENCHMARK.md`
  §6.6). É uma feature flag do Chromium: se ela deixar de existir, o app só
  volta ao comportamento padrão, sem quebrar.
- `scripts/bench.mjs` passou a **graduar o orçamento de RAM em PSS** (o número
  que rateia páginas compartilhadas) em vez de RSS; o RSS continua no relatório
  como informação. Uma janela vazia do Electron mede 572 MB de RSS e 213 MB de
  PSS — comparar RSS com o orçamento não media o app.
- O benchmark ganhou a evidência do **piso da stack**: uma janela Electron
  vazia, com as mesmas flags, consome **213 MB (X11) / 236 MB (Wayland)** de
  PSS; o app acrescenta ~57 MB (main +20, renderer +23, GPU +15).
- O `bench.mjs` agora **conta outras instâncias do mesmo Electron** e avisa: o
  PSS divide páginas compartilhadas entre todos os processos da máquina, e a
  mesma build mediu **202 MB** com a instância do usuário aberta e **269 MB**
  sozinha. Também mede o PSS **ao longo do dwell** (282 MB aos 30 s → 269 MB
  dos 2 aos 10 min, sem crescimento).
- **RNF-11 agora tem limite de RAM por display:** ≤ 280 MB em X11 e ≤ 300 MB em
  Wayland (PSS total com GPU, app sozinho, após 10 min) — ~10 MB acima do
  medido (269,0 MB / 290,4 MB). O limite anterior (200/220 MB) ficava **abaixo
  do piso** de uma janela Electron vazia e não era atingível.

### Added — mover a cabeça pelo preview (P2.14)

- **Clique no preview de caminho** escolhe um ponto e abre um popover com as
  coordenadas em mm (`X 20.000 · Y 20.000`) e as ações **Mover (G0)** /
  **Cancelar**. Confirmar envia `G90 G0 X.. Y..` pela mesma fila do console (com
  a janela de caracteres do GRBL), no **sistema de coordenadas ativo** — sem
  `G91`, então o modo modal do programa carregado não muda.
- O ponto aparece como **mira** na cor de atenção; fora da área de trabalho
  (`$130`/`$131`) ele é **encostado na borda** (evita soft limit). Rodar a roda,
  arrastar, dar duplo clique ou `Esc` descarta o ponto — `Esc` aqui **não** é
  parada de emergência.
- Bloqueado com explicação no console quando não dá para mover: sem conexão,
  em alarme/porta aberta ou com job em andamento. Arrastar (< 3 px) continua
  sendo clique; acima disso continua sendo pan.
- 2 E2E: clique → confirmação → `G90 G0` (e `Esc`/Cancelar sem enviar);
  desconectado, o clique explica o motivo.

### Added — biblioteca de jobs (P2.9): reexecutar o que já rodou

- **Biblioteca de jobs** em `Arquivo → Biblioteca de jobs…` e no botão
  **Biblioteca…** da aba Execução: os **últimos 50 programas executados** ficam
  em `<userData>/joblib`, com **miniatura do preview**, nome, origem, data,
  linhas, tamanho e tempo estimado.
- **Re-executar** roda o job de novo (passando pelo pré-voo normal) e
  **Duplicar** carrega uma cópia como programa atual, para ajustar antes de
  gravar. As duas ações usam o **programa guardado**, não um caminho de
  arquivo — o original pode ter mudado ou sumido.
- O registro acontece **ao terminar a gravação**; reexecutar o mesmo programa
  **atualiza** a entrada (o main compara o hash) em vez de duplicar a lista.
- Armazenamento fora do caminho crítico: índice `index.json` gravado de forma
  atômica (tmp + rename) e o programa em `<id>.gz` (gzip assíncrono, para não
  competir com o streaming serial — RNF-11). Tetos de **50 entradas** e **32 MB
  comprimidos** descartam os mais antigos; programas acima de 16 MB entram só
  como metadado ("sem programa guardado").
- Nada vindo do renderer vira caminho: id com regex estrita (sem *path
  traversal*), nome/origem/miniatura sanitizados (`data:image/png|jpeg` até
  48 KB) e índice corrompido vira biblioteca vazia em vez de erro.
- 10 testes de unidade (`tests/job-library.test.ts`) e 2 E2E (registro no fim
  do job + reexecutar sem duplicar; listar/duplicar offline/remover/limpar).

### Added — editor de G-code (P1.10): corrigir e reenviar um trecho

- **Editor de G-code** em `Arquivo → Editar G-code…` e no botão **Editar…** da
  aba Execução: lista **virtualizada** (só a janela visível vira DOM — 50 mil
  linhas custam ~30 nós), numeração, realce por palavra (G/M, eixos, F, S, T,
  N, comentários) e navegação por teclado (setas, PageUp/Down, Home/End,
  `Enter` edita, `Esc` fecha).
- **Edição** linha a linha (duplo clique), **inserir abaixo** e **remover**
  (linha ou seleção), com **Desfazer** que guarda *operações*, não cópias do
  arquivo. Com job em andamento a edição e o reenvio ficam bloqueados.
- **Validar** roda as regras MX-1…MX-15 do pré-voo e resume o resultado na
  barra de status (abre a lista quando há impedimento), sem iniciar nada —
  funciona até sem máquina conectada (as regras que dependem de `$$` são
  omitidas, nunca inventadas).
- **Enviar daqui** (linha corrente → fim) e **Enviar trecho** (seleção com
  `Shift`+clique): o trecho vai com o **preâmbulo modal** de `resume.ts`
  (unidades, distância, offsets, laser) — a mesma segurança da retomada.
- **Salvar .gcode…** grava o programa editado; o rótulo do arquivo passa a
  mostrar **editado** e o preview/tempo são recalculados ao fechar (nunca a
  cada linha, para editar continuar responsivo — RNF-11).
- Lógica pura em `src/shared/gcodeEditor.ts` (realce, resumo, edições
  reversíveis, `buildSnippet`) empacotada em `public/gcodeEditor.js`
  (`GRBL_GCODE_EDITOR`, carregado sob demanda), com 16 testes de unidade e
  2 E2E (realce/numeração/edição/desfazer/seleção e validação offline).
- `docs/DEVELOPMENT.md` ganhou os bundles `preflight`/`gcodeEditor`; `ROADMAP`,
  `PLANO_PREMIUM` e `ANALISE_COMPETITIVA` atualizados.

## [0.10.0] - 2026-10-19

### Added — Aztec (RF-SYM-7): a última simbologia que faltava

- **Código Aztec** (ISO/IEC 24778) no modal **Código 2D**, ao lado do QR
  Code, Data Matrix e PDF417: conteúdo → matriz → G-code de varredura, com
  **correção de erro em %** (a norma pede no mínimo 23 %; padrão 33 %) e
  escolha **automática** do menor símbolo (compacto de 1–4 camadas ou normal
  de 4–32).
- **Encoder próprio** (`src/shared/symbol/aztec.ts`, sem dependência de
  runtime — ADR-11): encoder de alto nível com *latch*/*shift*/*binary shift*
  (o conjunto de estados de Frank Yellin), *stuffing* de bits, **Reed–Solomon**
  em GF(2⁴/2⁶/2⁸/2¹⁰/2¹²), mensagem de modo, "bull's eye" central, marcas de
  alinhamento e a matriz de dados em 4 blocos por camada. As **tabelas da
  norma** são **geradas** (`scripts/gen-aztec-tables.mjs` →
  `src/shared/symbol/aztec.tables.ts`) — não editar à mão.
- O conteúdo é **byte a byte** (Latin-1): acentos saem corretos (`ç` → lê
  "ç"). O *writer* do ZXing-JS converte o texto em UTF-8 e grava 2 bytes por
  acento (lê "Ã§") — bug do port, não da norma.
- Testes (7 novos, `tests/symbol-aztec.test.ts`): **matriz × matriz** com o
  encoder do ZXing (bit a bit, 10 conteúdos), **decodificação real** pelo
  `AztecCodeReader` (inclusive acentos), camadas forçadas, determinismo e os
  erros tipados (`empty`, `bad-chars`, `too-long`, `layers`) + **E2E** do
  modal.
- Com isso o **RF-SYM-7 fecha**: as simbologias extras (1D: ITF-14, Codabar,
  Code 93, GS1-128; 2D: Data Matrix, PDF417 e Aztec) estão todas entregues.

### Added — novo ícone do app e novo splash

- As fontes em `docs/` (`icone.png` e `splash.png`) são o **arquivo mestre**;
  os artefatos do app são derivados e passam a ser gerados por
  `scripts/gen-assets.py` (Python + Pillow), no mesmo espírito das tabelas
  geradas — trocar a arte é um comando, não uma edição manual.
- `build/icon.png` (512×512) e `public/splash.png` (984×437), com a janela do
  splash ajustada para **738×328** — a janela passa a ter a proporção da
  imagem (antes 738×401), então nada é cortado.

### Changed — performance: a flag `in-process-gpu` foi recusada (RNF-11)

- **A/B de 4 pares** (mesmo build, X11, `--dwell=30000`): com o GPU dentro do
  processo main a árvore perde um processo (6 → 5) e o **RSS somado** cai
  64 MB, mas o **PSS fica igual** (265,7 → 263,0 MB) — ou seja, **não há
  economia real de memória** (o RSS conta página compartilhada duas vezes) — e
  o **startup piora ~120 ms**. O risco de GPU também passaria a morar no
  processo main.
- Decisão: a flag **não** entra no app. Instrumento mantido:
  `scripts/bench.mjs` aceita `GRBL_ELECTRON_FLAGS` para A/B sem recompilar.
- Números, método e ressalvas em `docs/BENCHMARK.md` §6.5.

### Added — P2.5: catálogo 30+ máquinas, import `.lbdev` e smart connect

O caminho crítico declarado no `PLANO_PREMIUM.md` §8. As três partes do P2.5:

- **Catálogo 30+**: 30 perfis (com o Genérico). Os 7 novos (Ortur Aufero 1,
  Ortur Laser Master 2 Pro, xTool D1 Pro, AtomStack A5 Pro V2, TwoTrees TT-5.5,
  NEJE Master 2 Plus e NEJE 3) têm o **curso da especificação pública** do
  fabricante — é o valor que o app escreve em `$130`/`$131`. Onde não há
  fonte de homing, ele fica **desligado** (o lado seguro: não habilita
  `$22=1` numa máquina sem chaves de fim de curso).
- **Import `.lbdev`** (LightBurn): o arquivo JSON (`DeviceList`) é lido,
  mostrado (nome, curso, homing, teto de `S`) e só então aplicado. O perfil
  importado entra no seletor como "importado".
- **Smart connect**: ao conectar, o app lê os fatos da máquina e **sugere**
  o perfil do catálogo — só quando o **curso bate exatamente** (≤ 1 mm), para
  nunca sugerir limites errados; o teto de `S` e o homing desempatam entre
  perfis de mesmo curso. A sugestão **não** escreve nada.

### Fixed — RF-MAQ-9: perfil de máquina passou a pedir consentimento

Trocar de perfil com a máquina conectada escrevia `$` **sem confirmação**.
Agora mostra o **antes/depois** de cada valor (o que a máquina tem hoje × o
que o perfil vai gravar) e só escreve depois do "Aplicar" — e escreve **só os
`$` que a máquina tem** (o firmware pode não ter todos).

### Fixed — preferências dos símbolos 2D

O sanitizador do main descartava `pdfEcc`/`pdfColumns`/`pdfRowHeightMm`: as
preferências do **PDF417 nunca foram persistidas**. Agora as 4 simbologias 2D
são aceitas e os ajustes do PDF417 e do Aztec são guardados (com teste).

### Fixed — tema sem flash (RF-APP-1 / `DESIGN.md` §8)

O tema era aplicado depois das preferências (que chegam de forma assíncrona):
a tela pintava no tema padrão e só depois trocava. Agora o
`public/theme-boot.js` roda **sincronamente** no `<head>` e aplica o tema
antes do primeiro paint (o E2E prova: com o script do app bloqueado, o tema
continua aplicado).

O `docs/DESIGN.md` §8 passa a ter a **auditoria honesta** de 19/10/2026: cada
item marcado como verificado no código (✅), dependente do olho humano (👁) ou
não atendido (❌ — a RAM: 298,8 MB de PSS contra o orçamento de 200 MB).

## [0.9.0] - 2026-10-19

### Docs

- **Reconciliação com o código (19/10/2026):** o módulo **M14** estava todo como
  pendente no `PRODUCT_SPEC.md` embora o painel Máquina, o pré-voo e o
  diagnóstico tenham saído na **0.8.0** — RF-MAQ-1…8 passaram a ✅ (o **chip de
  pinos `Pn`** da barra de status, RF-MAQ-7, foi implementado nesta data).
  Adicionado **RF-PRV-7** (simulação de job), que já existia no
  código desde a **0.5.0** sem requisito nem registro. Atualizados
  `ROADMAP.md`, `FEATURES_COMPARISON.md`, `COMPARATIVO.md`,
  `ANALISE_COMPETITIVA.md`, `PLANO_PREMIUM.md`, `PLANO_DE_ACAO.md` e
  `PLANO_MAQUINA.md` (contagens de teste/chaves i18n, status de P2.3/P2.7/P2.8
  e catálogo).
- **`CHANGELOG.md`:** a **simulação de job (P2.3 / RF-PRV-7)** foi adicionada à
  seção da 0.5.0, de onde havia sido omitida.
- **PDF417 (`RF-SYM-7`) nos docs:** `PRODUCT_SPEC.md`, `PLANO_DE_ACAO.md`,
  `PLANO_QR_BARCODE.md` (novo §18), `ARCHITECTURE.md`, `ROADMAP.md`,
  `FEATURES_COMPARISON.md`, `ANALISE_COMPETITIVA.md`, `HANDOFF.md` e
  `docs/README.md` — PDF417 marcado como entregue, **Aztec** como pendente, e as
  contagens atualizadas (**731 testes / 42 arquivos**, **1054 chaves** i18n).

### Added — chip de pinos `Pn` na barra de status (RF-MAQ-7)

- **Indicador de pinos** que lê o campo `Pn` do status: mostra os pinos ativos
  (`Pn:XY` → `Pinos: X Y`) ou "nenhum" quando nenhum está acionado. Quando o
  firmware **não reporta** pinos (máscara `$10`, como a Sculpfun C1), o chip fica
  **desabilitado com explicação** no *tooltip* — sem sugerir escrever setting.
- Helper puro `parsePins` em `src/shared/machines.ts` (bundle sempre carregado)
  com testes unitários; **E2E** cobre os dois casos (com e sem `Pn`).

### Added — importação DXF (P2.4)

- **Arquivo → Importar DXF…** lê DXF ASCII (CAD) e converte em G-code de
  contorno, como o SVG. Suporta `LINE`, `LWPOLYLINE`/`POLYLINE` (com *bulge*),
  `CIRCLE`, `ARC`, `ELLIPSE` e `SPLINE` (NURBS), **blocos/`INSERT`**
  (translação, escala, rotação e arrays), **`$INSUNITS`** (in/mm/cm/m…),
  camadas congeladas/desligadas e **aviso** das entidades não convertidas
  (texto, hatch, dimensões).
- Contornos normalizados em (0,0), em mm; **DXF binário** é recusado com
  instrução para exportar em ASCII. O bundle `public/dxf.js` carrega só ao
  importar (fora do primeiro paint), reusando `contoursToGcode` de `svg.ts`.
- Testes: **14 unitários** do parser (geometria, blocos, camadas, unidades,
  G-code) e **E2E** com o diálogo nativo simulado.

### Added — importação PDF vetorial (P2.4, RF-DSN-15)

- **Arquivo → Importar PDF…** extrai caminhos vetoriais de PDFs (o parse roda no
  main, que tem `zlib`): objetos por varredura + **object streams** (`/ObjStm`),
  filtros `FlateDecode`/`ASCIIHex`/`ASCII85`, operadores `m l c v y re h`, matriz
  `cm` com pilha `q/Q`, **Form XObjects** (`Do` + `/Matrix`) e **rotação de
  página**. Contornos convertidos de pontos para mm e normalizados em (0,0).
- Importa apenas a **primeira página** e avisa quantas existem; **texto** (fontes
  não viram curvas) e **imagens** são ignorados com aviso, sem inventar
  geometria. PDF criptografado é recusado com orientação.
- Testes: **15 unitários** (inclusive object stream, rotação, filtros e XObject)
  e **E2E** com diálogo simulado. Com isso o **P2.4 (DXF + PDF) fecha**.

### Added — PDF417 (RF-SYM-7)

- **Novo símbolo 2D PDF417** (ISO/IEC 15438) no modal **Código 2D** (Ferramentas),
  ao lado de QR Code e Data Matrix: conteúdo livre → G-code de varredura, com
  **nível de correção de erro 0…8**, **colunas de dados** (ou automáticas) e
  **altura de linha** em mm. O tamanho em mm quadrado não se aplica (o símbolo
  cresce em linhas) — o dimensionamento é por módulo (X-dimension) × altura.
- Encoder puro `src/shared/symbol/pdf417.ts`: *start*/*stop* de 17/18 módulos,
  indicadores de linha por **cluster (0/3/6)**, compaction **Numeric (902)** e
  **Byte (901/924)** e correção de erro Reed–Solomon em **GF(929)** (`2^(nível+1)`
  codewords). Escolha automática de linhas (3–90) × colunas (1–30), até 928
  codewords. Conteúdo em **Latin-1** (ECI padrão); fora disso, erro `bad-chars`.
- Padrões de codeword **gerados** por `scripts/gen-pdf417-tables.mjs` a partir do
  `@zxing/library` (`src/shared/symbol/pdf417.tables.ts`, não editar à mão).
  `pdf417ToGcode`/`pdf417ToCell`/`pdf417GridToGcode` reusam o pipeline 2D
  (`matrixToBands`/`bandsToScanSegments`), com overscan/polaridade e avisos.
- Testes: **16 unitários** — incluindo **decodificação real** com o `PDF417Reader`
  do ZXing (Byte 901/924, Numeric > 44 dígitos, Latin-1, colunas/níveis variados),
  descritor de comprimento, **síndromes de Reed–Solomon** e erros tipados — e
  **E2E** do modal. Modo **Text (900)** e **Aztec** ficam para depois.

### Added — grade de símbolos (RF-SYM-9)

- **Lista → grade**: com a opção **Grade** ligada nos modais 2D (QR/Data Matrix)
  e 1D, cada linha do conteúdo vira um símbolo. Escolha as **colunas** (vazio =
  quadrado automático) e o **espaçamento** (mm) — a primeira linha fica no topo,
  em ordem de leitura.
- Um **único programa de G-code** com um só cabeçalho/rodapé (`G21 G90 G94 M5 …
  M5 G0 X0 Y0`); as células usam o tamanho da maior (colunas/linhas alinhadas) e
  cada uma é varrida localmente (zigue-zague no 2D, ordem de gravação no 1D).
  Avisos de legibilidade são agregados sem repetição.
- Módulo puro `symbolGridToGcode` (+ `qrGridToGcode`, `dataMatrixGridToGcode`,
  `barcodeGridToGcode`) em `src/shared/symbol/gcode.ts`; os encoders 2D/1D foram
  refatorados para expor a geometria (`matrixGeometry`/`barcodeGeometry`) e
  reusá-la na grade. G-code **não arredonda** a geometria (AGENTS.md).
- Testes: **10 unitários** (2×2, colunas automáticas, origem, invariantes
  `M5`/`S ≤ sMax`, avisos agregados, lista vazia) + **2 E2E** (grade de QR e de
  códigos de barras). Com isso o **RF-SYM-9 sai do ⬜**.

### Added — camadas / multi-operação (P2.2, RF-DSN-13)

- **Camadas** no editor vetorial: cada objeto pertence a uma camada e a **ordem
  da lista é a ordem de execução** — dá para **gravar e cortar numa só
  execução**. A lista aceita **arrastar para reordenar** (e ↑/↓, acessível pelo
  teclado), criar/excluir camadas e **mover a seleção** para a camada ativa.
- **Parâmetros por camada** (potência, velocidade, passadas e modo M3/M4); campo
  vazio herda o padrão global da seção “Gravação”, e o objeto ainda pode
  sobrescrever a camada. Cada forma mostra a cor da sua camada no canvas e na
  lista de objetos.
- **G-code**: `src/shared/design.ts` emite as camadas na ordem declarada e
  garante **`M5` antes de cada troca de potência/modo** (laser desligado);
  formas sem camada (ou com id desconhecido) usam os parâmetros globais e vão
  por último. Sem camadas, a saída é idêntica à de antes.
- Camadas são lembradas entre sessões (`localStorage`). Testes unitários das
  operações + **E2E** da UI (criar/renomear/reordenar/mover/excluir).

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
  `?` **sem job em curso**) avisa no console e volta para "desconectado",
  liberando o botão para reconectar. Com job em curso (`running`/`paused`) o
  silêncio é do job — quem cuida é o vigia de `ok` (`PLANO_MAQUINA.md` §11.8).
  O `SerialTransport.close()` também passou a resolver mesmo quando o callback
  do `serialport` nunca chega.
- **Dois desfechos de job errados** pela mesma confusão ("idle" × "em curso"):
  `stopJob()` depois de um job terminado ainda mandava **soft reset** (0x18),
  reiniciando o controlador e perdendo a origem; e um `ALARM` depois do fim do
  job reescrevia o desfecho como `aborted`. Agora os três usam a mesma noção de
  "job em curso" (`running`/`paused`).

### Changed — medição de CPU ociosa (RNF-11)

- `scripts/bench.mjs` passou a amostrar a CPU **ao longo de todo o dwell**
  (1 s a cada 30 s, `cpu.timeline` no JSON) e a **quebrar por processo**
  (`cpu.byTypePercent`: renderer, GPU, main, utility, zygote). A janela única de
  5 s no fim do dwell não distinguia "ocioso o tempo todo" de "pico que caiu
  justo na medição" — e foi essa a dúvida que ficou da 0.8.0
  (`docs/BENCHMARK.md` §6.4).
- **Re-medição de 10 min (19/10/2026):** CPU ociosa **0,00 %** no regime (16
  amostras consecutivas de 0 % entre 2 e 10 min; o 7,40 % de 18/10 **não se
  reproduz**) e cauda de aquecimento de ~90 s. Startup 1 581,3 ms (carga 4,34)
  e PSS 298,8 MB na mesma corrida.

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

### Added — simulação de job (P2.3, RF-PRV-7)

- **Playback do caminho antes de gravar**: play/pause/parar, **seek** na linha do
  tempo (0–100 %), velocidade **1×–10×** e **tempo estimado** (soma de
  `dist / feed`, com `G0` a 3000 mm/min). A cabeça anda no preview e o trecho
  já percorrido é pintado; reusa o preview 2D em camadas.

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
