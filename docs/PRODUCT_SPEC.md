# GRBL Studio — Especificação de Produto (Product Spec)

- **Versão do documento:** 1.0
- **Status:** rascunho para revisão
- **Última atualização:** 2026-10-17
- **Fontes:** documentação oficial do LaserGRBL (Usage), manual da COMGO Z1 (transcrito em `docs/comgo_z1_lasergrbl_user_manual.md`), especificação do protocolo GRBL v1.1.

---

## 1. Visão

Oferecer, no Linux, uma aplicação **nativa, moderna e confiável** para operar
gravadoras e cortadoras laser com firmware GRBL 1.1 — com a simplicidade do
LaserGRBL e a qualidade de experiência de um software desktop contemporâneo.

> **Resumo em uma frase:** o LaserGRBL que o usuário de Linux sempre quis, sem
> Mono, sem travamentos de UI e com envio de G-code confiável.

---

## 2. Problema e oportunidade

- O **LaserGRBL** é referência no Windows (C#/.NET), mas no Linux roda de forma
  precária via Mono/Wine, sem suporte oficial e com problemas de portas seriais,
  UI e empacotamento.
- Alternativas abertas no Linux (ex.: LaserWeb) são pesadas, focadas em web/browser
  e não reproduzem o fluxo "conectar → carregar → gravar" simples do LaserGRBL.
- O firmware **GRBL 1.1** é ubíquo em máquinas de baixo/médio custo (COMGO,
  AtomStack, Ortur, Sculpfun, TwoTrees etc.), criando um mercado grande com
  demanda por software desktop local.
- **Oportunidade:** ser o "LaserGRBL para Linux" — ou seja, paridade funcional nos
  recursos essenciais + distribuição nativa em `.AppImage`/`.deb`/`Flatpak`.

---

## 3. Público-alvo e personas

| Persona | Descrição | Necessidades principais |
| :--- | :--- | :--- |
| **Hobbista iniciante** | Primeira máquina laser, usa o manual do fabricante como guia. | Conectar fácil, importar imagem, apertar *Play*, não quebrar a máquina. |
| **Maker/prosumer** | Já usa LightBurn/LaserGRBL, quer controle fino. | Overrides em tempo real, edição de `$$`, preview, macros, múltiplos passes. |
| **Pequeno negócio** | Produção recorrente de peças. | Confiabilidade, retomada de job interrompido, perfis de material, estimativa de tempo. |
| **Entusiasta Linux** | Não aceita Wine/Mono. | Instalação nativa (AppImage/deb/Flatpak), integração com o desktop, código aberto. |

---

## 4. Proposta de valor

1. **Nativo em Linux** — Electron + TypeScript, sem camadas de compatibilidade.
2. **Envio G-code confiável** — streaming com **janela por bytes** (contagem de
   caracteres) e confirmação `ok`, respeitando o buffer do GRBL (diferencial
   direto vs. MVP atual).
3. **Paridade com o essencial do LaserGRBL** — interface, jog, overrides, status,
   preview, import de imagem raster, configuração `$$`.
4. **Experiência moderna** — visual **estilo Windows 11 (Fluent Design 2)**:
   cantos arredondados, cor de acento, animações suaves, **11 temas** (5 claros,
   4 escuros, 2 de alto contraste), atalhos de teclado, feedback claro de
   estado/alarme, **i18n (pt-BR/en/es)** — com orçamento de performance
   (≤ 1,5 s de startup, ≤ 280 MB de RAM em X11 / 300 MB em Wayland) e precisão
   de instrumento (DRO em 0,001 mm). Ver `DESIGN.md`.
5. **Diagnóstico acessível** — console legível, mensagens de alarme com causa e
   solução (nos moldes do manual da COMGO).

---

## 5. Escopo

### 5.1 Dentro do escopo (produto-alvo)

- Conexão serial (USB) com GRBL 1.1 e 0.9.
- Console de comandos e log de retornos (`ok`, `error:`, `[MSG:]`, `ALARM:`).
- Jog manual (X/Y/Z) com controle de passo e velocidade.
- Carregar, validar, visualizar e **enviar** G-code com controle de fluxo.
- Controle de execução: Start, Pause (Feed Hold), Resume, Stop/Emergency, Reset.
- Status em tempo real (polling `?`), posição, feed/spindle, estimativa de tempo.
- Overrides de feed e potência (GRBL 1.1).
- Preview 2D do caminho com posição em tempo real (zoom/pan).
- Configuração GRBL: ler/editar/aplicar `$$`, ver `$#`, `$I`, `$G`.
- Importação de imagens (BMP/JPG/PNG/GIF): conversão em tons de cinza,
  *line-to-line*, *dithering* e vetorização — gerando G-code.
- Macros / botões customizados.
- Preferências persistentes (porta, baud, tema, idioma, unidades, pastas).
- 11 temas (claro/escuro/alto contraste), unidades mm/pol, idioma pt-BR/en/es.
- Barra inferior com nome, versão e crédito (WerneckLab) e menu **Ajuda → Sobre**.
- Empacotamento e distribuição para Linux.

### 5.2 Fora do escopo (por ora)

- Suporte a Windows/macOS (arquitetura não deve impedir, mas não é meta).
- Firmware GRBL customizado (ex.: parâmetros `$140` de giroscópio) — tratado
  apenas como comandos/valores genéricos de `$$`.
- CAM 3D / fresagem por eixo Z.
- Controle de câmera/visão computacional (avaliado como "Could", futuro).
- Edição vetorial completa (desenho/CAD) — o editor do **M13** cobre o que o
  laser precisa (formas, texto, traço, booleanas, offset); não competimos com
  Inkscape/LightBurn em recursos de ilustração/CAD.

---

## 6. Requisitos funcionais

Prioridade: **Must** / **Should** / **Could**. Status refere-se ao MVP atual
(✅ implementado · 🟡 parcial · ⬜ pendente).

### M1 — Conexão e transporte

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-CON-1 | Listar portas seriais disponíveis e atualizar a lista sob demanda. | Must | ✅ |
| RF-CON-2 | Conectar/desconectar com baud rate selecionável (9600/115200/250000…). | Must | ✅ |
| RF-CON-3 | Persistir última porta e baud usados (e reconectar no boot). | Should | ✅ |
| RF-CON-4 | Detectar desconexão inesperada e avisar o usuário. | Must | ✅ |
| RF-CON-5 | Ao conectar, ler `$I`/`$G` e exibir firmware/estado inicial. | Should | ✅ |
| RF-CON-6 | Reconexão automática opcional. | Could | ✅ |
| RF-CON-7 | Conexão via WiFi/serial-over-network (ESP8266). | Could | ✅ |

### M2 — Console e comandos manuais

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-CON-10 | Enviar qualquer linha de G-code/comando GRBL pelo console. | Must | ✅ |
| RF-CON-11 | Exibir retornos da máquina (`ok`, `error:`, `[MSG:]`, `ALARM:`). | Must | ✅ |
| RF-CON-12 | Diferenciar visualmente comandos enviados × respostas × erros. | Should | ✅ |
| RF-CON-13 | Histórico de comandos (setas ↑/↓). | Should | ✅ |
| RF-CON-14 | Auto-scroll com opção de pausar/limpar log. | Should | ✅ |
| RF-CON-15 | Salvar/exportar log do console. | Could | ✅ |

### M3 — Jog e movimento manual

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-JOG-1 | Jog em X+, X−, Y+, Y− (e Z quando aplicável) com passo configurável. | Must | ✅ |
| RF-JOG-2 | Jog contínuo ao manter pressionado, com parada ao soltar. | Should | ✅ |
| RF-JOG-3 | Controle de velocidade do jog. | Should | ✅ |
| RF-JOG-4 | Homing (`$H`) com feedback de progresso/erro. | Must | ✅ |
| RF-JOG-5 | Definir origem atual (`G92`/zero) e ir para zero (`G90 G0 X0 Y0`). | Must | ✅ |
| RF-JOG-6 | Atalhos de teclado para jog (setas, Home, PageUp/Down). | Should | ✅ |
| RF-JOG-7 | Jog diagonal usando modo jog dedicado do GRBL (`$J=`). | Should | ✅ |

### M4 — Carregamento e execução de G-code

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-GC-1 | Abrir arquivos `.gcode/.nc/.tap/.txt` e imagens raster. | Must | ✅ |
| RF-GC-2 | Exibir nome, nº de linhas, tamanho e tempo estimado. | Should | ✅ |
| RF-GC-3 | **Streaming confiável** com confirmação `ok`/`error` e controle de buffer. | Must | ✅ |
| RF-GC-4 | Iniciar (Play), Pausar (Feed Hold `!`), Retomar (`~`) e Parar (Reset) — sempre acessíveis durante o job por uma barra flutuante. | Must | ✅ |
| RF-GC-5 | Barra de progresso (linha atual / total) e tempo restante. | Must | ✅ |
| RF-GC-6 | Múltiplos passes (repetir programa N vezes, marcados com `; pass N/M` para o preview colorir por passada). | Should | ✅ |
| RF-GC-7 | Retomada de job interrompido (do início, de linha específica ou N linhas antes). | Should | ✅ |
| RF-GC-8 | Parada de emergência que interrompe o envio e para a máquina. | Must | ✅ |
| RF-GC-9 | Validação/aviso de linhas perigosas e limites da área de trabalho. | Could | ✅ |
| RF-GC-10 | Editor de G-code: numeração, realce, edição de linha, validação pelo pré-voo e reenvio de trecho com preâmbulo modal. | Should | ✅ |
| RF-GC-11 | Biblioteca de jobs: últimos 50 programas executados, com miniatura, reexecutar e duplicar (sem depender do arquivo original). | Could | ✅ |
| RF-GC-12 | Modo produção: repetir o programa atual N vezes (1…999), com contador, pausa para trocar a peça entre cópias, repetição da peça interrompida e pré-voo uma vez por série. A troca de programa fica travada durante a série e pausa/cancelamento continuam acessíveis na barra de gravação. | Should | ✅ |

### M5 — Status, alarmes e segurança

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-STA-1 | Polling de status `?` (5–10 Hz) e exibição do estado (Idle/Run/Hold/Alarm/Home/Jog/Door…). | Must | ✅ |
| RF-STA-2 | Exibir posição atual (MPos/WPos) e distância para ir. | Must | ✅ |
| RF-STA-3 | Exibir feed real e rotação/spindle (S) atuais. | Should | ✅ |
| RF-STA-4 | Traduzir alarmes (`ALARM:Homing fail`, `Soft limit`, `Hard limit`…) com causa e solução. | Should | ✅ |
| RF-STA-5 | Desabilitar comandos inválidos no estado de alarme. | Must | ✅ |
| RF-STA-6 | Botões Unlock (`$X`), Reset (soft reset) e Homing (`$H`). | Must | ✅ |
| RF-STA-7 | Registrar histórico de eventos/alarmes da sessão. | Could | ✅ |

### M6 — Overrides

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-OVR-1 | Override de feed rate em tempo real (0x90–0x94). | Should | ✅ |
| RF-OVR-2 | Override de potência/spindle em tempo real. | Should | ✅ |
| RF-OVR-3 | Exibir valores de override ativos. | Should | ✅ |
| RF-OVR-4 | Reset para 100% com um clique. | Could | ✅ |

### M7 — Preview 2D

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-PRV-1 | Renderizar o caminho do G-code carregado em 2D. | Should | ✅ |
| RF-PRV-2 | Zoom e pan (mouse + barra de rolagem). | Should | ✅ |
| RF-PRV-3 | Indicador da posição atual da cabeça durante a execução (posição de trabalho — `WPos`/`MPos−WCO`). | Should | ✅ |
| RF-PRV-4 | Exibir caixa delimitadora e área de trabalho da máquina. | Could | ✅ |
| RF-PRV-5 | Distinguir movimentos de corte (`G1`) de rápidos (`G0`), colorir o trecho já gravado por passada e usar a potência `S` como intensidade (imagem aparece como será gravada). | Could | ✅ |
| RF-PRV-6 | **Posicionar a gravadora**: desenhar o **contorno** da área (laser bem fraco) e **marcar o centro** da imagem levando a cabeça até ele (laser desligado). | Should | ✅ |
| RF-PRV-7 | **Simulação de job**: playback 2D do caminho à velocidade real (play/pause/parar, *seek* na linha do tempo e velocidade 1×–10×), com **tempo estimado** (soma `dist/feed`, `G0` a 3000 mm/min) e a cabeça andando no preview; reusa o preview 2D. | Should | ✅ |
| RF-PRV-8 | **Mover pelo preview**: clique no caminho escolhe um ponto (com confirmação e mira), limitado à área de trabalho; o movimento é `G90 G0` no sistema de coordenadas ativo. | Could | ✅ |

### M8 — Configuração do GRBL e preferências

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-CFG-1 | Ler e exibir todos os settings `$$` com descrição legível. | Must | ✅ |
| RF-CFG-2 | Editar e aplicar settings individualmente (`$n=valor`). | Must | ✅ |
| RF-CFG-3 | Ver `$#` (offsets), `$I` (build info) e `$G` (estado modal). | Should | ✅ |
| RF-CFG-4 | Perfis de configuração (salvar/restaurar conjunto de settings). | Could | ✅ |
| RF-CFG-5 | Preferências do app: tema, unidades, porta/baud padrão, pasta de arquivos. | Must | ✅ |
| RF-CFG-6 | Ajuda contextual sobre settings críticos (`$20`, `$21`, `$22`, `$32`). | Should | ✅ |

### M9 — Importação de imagens e geração de G-code

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-IMG-1 | Abrir imagem (PNG/JPG/BMP/GIF/WebP/AVIF) via diálogo nativo já filtrado, e exibir preview. | Must | ✅ |
| RF-IMG-2 | Ajustes de imagem: brilho, contraste, *white clip*, inversão, B&W. | Should | ✅ |
| RF-IMG-3 | Redimensionar/reposicionar: largura, altura, offset X/Y, manter proporção. | Must | ✅ |
| RF-IMG-4 | Conversão **line-to-line** (tons de cinza) com direção e resolução (linhas/mm). | Must | ✅ |
| RF-IMG-5 | Conversão **1-bit dithering** (ex.: Floyd–Steinberg). | Should | ✅ |
| RF-IMG-6 | **Vetorização** (raster → vetor) para corte/line-art: contorno por limiar + simplificação (RDP). | Could | ✅ |
| RF-IMG-7 | Parâmetros de gravação: velocidade (mm/min), S-min/S-max, modo **M3/M4**. | Must | ✅ |
| RF-IMG-8 | Perfis de material (potência/velocidade recomendadas; notas trazem as passadas). | Could | ✅ |
| RF-IMG-9 | Compensar tamanho do ponto do laser (ex.: 0,08 mm da COMGO Z1). | Should | ✅ |
| RF-IMG-10 | **Velocidade adaptativa**: passar rápido onde não há gravação e reduzir a velocidade onde há (dose = `S` ÷ velocidade). | Should | ✅ |
| RF-IMG-11 | **Máxima velocidade na máquina real**: varredura bidirecional (zigue-zague), pulo de linhas em branco e mínimo de linhas no arquivo (mesmo `S`/`F` num só `G1`). | Should | ✅ |
| RF-IMG-12 | Avisar quando a velocidade pedida (com a velocidade no claro) passa de `$110`/`$111` da máquina. | Could | ✅ |
| RF-IMG-14 | **Presets de material do usuário**: salvar os ajustes atuais (potência, velocidade, passadas, modo) com nome e notas, aplicar, excluir e **exportar/importar JSON** para compartilhar receitas; cada preset mostra a **dose** (J/mm) para comparar e **levar a receita entre módulos** (3 W/5 W/10 W). | Should | ✅ |
| RF-IMG-13 | **Teste de foco (spot)**: escada de Z **relativa ao Z atual** (G91/G90, volta ao início) com duas potências por passo, para achar a melhor altura de foco; prévia da faixa e aviso de potências iguais. | Could | ✅ |

### M10 — Macros e botões customizados

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-MAC-1 | Criar/editar botões que executam comandos/macros. | Should | ✅ |
| RF-MAC-2 | Organizar macros por grupos e importar/exportar. | Could | ✅ |

### M11 — App, i18n e distribuição

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-APP-1 | **11 temas**: 5 claros, 4 escuros e 2 de alto contraste; troca pelo modal "Aparência e idioma" e pelo menu Exibir. | Should | ✅ |
| RF-APP-2 | **i18n pt-BR, en e es** com detecção do idioma do SO na 1ª execução; troca em tempo de execução (UI + menu nativo). | Should | ✅ |
| RF-APP-3 | Unidades mm/polegadas na UI e nos comandos. | Should | ✅ |
| RF-APP-4 | Empacotar `.AppImage`, `.deb` e `Flatpak`. | Must | 🟡 |
| RF-APP-5 | Instruções de permissão de porta serial no Linux (grupo `dialout`). | Must | ✅ |
| RF-APP-6 | **Barra inferior** com nome, versão (`app.getVersion()`) e crédito "Desenvolvido por WerneckLab" com link para `lab.werneck.dev.br`. | Should | ✅ |
| RF-APP-7 | **Menu Ajuda → Sobre**: modal com nome, versão, licença (MIT), autor e links (WerneckLab/GitHub), abertos no navegador via `shell.openExternal` com whitelist. | Should | ✅ |

### M12 — Geradores de símbolos (QR Code e código de barras)

> Disponíveis em **Ferramentas**; o G-code gerado entra no pipeline normal
> (preview/Play/Salvar). O **lote** (RF-SYM-10) usa os mesmos ajustes de símbolo
> como molde e gera uma peça por linha da planilha. Plano completo:
> [`PLANO_QR_BARCODE.md`](PLANO_QR_BARCODE.md).

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-SYM-1 | Gerar **QR Code** a partir de texto/URL, com nível de correção (L/M/Q/H) e seleção automática de versão (1–40). | Must | ✅ |
| RF-SYM-2 | Gerar **código de barras 1D** (Code 128, EAN-13, EAN-8, UPC-A, Code 39) com dígito verificador e zonas de silêncio conforme a norma. | Must | ✅ |
| RF-SYM-3 | **Dimensionar em mm** — largura × altura finais do símbolo (quiet zone incluída; ou o tamanho do módulo / X-dimension e a altura das barras) — e **posicionar** na área de trabalho. | Must | ✅ |
| RF-SYM-4 | **Parâmetros de gravação** (velocidade, potência, passadas, modo M3/M4) e **pré-visualização** antes de gravar. | Should | ✅ |
| RF-SYM-5 | **Avisos de legibilidade**: módulo/X-dimension pequenos para o spot do laser, quiet zone reduzida, símbolo fora da área de trabalho e símbolo esticado (largura ≠ altura) — com causa e ação. | Should | ✅ |
| RF-SYM-6 | **Texto legível (HRI)** sob o código de barras, opcional. | Could | ✅ |
| RF-SYM-7 | Simbologias adicionais: 1D (ITF-14, Codabar, Code 93, GS1-128) e 2D (Data Matrix, PDF417, Aztec). **Entregue:** 1D extras + Data Matrix ECC200 (v0.7.0), PDF417 (v0.8.0) e **Aztec** (v0.10.0). | Could | ✅ |
| RF-SYM-8 | **Salvar `.gcode`** ou enviar direto para a área de execução (preview + Play), sem IPC novo. | Should | ✅ |
| RF-SYM-9 | Gerar **vários símbolos em grade** a partir de uma lista (1 por linha), com espaçamento configurável. | Could | ✅ |
| RF-SYM-10 | **Lote / dados variáveis**: planilha (CSV/TSV colada ou aberta) → **fila de gravação**, uma peça por linha, com modelo de campos (`{1}`, `{nome}`, `{i:03}`, `{total}`), **pausa para trocar a peça**, contador e **retomada** depois de fechar o app. | Could | ✅ |
| RF-ONB-1 | **Onboarding** de primeira execução: tour de 5 passos (conectar → perfil da máquina → abrir → preview → gravar), reabrível pela Ajuda e dispensável (“não mostrar”). | Should | ✅ |

### M13 — Editor vetorial ("Desenhar")

> Prancheta de desenho própria (Fase P2.1 do `PLANO_PREMIUM.md`), integrada ao
> mesmo pipeline de gravação (posicionar → preview → Play/Salvar). Detalhes de
> interface em [`DESIGN.md`](DESIGN.md) §4.

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-DSN-1 | **Prancheta em mm** com réguas, grade e área inicial vinda da máquina (`$130`/`$131`), com zoom (roda do mouse, `F`, `0`) e pan. | Must | ✅ |
| RF-DSN-2 | **Formas**: retângulo, elipse, linha, **caneta** (desenho livre com simplificação RDP e fechamento automático) e **texto vetorial** (traço ou preenchido, fontes do sistema). | Must | ✅ |
| RF-DSN-3 | **Seleção e transformação**: seleção múltipla (marquee), mover, redimensionar, rotacionar (com travar proporção), ordem Z, agrupar/desagrupar e duplicar. | Must | ✅ |
| RF-DSN-4 | **Snap e alinhamento**: snap a objetos e à página com guias; alinhar à página; **matriz de cópias**, **espelhar** (H/V) e **distribuir** espaçamento. | Should | ✅ |
| RF-DSN-5 | **Parâmetros de gravação por objeto**: potência em **% do `$30`**, velocidade (`F`) e **espessura do traço** (`E`, em mm — faixa centrada no caminho), com copiar/colar estilo. | Should | ✅ |
| RF-DSN-6 | **Booleanas** (unir/subtrair/intersecção/exclusão) com **furos por paridade** e contornos aninhados andando juntos. | Should | ✅ |
| RF-DSN-7 | **Contorno paralelo (offset)**: distância ± (mm), passadas concêntricas, cantos `miter`/`round`/`bevel` e opção de manter o original. | Should | ✅ |
| RF-DSN-8 | **Edição de nós**: mover nó, inserir nó em segmento e remover (respeitando o mínimo de 2/3 pontos). | Could | ✅ |
| RF-DSN-9 | **G-code do desenho ancorado na origem da máquina (X0 Y0)**: o **canto inferior esquerdo da arte vira X0 Y0**; a posição do objeto na prancheta compõe a arte mas **não desloca o job**; cada contorno começa pelo **canto mais próximo** do cabeçote. O usuário posiciona o laser no material e **define a origem** ali (`G10 L20`/`G92`). | Must | ✅ |
| RF-DSN-10 | **G-code do desenho sempre válido**: `F` > 0, `0 ≤ S ≤ $30`, `passes ≥ 1` e nenhuma coordenada `NaN`/`Infinity` — entradas inválidas caem em padrão seguro em vez de gerar `error:` no meio do job. | Must | ✅ |
| RF-DSN-11 | **Preferências do desenho** lembradas entre sessões (velocidade, potência, passadas, modo M3/M4, grade e último texto). | Should | ✅ |
| RF-DSN-12 | **"Gerar e visualizar"**: perguntar o tamanho da arte, abrir o posicionamento (contorno/centro + parâmetros) e regerar o G-code; o preview pinta **só a queima** (a caixa da área de trabalho é referência). | Must | ✅ |
| RF-DSN-13 | **Camadas / multi-operação**: cada objeto pertence a uma camada; a ordem das camadas é a ordem de execução e cada uma tem potência/velocidade/passadas/modo próprios (vazio herda o global). Permite **gravar + cortar numa execução**, reordenar **arrastando** (ou ↑/↓) e move a seleção entre camadas. O G-code emite **`M5` antes de trocar potência/modo** e repete as passadas da camada × objeto. | Must | ✅ |
| RF-DSN-14 | **Importação DXF ASCII**: converte arquivos de CAD em G-code de contorno — `LINE`, `LWPOLYLINE`/`POLYLINE` (com *bulge*), `CIRCLE`, `ARC`, `ELLIPSE` e `SPLINE` (NURBS), blocos/`INSERT` (translação, escala, rotação e arrays), `$INSUNITS` → mm, camadas congeladas/desligadas ignoradas e aviso das entidades não convertidas (texto, hatch, dimensões). Contornos normalizados em (0,0), com preview/salvar; DXF binário é recusado com orientação. | Should | ✅ |
| RF-DSN-15 | **Importação PDF vetorial**: extrai caminhos do conteúdo (`FlateDecode`/`ASCIIHex`/`ASCII85`, *object streams*, `cm`/`q`/`Q`, Form XObjects e rotação de página) e reusa o pipeline de contornos. Importa a **primeira página**; texto e imagens são ignorados com aviso (fontes não viram curvas). | Could | ✅ |
| RF-DSN-16 | **Salvar/abrir o desenho** (`.gstudio`, JSON versionado): guarda página, formas com estilo, **camadas** (ordem de execução), camada ativa, texto e símbolo com os metadados de reedição — sem arredondar coordenadas. Abrir substitui o desenho (com aviso quando há alterações não salvas) e vira o novo ponto do undo/redo; arquivo inválido, de outro app ou de versão futura é recusado com mensagem própria, nunca quebra a UI. Atalhos **Ctrl+S**/**Ctrl+O**. | Should | ✅ |
| RF-DSN-17 | **Folga de corte (kerf) por camada**: a camada informa a largura que o laser remove (mm); contornos **externos crescem `kerf/2`** e **furos encolhem `kerf/2`** (profundidade por *even-odd*, então ilhas dentro de furos voltam a crescer), para a peça sair no tamanho do desenho. Só contornos fechados e sem traço grosso são compensados (linha aberta e preenchimento são gravação); furo menor que a folga é **omitido** com aviso no G-code; a âncora X0 Y0 usa a área compensada (sem coordenada negativa). A prancheta desenha o caminho compensado em **tracejado laranja**, para conferir antes de gerar. | Should | ✅ |
| RF-DSN-18 | **Abas de retenção (tabs)**: a camada informa quantas “pestanhas” seguram a peça e a largura de cada uma (mm); o contorno fechado é dividido em N trechos de corte separados pelas abas, onde o laser **desliga** (cada trecho tem sua própria ignição e a peça não se solta). Só vale para corte (contorno fechado sem traço grosso); contorno curto demais reduz a contagem e, sem espaço para nenhuma aba, corta inteiro. | Could | ✅ |
| RF-DSN-19 | **Sobre-corte (lead-in/out)**: a camada informa quantos mm o corte continua **além da origem** do contorno, na mesma direção, para a emenda não ficar com um “bico” queimado (ponto duplo de ignição). Limitado a 5 mm e ignorado quando a camada tem abas (o contorno já é dividido em trechos). | Could | ✅ |
| RF-DSN-20 | **Custo por peça**: o diálogo de tamanho mostra o custo estimado da peça = **tempo de máquina** (tempo do programa no mesmo estimador do G-code × tarifa/hora) + **material** (área da arte × preço/m²), na moeda escolhida (R$/US$/€). Tarifa, preço e moeda ficam nas preferências; é uma **prévia** — não altera o G-code nem o desenho até confirmar o tamanho. | Could | ✅ |
| RF-DSN-21 | **Tiling (peça maior que a mesa)**: o G-code é dividido em **janelas** do tamanho útil da máquina, com **sobreposição** configurável na emenda. Cada tile sai num arquivo próprio (`peca-r1c2.gcode`) com a **origem no canto inferior esquerdo da janela** — o usuário reposiciona material/zero entre eles. O recorte usa os movimentos já parseados, então kerf, abas e passadas do programa são preservados; G1 sem potência não vira corte e coordenadas nunca saem da janela. O diálogo mostra a **prévia do plano** (janelas rotuladas `r1c1`, `r1c2`…). Pasta escolhida uma vez, todos os arquivos são gravados juntos (máx. 200 tiles). | Could | ✅ |
| RF-DSN-22 | **Marcas de registro (fiduciais)**: insere `L`s nos quatro cantos ou **cruzes** no meio dos lados, fora da arte (distância e tamanho configuráveis), na **camada ativa**. Servem para alinhar a peça na mesa (jogar o laser até a marca e zerar o eixo), conferir frente/verso e remontar peças. São **linhas abertas** (gravação): não entram no kerf nem fecham a peça. Usam a seleção como referência, se houver, senão a arte inteira; cada conjunto entra como **um grupo** nomeado. | Could | ✅ |
| RF-DSN-23 | **Gravar dos dois lados**: gera **dois programas** — o lado A como está e o lado B **espelhado na horizontal em torno do centro da arte** — **sem alterar o documento**. As marcas de registro (L/cruzes, simétricas) caem nas mesmas coordenadas nos dois programas e ambos usam a **mesma origem** (mesma área), então a peça virada se alinha pelas marcas do lado A, que são **refeitas** no lado B. Opcionalmente insere as marcas L em volta da arte nos dois programas. Os arquivos saem juntos na pasta escolhida (`peca-lado-a.gcode`, `peca-lado-b.gcode`). | Could | ✅ |
| RF-DSN-24 | **Geradores paramétricos**: caixa com **encaixe de dedos** (medidas externas L×P×A + espessura do material, largura do dedo, folga da fenda e tampa opcional) e **engrenagem de dentes retos** com perfil evolvente (módulo, dentes, ângulo de pressão e furo opcional). A caixa sai com as 5–6 peças deitadas na chapa, **sem sobreposição**, com dedos/fendas complementares (fenda = dedo + folga) e vãos nos cantos; cada geração entra no desenho como **um grupo** (a caixa inteira move junto; a engrenagem e o furo também), na camada ativa. Geometria pura em `src/shared/generators.ts` — o kerf continua por conta da camada. | Could | ✅ |
| RF-DSN-25 | **Gabarito (molde)**: a partir da seleção (ou da arte inteira) gera o **contorno externo deslocado** pela folga de encaixe — um molde por peça, para apoiar a peça sempre no mesmo ponto da mesa. Só contornos fechados entram (mesmo critério *even-odd* do kerf): furos, ilhas e linhas abertas ficam de fora, com aviso. Marcas de registro (L) opcionais em volta do molde, no **mesmo grupo** (o molde inteiro move junto); folga de 0–5 mm (padrão 0,4 mm). | Could | ✅ |
| RF-DSN-26 | **Texto em curva/arco**: o bloco de texto é dobrado sobre um arco de raio R **sem esticar as letras** (comprimento de arco e altura preservados); raio positivo curva para cima e negativo para baixo. A linha de base e as linhas extras acompanham o arco como arcos concêntricos. O raio fica no metadado do texto (reeditar mantém a curva) e há um **raio mínimo** por largura para o texto não fechar em círculo. | Could | ✅ |

### M14 — Informação da máquina, pré-voo e diagnóstico

> Transforma o que a máquina **já responde** (`$I`, `$$`, `$#`, `$G`, `$N`, `?`)
> em decisão: evitar queima errada, material perdido e suporte demorado. Spec
> técnica, regras de pré-voo e DoD em [`PLANO_MAQUINA.md`](PLANO_MAQUINA.md)
> (v0.6, itens **P0.7/P0.8**). Primeira coleta real: Sculpfun C1 (§11 da spec).

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-MAQ-1 | **Ler `$I`**: firmware, plataforma, opções (`V`/`C`/`M`), profundidade do planner e buffer RX, tolerando variações (`[VER:1.3a.20250324:]`, `[OPT:H]` sem números) e o `[MSG:…]` de auto-identificação. | Must | ✅ |
| RF-MAQ-2 | **Ler `$$`** e derivar fatos: curso (`$130/$131/$132`), velocidade/aceleração máximas, passos/mm, faixa de `S` (`$30/$31`), modo laser/PWM (`$32/$33`), limites (`$20/$21`), homing (`$22-$26`), inversões, máscara de status e unidade — todo campo **opcional**. | Must | ✅ |
| RF-MAQ-3 | **Ler `$G`** (estado modal), **`$#`** (G54–G59, G28/G30, G92, TLO, PRB) e **`$N`** (*startup blocks*, ignorando linhas vazias). | Must | ✅ |
| RF-MAQ-4 | **Painel "Máquina"** com firmware, curso, limites, laser, offsets e "agora", com **degradação graciosa**: o que o firmware não informa aparece como `—` + "o firmware não informa". | Must | ✅ |
| RF-MAQ-5 | **Área de trabalho do preview** vinda do curso real da máquina, com aviso quando o job não cabe. | Must | ✅ |
| RF-MAQ-6 | **Pré-voo MX-1…MX-15** antes de iniciar o job, com severidade (`block`/`warn`/`info`), causa explícita e ação de 1 clique; `block` só no que o GRBL rejeitaria (`error:15/17/22`) ou que **queima errado**. | Must | ✅ |
| RF-MAQ-7 | **Indicador de pinos** (`Pn`) na barra de status; quando o firmware não reporta (máscara `$10`), fica desabilitado **com explicação** — sem sugerir escrita de setting por conta própria. | Should | ✅ |
| RF-MAQ-8 | **"Copiar diagnóstico"**: texto único e colável (firmware, transporte, curso, limites, laser, offsets, status, startup e alarmes), sem dados pessoais, funcionando **sem rede**. | Should | ✅ |
| RF-MAQ-9 | **Nenhuma escrita de setting sem consentimento**: toda correção sugerida pelo pré-voo ou pelo perfil mostra valor **antes/depois** e pede confirmação. | Must | ✅ |
| RF-MAQ-10 | **Perfil de máquina é o lugar dos valores específicos**: curso, homing, `S-max` (`$30`), módulo do laser, potência do laser "de apontar" e o conjunto mínimo de settings ficam no perfil, não chumbados no código. | Must | ✅ |

---

## 7. Requisitos não-funcionais

| ID | Requisito | Justificativa |
| :--- | :--- | :--- |
| RNF-1 | **Confiabilidade de streaming**: nunca enviar mais linhas do que o buffer do GRBL aceita; nunca perder um `ok`. | Envio atual (fire-and-forget) pode travar a máquina. |
| RNF-2 | **Latência de UI**: status visível com ≤ 200 ms de atraso; UI nunca congela durante envio. | Envio deve ser assíncrono no processo main. |
| RNF-3 | **Segurança**: `contextIsolation` ligado, `nodeIntegration` desligado, IPC mínimo e validado. | Requisito de Electron. |
| RNF-4 | **Portabilidade Linux**: Ubuntu/Fedora/Arch, X11 e Wayland; acesso a `/dev/ttyUSB*` e `/dev/ttyACM*`. | Público-alvo. |
| RNF-5 | **Testabilidade**: lógica de protocolo isolada e testável sem hardware (GRBL simulado). | Reduz risco e regressões. |
| RNF-6 | **Tipagem**: TypeScript estrito no main/preload e no renderer. | Manutenibilidade. |
| RNF-7 | **Código aberto** com licença definida e build reprodutível. | Comunidade e adoção. |
| RNF-8 | **Recuperação**: fechar o app durante um job não deve deixar a máquina em estado desconhecido sem aviso. | Segurança do equipamento. |
| RNF-9 | **Observabilidade**: log persistente de sessão para diagnóstico. | Suporte ao usuário. |
| RNF-10 | **Aparência**: seguir o design system Windows 11 (Fluent Design 2) — cantos 4/8 px, tokens de tema, cor de acento, estados de controle. Ver `DESIGN.md`. | Familiaridade e qualidade percebida. |
| RNF-11 | **Performance**: startup ≤ 1,5 s · RAM ≤ 280 MB em X11 e ≤ 300 MB em Wayland (PSS total com GPU, app sozinho, após 10 min; uma janela Electron vazia já mede 213/236 MB) · resposta a interação ≤ 100 ms · UI ≥ 55 fps com job rodando · CPU ociosa ≈ 0 %. | "Rápido e leve" é requisito medível. |
| RNF-12 | **Precisão visual**: DRO em 0,001 mm com `tabular-nums`, nítido em DPI 100/125/150/200 %, canvas com `devicePixelRatio`, sem arredondar valores de G-code. | "Preciso" é requisito medível. |
| RNF-13 | **Acessibilidade**: contraste AA, alvos de clique ≥ 32 px, foco visível, Stop sempre acessível por teclado, estados redundantes com texto. | Segurança e inclusão. |

---

## 8. Referência do protocolo GRBL (base técnica)

### 8.1 Comandos de tempo real (sem `\n`, enviados como byte único)

| Comando | Byte | Função |
| :--- | :--- | :--- |
| Soft Reset | `Ctrl-X` (0x18) | Reinicia o controlador; aborta o job. |
| Status Report | `?` | Retorna `<Estado\|MPos:…\|FS:…\|…>`. |
| Feed Hold | `!` | Pausa a execução (estado *Hold*). |
| Cycle Start / Resume | `~` | Retoma a execução. |
| Safety Door | 0x84 | Abre/fecha porta de segurança. |
| Override Feed 100% | 0x90 | Define override de avanço em 100%. |
| Override Feed +10% / −10% | 0x91 / 0x92 | Ajuste grosso de avanço. |
| Override Feed +1% / −1% | 0x93 / 0x94 | Ajuste fino de avanço. |
| Spindle/Rapid override | 0x99/0x9A, 0x9B/0x9C, 0x95/0x96 | Overrides de spindle/rápido. |

> **Atenção:** comandos de tempo real **não** levam `\n`. O código atual envia
> `'!\n'`, o que é um bug.

### 8.2 Comandos de linha (terminam com `\n`)

- `$H` homing · `$X` unlock · `$J=X0 Y0 F1000` jog · `G92 X0 Y0` set origin
- `$$` settings · `$#` offsets · `$I` build info · `$G` parser state
- `$n=valor` gravar setting · `$RST=` restore · `$SLP` sleep

### 8.3 Formato do status report

```
<Idle|MPos:0.000,0.000,0.000|FS:0,0|WCO:0.000,0.000,0.000>
<Run|MPos:12.340,5.000,0.000|FS:1200,0|Ov:100,100,100>
<Alarm|MPos:0.000,0.000,0.000>
```

Campos: `MPos` (posição máquina), `WPos` (posição de trabalho), `FS` (feed/S),
`Ov` (overrides), `WCO` (work coordinate offset), `Pn` (pinos), `Bf` (buffer).

### 8.4 Streaming com controle de fluxo

- **Send-response (recomendado no início):** envia uma linha e aguarda `ok`
  (ou `error:`) antes da próxima. Simples e à prova de estouro de buffer.
- **Character-counting (otimização futura):** acompanha o buffer RX do GRBL
  (128 bytes via `Bf:` no report) para manter a máquina sempre ocupada.

---

## 9. Matriz de paridade com o LaserGRBL (alvo)

> Comparação ampliada com **todo o mercado** (LightBurn, Rayforge, MeerK40t, UGS,
> xTool Studio, etc.): ver `ANALISE_COMPETITIVA.md` §7.

| Área | LaserGRBL | Meta GRBL Studio |
| :--- | :--- | :--- |
| Interface (conexão, arquivo, console, jog, preview, reset/home/unlock, hold/resume, contagem/tempo, overrides) | ✅ | Paridade |
| Conexão USB/Serial | ✅ | Paridade |
| Conexão WiFi (ESP8266) | ✅ | Could |
| Load & Send + múltiplos passes | ✅ | Paridade |
| Overrides de feed/potência | ✅ | Paridade |
| Jogging | ✅ | Paridade |
| Custom buttons | ✅ | Paridade |
| Raster import (grayscale, line-to-line, dithering, vectorize, target options) | ✅ | Paridade |
| Configuração (`$$`) | ✅ | Paridade |
| Machine status e alarmes | ✅ | Paridade |
| Geradores de **QR Code** / **código de barras** (RF-SYM-*) | ❌ (não possui) | Beyond (2 ferramentas dedicadas, integradas ao preview/gravação) |
| **Editor vetorial** próprio (RF-DSN-*: formas, texto, traço, booleanas, offset, nós) | ❌ (não possui) | Beyond (prancheta em mm integrada ao fluxo de gravação) |
| Distribuição | Windows (Mono no Linux) | Nativa: AppImage/deb/Flatpak |

---

## 10. Critérios de aceite globais

1. O usuário consegue conectar em `/dev/ttyUSB0` a 115200, gravar uma imagem
   PNG em madeira e ver a posição da cabeça no preview em tempo real, **sem
   perder linhas nem travar a máquina**.
2. Pausar/retomar/parar funcionam em tempo real durante um job de ≥ 10 min.
3. O status (Idle/Run/Hold/Alarm) e a posição são exibidos corretamente e
   atualizados com ≤ 200 ms de latência.
4. Alarmes exibem causa e ação recomendada; botões inválidos ficam desabilitados.
5. Editar um setting `$$` e enviar em seguida reflete na máquina.
6. O app roda no Ubuntu 24.04 e Fedora 40, em X11 e Wayland, a partir de um
   `.AppImage` sem instalação.
7. Um job interrompido pode ser retomado a partir de uma linha escolhida.
8. O usuário gera um **QR Code** e um **código de barras (Code 128)** pelo menu
   Ferramentas, vê o preview, grava na peça e ambos são lidos por um aplicativo
   leitor de celular (RF-SYM-1/2/5).
9. Um desenho feito na prancheta (por exemplo um quadrado 2 × 2 no meio de uma
   página 10 × 10) é gravado **começando em X0 Y0**, sem a máquina se deslocar em
   diagonal até a arte: o usuário posiciona o laser no material, define a origem
   ali e dá Play (RF-DSN-9).

---

## 11. Glossário

| Termo | Significado |
| :--- | :--- |
| **GRBL** | Firmware open-source para controlar máquinas CNC/laser de 3 eixos via G-code. |
| **G-code** | Linguagem de comandos de movimento/ferramenta (ex.: `G0`, `G1`, `G92`). |
| **Jog** | Movimento manual da cabeça, sem executar um programa. |
| **Override** | Ajuste percentual em tempo real de avanço/potência. |
| **Feed Hold / Resume** | Pausar (`!`) / retomar (`~`) a execução. |
| **Homing** | `$H`; levar os eixos aos fins de curso para estabelecer zero. |
| **Unlock** | `$X`; limpar estado de alarme. |
| **Dithering** | Conversão de tons de cinza em padrão de pontos (1-bit). |
| **Line-to-line** | Estratégia de gravação linha a linha com potência variável (PWM/S). |
| **M3 / M4** | Modos de laser: M3 = potência constante; M4 = potência dinâmica por velocidade. |
| **MPos / WPos / WCO** | Posição de máquina / de trabalho / offset de coordenada de trabalho. |
