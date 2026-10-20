# GRBL Studio — Análise: pontos fortes, fracos, melhorias e concorrência

> Análise do app em **18/10/2026 (v0.5.1)**, **reconciliada com o código em
> 19/10/2026 (v0.8.0)** + **comparativo de mercado (out/2026)**.
> Fontes: `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/PLANO_DE_ACAO.md`,
> `docs/PLANO_PREMIUM.md`, `docs/FEATURES_COMPARISON.md`, `docs/DESIGN.md`, código
> em `src/` e `public/`, e pesquisa pública do mercado — links e datas em §8.
>
> ℹ️ Comparativo ampliado (pagos + gratuitos) na **§7**. Os preços de terceiros
> mudam: confirme no site do fornecedor antes de citar.

---

## 1. Resumo executivo

**GRBL Studio** é um controlador de gravadoras/cortadoras a laser com firmware
**GRBL 1.1**, gratuito e de **código aberto (MIT)**, escrito em **Electron +
TypeScript**, com builds para **Linux, Windows e macOS** gerados pelo CI. Nasceu
como "alternativa Linux ao LaserGRBL" e hoje já cobre parte do terreno do
LightBurn (design 2D, importação de SVG/DXF, grade de teste de material).

**O que mudou desde a análise de v0.4.0** (17/10/2026):

| Área | Estado em v0.8.0 |
| :--- | :--- |
| Ferramentas de desenho (P2.1/P2.1b) | ✅ Formas, **texto** (vetor/preenchido/traço), caneta + nós, seleção múltipla/marquee, ordem Z, agrupar, **matriz de cópias**, espelhar, distribuir, snap, réguas, undo/redo, **potência/velocidade/espessura por objeto**, **booleanas** (unir/subtrair/intersecção/exclusão) e **contorno paralelo**. |
| Importação SVG (P1.6) | ✅ `shared/svg.ts` → contorno G-code. |
| Importação DXF/PDF (P2.4) | ✅ `shared/dxf.ts` (DXF ASCII) e `shared/pdf.ts` (PDF vetorial) → contornos → G-code; texto de PDF não vira curvas. |
| Grade de teste de material (P1.7) | ✅ Modal + gerador + testes. |
| Símbolos QR/barcode (P2.7/P2.8) | ✅ QR (ISO/IEC 18004) + 1D (Code 128/39, EAN-13/8, UPC-A, ITF-14, Codabar, Code 93, GS1-128) com HRI; Data Matrix ECC200, **PDF417** e **Aztec**; **grade a partir de uma lista** (RF-SYM-9) e **lote/dados variáveis** (RF-SYM-10: CSV → fila de gravação, com troca de peça e retomada). |
| Simulação de job (P2.3) | ✅ Playback 2D com play/pause/seek e tempo estimado (RF-PRV-7). |
| Painel "Máquina" + pré-voo (P0.7/P0.8) | ✅ `$I/$$/$#/$G/$N` → cartões, pré-voo MX-1…MX-15, diagnóstico copiável e chip de pinos `Pn` (RF-MAQ-7). |
| Auto-update (P1.2) | ✅ `electron-updater` (`checkForUpdatesAndNotify`). |
| Builds Win/macOS (P1.1) | ✅ Matrix no `release.yml` (AppImage/deb · exe/msi/zip · dmg/zip). |
| Testes | **731 casos em 42 arquivos** (Vitest) + E2E Playwright + smoke headless. |
| Catálogo de máquinas (RF-MAQ-10) | ✅ **30 perfis** (incl. Genérico) + import `.lbdev` + smart connect (P2.5). |
| Z no jog (P1.5) | ✅ Botões `Z+/Z−` e `PageUp/PageDown`. |

**Pontos fortes marcantes:** protocolo GRBL robusto e testado (janela por bytes,
comandos de tempo real corretos, WCO cache, DTG, alarmes com ação recomendada);
**pipeline de imagem acima da média** (velocidade adaptativa, zigue-zague, fusão
de trechos, `S` como intensidade no preview, cor por passada); **preview em
camadas** (3 ms/quadro com 270 mil trechos); design 2D já funcional; i18n em 3
idiomas com paridade por type-check; 11 temas; segurança IPC correta; CI/CD com
release automática em 3 SOs.

**Maiores lacunas vs. mercado:** **câmera**, **rotativa**, **nesting**,
**importação AI/EPS/HPGL**, **catálogo de máquinas** (22 perfis + Genérico, mas
sem galvo/DSP.

**Novo cenário competitivo (2026):** o rival gratuito mais direto deixou de ser o
LaserGRBL e passou a ser o **Rayforge** (MIT, GTK4, multiplataforma, muito
completo e ativo); o **MeerK40t** entrou em **modo de manutenção** (oportunidade);
o **LaserGRBL** segue Windows-only e quase estagnado; o **LightBurn** consolidou
o topo pago (Core US$ 99 / Pro US$ 199, com *nesting* virando exclusivo Pro na
2.2); e as marcas de hardware (**xTool Studio**, **LaserPecker**) empurram
software grátis mas **preso à máquina** — a brecha para um app aberto, leve e
multiplataforma continua aberta.

---

## 2. Posicionamento

| Atributo | GRBL Studio |
| :--- | :--- |
| Público-alvo | Hobbyistas e pequenos ateliês com gravadora GRBL (Sculpfun, Ortur, AtomStack, Longer…) em Linux/Windows/macOS. |
| Preço | Gratuito, código aberto (**MIT**). |
| Sistemas | Linux (AppImage + deb, validado), Windows (nsis/portable) e macOS (dmg/zip) empacotados pelo CI — amadurecendo. |
| Controladores | **Somente GRBL** (1.1). Sem Ruida/Trocen/galvo (EZCad)/DSP. |
| Idiomas | pt-BR, en, es (paridade garantida por type-check). |
| Temas | 11 (claro/escuro, Fluent/Windows 11). |
| Testes | 381 (Vitest) + E2E (Playwright) + smoke headless. |

---

## 3. Pontos fortes

### 3.1 Protocolo e comunicação (diferencial técnico)
- **Envio por janela com contagem de caracteres** (até o buffer RX lido de
  `[OPT:…]`), evitando travamento por buffer *e* fome de linhas (medição: 63 →
  427 linhas/s com latência de 16 ms).
- **Comandos de tempo real corretos** (`?`, `!`, `~`, `0x18`, `0x90–0x94` sem `\n`).
- **Cache de WCO** (posição de trabalho estável), DTG ("para ir") e status com
  overrides de feed/spindle/rapid.
- **Alarmes decodificados com ação recomendada**, bloqueio de comandos em
  alarme e histórico persistente.

### 3.2 Pipeline de imagem → G-code (acima da média)
- Line-to-line e dithering (Floyd–Steinberg), vetorização por contorno (RDP),
  brilho/contraste/white clip/inversão/B&W.
- **Velocidade adaptativa** (dose = `S` ÷ velocidade), **varredura
  bidirecional**, **pulo de linhas brancas**, **fusão de trechos** com mesmo
  `S`/`F`, `M5`/rearme só quando o laser estava ligado.
- Perfis de material (COMGO Z1: 3 W/5 W/10 W) e compensação do ponto do laser.

### 3.3 Preview e UX
- Preview 2D em canvas com zoom/pan, área de trabalho tracejada, crosshair em
  WPos, trecho executado **colorido por passada** e **brilho proporcional ao `S`**.
- **Preview em camadas**: 300 ms → 3 ms por quadro com 270 mil trechos.
- Modal "Posicionar a gravadora" (contorno em laser fraco + marcar centro),
  job bar flutuante (Pausar/Retomar/Cancelar) e `Esc`/`Ctrl+X` = emergência.

### 3.4 Design 2D (novo desde a última análise)
- Formas, texto (3 modos), caneta com RDP e edição de nós, snap com guias,
  réguas, alinhamento, ordem Z, agrupar/duplicar, matriz de cópias, espelhar,
  distribuir, **booleanas** e **contorno paralelo**.
- **Estilo por objeto** (potência %, velocidade, espessura do traço) + copiar/colar
  estilo — o mesmo modelo que serve às futuras ferramentas de geração.

### 3.5 Ferramentas
- **Grade de teste de material** (superior ao próprio LightBurn: gera no app e
  já manda para o preview).
- **Importação SVG** → contorno G-code (ponte para o Inkscape).
- **QR Code e código de barras** — implementados (S1/S2 na v0.6.0; 1D extras
  e Data Matrix na v0.7.0; `PLANO_QR_BARCODE.md`); ainda ausentes em LaserGRBL,
  MeerK40t, LaserWeb4 e Rayforge.

### 3.6 Qualidade de engenharia
- **731 testes** (Vitest) + E2E + smoke; IPC tipado; `contextIsolation: true`,
  `nodeIntegration: false`; protocolo isolado da UI; funções puras testáveis.
- i18n em 3 idiomas com paridade garantida por `satisfies` + type-check;
  Biome (lint/format); 11 temas por tokens CSS.
- CI (`ci.yml`) + release automática (`release.yml`) para **Linux, Windows e
  macOS**.

### 3.7 Empacotamento e distribuição
- AppImage + `.deb` publicados na tag `v*`; `.exe`/`.msi`/`.zip` (Windows) e
  `.dmg`/`.zip` (macOS) empacotados no mesmo pipeline; **auto-update** ligado;
  Flatpak em scaffold.

---

## 4. Pontos fracos e riscos

### 4.1 Funcionalidades ausentes (vs. concorrentes)
- **Sem câmera** (Rayforge, LightBurn, MeerK40t, LaserWeb4, xTool Studio).
- **Sem rotativa (eixo A)** — todos os principais rivais têm (exceto LaserGRBL).
- **Sem nesting** (LightBurn 2.1 Quick Nest / 2.2 True Nest no Pro; Rayforge tem
  padrões de matriz; xTool tem *Smart Nesting*).
- **Simulação 3D** — Rayforge (3D), LightBurn e MeerK40t; o GRBL Studio já tem o
  **playback 2D com tempo** (P2.3/RF-PRV-7), falta a visualização 3D.
- **Importação vetorial: SVG/DXF/PDF (sem AI/EPS/HPGL)** — Rayforge importa
  SVG, DXF, PDF, AI, EPS, HPGL, bitmaps e até `.lbrn2`/`.rd`; LightBurn importa
  DXF/AI/PDF/3D. O PDF vetorial entrou no P2.4 (texto não é convertido em
  curvas); AI/EPS seguem pendentes.
- **Editor de G-code** entregue (P1.10): realce, numeração, edição de linha,
  validação pelo pré-voo e reenvio de trecho com preâmbulo modal. UGS,
  gSender e LightBurn têm editores mais completos (busca/substituir em massa,
  macros de edição); o nosso cobre o fluxo de corrigir e reenviar.
- **Biblioteca de jobs** entregue (P2.9/RF-GC-11): últimos 50 programas com
  miniatura, reexecutar e duplicar. LightBurn tem *recent files* e o xTool
  Studio uma biblioteca na nuvem; a nossa é **local**, guarda o programa (não o
  caminho) e não depende do arquivo original.
- **Sem suporte a galvo/DSP** (Ruida, Trocen, EZCad, Epilog) — LightBurn Pro,
  MeerK40t, EZCAD, RDWorks.
- **Catálogo de máquinas = 30 perfis** (com Genérico), **import `.lbdev`** e
  **smart connect** (P2.5). LightBurn traz dezenas de perfis e importa `.lbdev`;
  Rayforge tem 60+ materiais e perfis.
- **Sem CLI/headless**, **sem plugins/addons** (Rayforge e gSender têm) e
  **sem nuvem/AI/marketplace** (xTool Studio, Glowforge).
- QR/código de barras **implementados** (v0.6.0/v0.7.0/v0.8.0), com **grade a
  partir de uma lista** (RF-SYM-9), **PDF417** (RF-SYM-7), **Aztec** (v0.10.0) e
  **lote/dados variáveis** (RF-SYM-10); falta o símbolo como objeto no editor.

### 4.2 Plataforma e distribuição
- Ordem de maturidade: **Linux validado** > Windows/macOS **empacotados, mas não
  validados em hardware**.
- **Flatpak** apenas em scaffold; sem repositório apt/winget/brew nem Flathub.
- Sem assinatura de código (macOS/Windows) — atrito no primeiro uso.

### 4.3 Arquitetura e manutenção
- **Renderer em vanilla JS** (`public/renderer.js` enorme) enquanto `src/` é TS;
  a migração (ADR-2, Svelte/electron-vite) segue pendente.
- Bundles gerados (`public/*.js`) exigem rebuild — atrito no desenvolvimento.
- Documentação com **drift** (a matriz de paridade ficou defasada; este arquivo
  corrige parte).
- Checklist visual `DESIGN.md` §8 (DPI/RAM/fps) ainda **não medido formalmente**.
- E2E cobrindo os fluxos principais (tour, i18n, máquina/preflight e **job real
  por PTY**) — ampliar para o fluxo completo de produção (camadas, lote).

### 4.4 Produto e mercado
- **Concorrência nova e forte**: Rayforge (MIT, ativo, multiplataforma, muito
  completo) ocupa exatamente o nicho "aberto + moderno" que era exclusivo do
  GRBL Studio.
- **Sem telemetria/crash reporting** (opt-in) — bugs de campo são difíceis de
  diagnosticar.
- i18n em 3 idiomas (Rayforge já tem 7; MeerK40t tem vários, incluindo pt).
- Validação em hardware limitada à máquina do autor (C1/COMGO Z1).

---

## 5. Melhorias recomendadas (por prioridade)

### Curto prazo — consolidar o diferencial (1 release)
1. **Medir e publicar** os orçamentos RNF-11/12 (startup ≤1,5 s, RAM ≤280 MB
   em X11 / 300 MB em Wayland, ≥55 fps, DPI 100/125/150/200 %) — números viram
   argumento de marketing.
2. **Corrigir o drift** de `FEATURES_COMPARISON.md` e demais docs (estado real
   **v0.8.0**) — reconciliado em 19/10/2026.
3. **Validar hardware** Windows/macOS (ou marcar como beta) e ligar **Flatpak**
   (scaffold pronto) → publicar no Flathub.
4. **Onboarding/tour** de primeira execução.

### Médio prazo — fechar as lacunas que mais doem (Rayforge/LightBurn têm)
5. ~~**Camadas / multi-operação** (gravar + cortar, parâmetros por camada).~~ ✅
   Entregue na 0.8.0 (P2.2).
6. ~~**Simulação de job** (reaproveita o preview e a estimativa de tempo).~~ ✅
   Entregue na 0.5.0 (P2.3/RF-PRV-7).
7. **Rotativa (eixo A)** e **câmera** (alinhamento visual).
8. **Importação AI/EPS/HPGL** — SVG, DXF e PDF já reusam o pipeline de
   contornos (P1.6/P2.4); falta AI/EPS/HPGL.
9. **Catálogo de máquinas** (Ortur/AtomStack/Sculpfun/xTool/Longer/TwoTrees) e
   import de **`.lbdev`/`.lbrn2`** — atalho de migração para quem vem do LightBurn.
10. **Editor de G-code** (syntax highlight, numeração, edição de linha).
11. **QR Code + código de barras** (diferencial no segmento gratuito).

### Longo prazo — ecossistema
12. **Plugins/addons** + **CLI/headless** (lote, automação, Raspberry Pi).
13. **Nesting** (aproveita booleanas/offset já existentes).
14. **Migração do renderer para TypeScript** (ADR-2).
15. **Preview WebGL** para arquivos gigantes; **telemetria opt-in**.
16. **Galvo/DSP** (Ruida/Trocen/EZCad) — avaliação técnica antes de comprometer;
    é outro mercado (fibras/marcadoras), não confundir com o nicho atual.

---

## 6. Novos recursos sugeridos (valor × esforço)

| Recurso | Valor | Esforço | Observação |
| :--- | :--- | :--- | :--- |
| Camadas / multi-operação | **Muito alto** | Médio | ✅ Entregue (P2.2/0.8.0). |
| Simulação de job | Alto | Médio | ✅ Entregue (P2.3/RF-PRV-7). |
| Catálogo de máquinas + import `.lbdev` | **Muito alto** | Baixo | Dados estáticos; facilita migração do LightBurn. |
| Importação AI/EPS/HPGL | Médio | Médio | SVG/DXF/PDF ✅ (P2.4); reusa parser/contornos. |
| QR Code / código de barras | Alto | Médio | Único no segmento `open source` (plano próprio). |
| Câmera + alinhamento | Alto | Alto | Rayforge/LightBurn já têm. |
| Rotativa (eixo A) | Alto | Alto | Cinemática + calibração. |
| Nesting | Médio | Alto | Booleanas/offset já existem. |
| Editor de G-code | Médio | Médio | UGS/gSender têm de graça. |
| CLI/headless | Médio | Médio | Abre automação e Raspberry Pi. |
| Addons/plugins | Alto | Alto | Rayforge/gSender já têm. |
| Telemetria opt-in | Médio | Médio | Sentry/GlitchTip. |

---

## 7. Comparação com o mercado (outubro/2026)

### 7.1 O mercado em quatro faixas

| Faixa | Perfil | Quem |
| :--- | :--- | :--- |
| **1. Pago generalista** | Design + controle no mesmo app, multiplataforma, licença perpétua | **LightBurn** (dominante), T2Laser, VectorEase |
| **2. Pago industrial / nichado** | Galvo, fibra, produção, DSP, pré-impressão | EZCAD, LaserCAD, CypCut, EngraveLab (Gravotech), PicEngrave/PicLaser, ACMER Studio (assinatura) |
| **3. Gratuito e aberto** | Controlador/CAM para GRBL e afins | **GRBL Studio**, LaserGRBL, **Rayforge**, MeerK40t, LaserWeb4, VisiCut, K40 Whisperer, UGS, gSender, Candle, CNCjs, OpenBuilds CONTROL, ioSender, bCNC, FluidNC WebUI |
| **4. Grátis preso ao hardware** | Software da marca (ótimo para a máquina, inútil fora dela) | xTool Studio (ex-XCS), LaserPecker Design Space, apps Ortur/Longer/AtomStack, Snapmaker Luban, Glowforge (Print grátis / Premium pago) |

### 7.2 Pagos

| Produto | Preço (10/2026) | Plataformas | Controladores | Destaques | Limite para nós |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LightBurn Core** | **US$ 99** (perpétuo, 1 ano de updates; renovação **US$ 40/ano**; 3 PCs; assento extra US$ 25) | Win/macOS/Linux | GRBL, FluidNC, grblHAL, custom GCode | Editor completo, camadas, câmera, rotativa, grade de material, editor de G-code, preview, `Bar Code` (QR/códigos, motor *zint*), import DXF/AI/PDF/3D | Código fechado; pago |
| **LightBurn Pro** | **US$ 199** (upgrade Core→Pro US$ 100; assento extra US$ 50) | idem | + Ruida, Trocen, TopWisdom, BSL, EZCad2/3, Epilog | Tudo do Core + DSP/galvo + **True Nest** (2.2, só Pro) | idem |
| **LightBurn 2.2** (early access, set–out/2026) | incluso | + macOS ARM | + xTool via rede, Gerber/PCB, LiDAR (Accelaser) | Center Line Trace, Multi Page, 3D import, **REST API** | features Pro-only |
| **T2Laser** | US$ 39,95–44,95 (1 PC) · dongle US$ 79,95 | Windows | GRBL | Raster + vetor, raster→vetor, multi-pass, foto | Windows-only, comunidade pequena |
| **PicEngrave Pro 6 / PicLaser** | US$ 40–85 | Windows | GRBL, Mach3, impressoras 3D | Imagem→G-code maduro, 11 ditherings, `Dot Pix`, rotativo | Estagnado (2016–2019), nicho |
| **EZCAD 2/3** | US$ 50–420 (frequentemente incluso no hardware) | Windows | **Galvo/fibra (JCZ)** | Padrão de fato em marcadoras a fibra | Dongle, Windows, sem design moderno |
| **LaserCAD (Lascam)** | sob consulta | Windows | DSP (Ruida etc.) | DXF→NC, relevo 3D, rotativo | Preço fechado, mercado DSP |
| **CypCut** | US$ 150–6.700 | Windows | Fibra/corte industrial | Nesting, produção | Muito acima do nosso público |
| **EngraveLab 11 Pro** (Gravotech) | sob consulta | Windows | Ambiente de gravação profissional | Produção, multi-máquina | Preço/orçamento, mercado pro |
| **VectorEase** | a partir de US$ 39 | n/d | **não controla** máquina (ponte) | Imagem→SVG em camadas | Não é controlador |
| **ACMER Studio** | **US$ 19,98/mês** (assinatura) | Win/macOS | hardware ACMER | Design + controle da marca | Assinatura + hardware preso |
| **Glowforge Premium** | **US$ 20/mês** (≈ US$ 240/ano) | web | Glowforge (design serve qualquer laser via export) | Biblioteca, AI, Smartfit, geradores | Assinatura; nuvem obrigatória |

**Leitura:** o LightBurn é o padrão pago e agora **perpetual com updates
anuais**; o resto é nichado (galvo, fibra, fotos) ou virou assinatura. Nenhum
concorrente pago cobre melhor o GRBL de bancada que o LightBurn — é nele que a
referência de recurso está.

### 7.3 Gratuitos e de código aberto

| Produto | Licença / preço | SO | Foco | Destaques | Falta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GRBL Studio** (v0.12.0) | MIT · grátis | Linux (validado), Win, macOS (builds) | GRBL 1.1 | Protocolo robusto, pipeline de imagem otimizado, design 2D com booleanas/offset/texto/**camadas**, grade de material, **SVG/DXF/PDF**, **QR/código de barras** (9 simbologias 1D + QR/Data Matrix/PDF417/Aztec), **simulação 2D**, **clique no preview para mover**, painel **Máquina + pré-voo**, **editor de G-code**, **biblioteca de jobs**, **lote/modo produção**, **presets de material + dose**, **teste de foco**, **nesting por caixa**, 11 temas, 3 idiomas, 879 testes, auto-update | Câmera, rotativa, **simulação 3D**, nesting irregular, AI/EPS/HPGL |
| **LaserGRBL** (v7.14.x) | GPLv3 · grátis | **Windows** (Wine no Linux) | GRBL 0.9/1.1 | Raster excelente (múltiplos ditherings), vetorização, botões customizados, WiFi ESP8266, overrides, comunidade grande | **Sem design**, camadas, câmera, rotativa, Z; sem macOS/Linux nativo; desenvolvimento lento |
| **Rayforge** (1.13 beta, out/2026) | MIT · grátis | Linux, macOS, Windows (GTK4) | GRBL, Marlin, Ruida, Smoothieware | **Sketcher paramétrico**, camadas, URLs/materiais (60+), câmera, **rotativa 4 eixos**, **simulação 3D**, array/pattern, import SVG/DXF/PDF/AI/EPS/HPGL/bitmaps/`.lbrn2`/`.rd`, WCS G54–G59, no-go zones, *addons*, CLI/headless, 7 idiomas | Sem **galvo** (EZCad); Ruida ainda experimental; sem QR/código de barras; UI GTK (estilo diferente do Fluent) |
| **MeerK40t** (0.9.9x) | MIT · grátis | Win/macOS/Linux (wxPython/Raspberry) | K40 (Lihuiyu), GRBL, Ruida, galvo EZCad2, fibra | Árvore de operações/camadas, câmera, rotativa, simulação, grade de material, Z jog, hatch/wobble, i18n (inclui pt) | **Em modo de manutenção** (baixa cadência); UI densa; sem QR/código de barras |
| **LaserWeb4 / CNCWeb** | AGPL · grátis | Navegador (+Raspberry/Docker) | GRBL, Smoothieware, Marlin, TinyG | CAM completo (SVG/DXF/bitmap→G-code), multi-operação, câmera, estimativa de tempo, Pi headless | **Praticamente parado** (4.0.996, 2018/2021); sem GRBL 1.1 moderno verificado |
| **VisiCut** | grátis | Win/macOS/Linux (Java) | LibLaserCut (Epilog, LAOS, K40, Smoothie, GRBL genérico) | Integração com Inkscape por cor de traço, presets de FabLab, nesting, câmera, calibração de kerf | UI datada; foco FabLab, não hobbyista GRBL |
| **K40 Whisperer** | GPL · grátis | Win/macOS/Linux (Python) | **K40/Lihuiyu** | Dispensa o dongle do LaserDRW, SVG/DXF, controle de potência (M3 Nano), Python 3.14 | Só K40: não é alternativa geral |
| **UGS (Universal Gcode Sender)** 2.1.24 (jul/2026) | grátis | Win/macOS/Linux/Raspberry (Java) | GRBL, FluidNC, TinyG, g2core, Smoothie | 3D visualizer, editor de G-code, **Designer com suporte a laser**, import SVG/DXF, overrides, gamepad | Interface genérica de CNC (não é laser-first) |
| **gSender** 1.6.2/1.7 Edge (set/2026) | GPLv3 · grátis | Win/macOS (incl. ARM)/Linux ARM | GRBL/grblHAL | 3D toolpath, sondagem, gravação de firmware, rotativa, **modo laser com visualização de intensidade**, plugins/SDK, muitos perfis | Foco CNC/roteador; design só no 1.7 |
| **Candle / OpenBuilds CONTROL / CNCjs / ioSender / bCNC / FluidNC WebUI** | grátis | vários (Java/Node/Python/browser) | GRBL/grblHAL/FluidNC | Envio simples (Candle), sondagem/auto-level (bCNC), grblHAL completo (ioSender), UI no navegador servida pela placa (FluidNC WebUI) | Não são laser-first; sem design/CAM |
| **Inkscape + extensão a laser** (ex.: J Tech Laser Tool) | grátis | Win/macOS/Linux | gera G-code | Design vetorial profissional | 3 passos (design → gerar → enviar); sem controle de máquina |

### 7.4 Grátis, mas preso ao hardware

| Produto | Preço | SO | Observação |
| :--- | :--- | :--- | :--- |
| **xTool Studio** (V1.9, set/2026; sucede o XCS, encerrado na v2.7/jun-2025) | grátis | Win/macOS (**sem Linux**) | Camadas (até 16), *Smart Nesting*, **geração de QR/código de barras em lote**, dados variáveis por planilha, câmera, rotativa, prévia 3D, AI, biblioteca/templates, gestão multi-máquina, Local Space. Só máquinas xTool. |
| **LaserPecker Design Space 3.0 Beta** | grátis | Win/macOS | **Geração de código de barras**, matrizes, *material test arrays*, edição de imagem. Só LaserPecker. |
| **Apps de marca** (Ortur Laser Explorer, AtomStack, Longer, TwoTrees, Snapmaker Luban) | grátis | Win/macOS | Fluxo guiado para a máquina da marca; limites de design/exportação. |
| **Glowforge** (Print grátis p/ donos / Premium US$ 20/mês) | freemium | web | Só nuvem; há **relatos de limite de 100 KB por arquivo** no tier grátis do Aura. |

### 7.5 Tabela única — cada programa em uma coluna

Legenda: ✅ tem · 🟡 parcial/limitado · ❌ não tem · *n/d* não publicado.
*LDS* = LaserPecker Design Space. Preços e datas: §8.

| Critério | **GRBL Studio** | **LightBurn** | **Rayforge** | **LaserGRBL** | **MeerK40t** | **LaserWeb4** | **VisiCut** | **K40 Whisperer** | **UGS** | **gSender** | **xTool Studio** | **LaserPecker LDS** | **T2Laser** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Preço** | Grátis | US$ 99 / 199 (+ US$ 40/ano updates) | Grátis | Grátis | Grátis | Grátis | Grátis | Grátis | Grátis | Grátis | Grátis (só xTool) | Grátis (só LaserPecker) | US$ 39,95–79,95 |
| **Licença** | MIT | Fechado | MIT | GPLv3 | MIT | AGPL | Aberto | GPL | Aberto | GPLv3 | Fechado | Fechado | Fechado |
| **Sistemas** | Linux + Win + macOS (builds CI) | os 3 | os 3 (GTK4) | **Só Windows** | os 3 (wxPython) | Navegador / Raspberry | os 3 (Java) | os 3 (Python) | os 3 (Java) + Pi | os 3 (incl. ARM) | Win + macOS | Win + macOS | Só Windows |
| **Controladores** | GRBL 1.1 | GRBL + DSP + galvo + custom | GRBL, Marlin, Ruida, Smoothieware | GRBL 0.9/1.1 | K40, GRBL, Ruida, galvo EZCad2, fibra | GRBL, Smoothie, Marlin, TinyG | LibLaserCut (Epilog, LAOS, K40, GRBL) | K40 / Lihuiyu | GRBL, FluidNC, TinyG, g2core | GRBL / grblHAL | xTool (protocolo próprio) | LaserPecker | GRBL |
| **Envia p/ a máquina** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Design 2D / CAD** | ✅ (médio) | ✅ (completo) | ✅ (**paramétrico**) | ❌ | 🟡 (SVG) | ❌ (CAM) | ❌ (foco Inkscape) | ❌ | 🟡 (Designer) | 🟡 (só no 1.7 Edge) | ✅ | ✅ | 🟡 (básico) |
| **Import vetorial** | 🟡 SVG/DXF/PDF | ✅ SVG/DXF/AI/PDF/3D | ✅ SVG/DXF/PDF/AI/EPS/HPGL/`.lbrn2`/`.rd` | 🟡 SVG (experimental) | 🟡 SVG/DXF | ✅ SVG/DXF/bitmap | ✅ SVG/EPS/DXF | 🟡 SVG/DXF | ✅ SVG/DXF | 🟡 (recebe G-code) | 🟡 SVG/DXF | 🟡 SVG/DXF | 🟡 imagem/vetor |
| **Camadas / multi-operação** | ✅ (0.8.0/P2.2) | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ (por cor) | 🟡 | 🟡 | ❌ | ✅ (16 camadas) | 🟡 | ❌ |
| **Nesting / matriz de cópias** | 🟡 matriz + nesting por caixa (sem encaixe irregular) | ✅ Quick (2.1) + True (2.2, **Pro**) | 🟡 array/pattern | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ Smart Nesting | 🟡 matrizes | ❌ |
| **Câmera / alinhamento** | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Rotativa (eixo A)** | ❌ | ✅ | ✅ (4 eixos) | ❌ | ✅ | 🟡 experimental | ❌ | ❌ | 🟡 | ✅ | ✅ | ✅ | ❌ |
| **Simulação de job** | ✅ (2D + tempo) | ✅ | ✅ **3D** | 🟡 (preview/tempo) | ✅ | 🟡 (tempo) | 🟡 | 🟡 | ✅ 3D backplot | ✅ 3D | ✅ 3D | ✅ | 🟡 |
| **Grade de teste de material** | ✅ | ✅ | ✅ | ❌ | ✅ | 🟡 (presets) | ✅ (presets FabLab) | ❌ | ❌ | ❌ | ✅ | ✅ (test arrays) | ❌ |
| **QR Code / código de barras** | ✅ (9 1D + QR + Data Matrix + PDF417 + grade; falta Aztec) | ✅ Bar Code (*zint*, 50+) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ + lote/dados variáveis | ✅ (barcode) | ❌ |
| **Editor de G-code** | ❌ | ✅ | ✅ | ❌ | 🟡 | ❌ | ❌ | ❌ | ✅ | ✅ (1.6) | ❌ | ❌ | ❌ |
| **Catálogo de máquinas / materiais** | 🟡 22 perfis + Genérico GRBL | ✅ dezenas + `.lbdev` | ✅ 60+ materiais + perfis | ✅ dezenas (COM) | ✅ vários | 🟡 básico | ✅ presets FabLab | ❌ | ✅ vários | ✅ vários | ✅ (só xTool) | ✅ (só LP) | 🟡 |
| **Plugins / CLI / API** | ❌ | ✅ REST API | ✅ addons + CLI | ❌ | 🟡 console/CLI | 🟡 | 🟡 | ❌ | ✅ web pendant/plugins | ✅ SDK de plugins | ❌ | ❌ | ❌ |
| **Galvo / DSP / fibra** | ❌ | ✅ (Pro) | 🟡 Ruida (exp.) | ❌ | ✅ (EZCad2) | ❌ | 🟡 Epilog | ❌ | ❌ | ❌ | ✅ (modelos de fibra) | 🟡 (modelos IR) | ❌ |
| **i18n (idiomas)** | 3 (pt/en/es) | Vários | 7 (inclui pt) | Vários | Vários (inclui pt) | Inglês | Vários | Inglês | Vários | Vários | Vários | Vários | Inglês |
| **Preview com intensidade `S`** | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | 🟡 | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 |
| **Robustez de protocolo testada** | ✅ **731 testes + E2E** | *n/d* | *n/d* | ❌ | *n/d* | ❌ | *n/d* | *n/d* | *n/d* | *n/d* | *n/d* | *n/d* | *n/d* |
| **Nuvem / AI / biblioteca de arte** | ❌ | ❌ (local) | 🟡 AI opcional | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Status de desenvolvimento** | Ativo | **Muito ativo** | **Muito ativo** | Lento (Windows-only) | **Manutenção** | **Parado** (2018–21) | Baixa atividade | Ativo (pequeno) | Ativo | **Muito ativo** | **Muito ativo** | Ativo | Baixa atividade |

> Fora da tabela (nicho/CNC): **Candle**, **CNCjs**, **OpenBuilds CONTROL**, **ioSender**,
> **bCNC**, **FluidNC WebUI** (sendores genéricos, sem design/CAM de laser);
> **EZCAD** (galvo), **RDWorks** (grátis com Ruida), **LaserCAD/CypCut**
> (industrial), **EngraveLab** (Gravotech), **VectorEase** (imagem→SVG),
> **ACMER Studio** (assinatura), **Glowforge** (nuvem; Print grátis / Premium
> US$ 20/mês), **Inkscape + extensão a laser**.

### 7.6 Matriz de recursos — os rivais diretos

| Recurso | **GRBL Studio** | LightBurn 2.x | Rayforge 1.13 | LaserGRBL 7.14 | MeerK40t 0.9.9 | xTool Studio 1.9 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Preço / licença | **Grátis, MIT** | US$ 99/199 | **Grátis, MIT** | Grátis, GPLv3 | Grátis, MIT | Grátis (só xTool) |
| Linux nativo | ✅ | ✅ | ✅ | ❌ (Wine) | ✅ | ❌ |
| Windows / macOS | ✅ (builds) | ✅ | ✅ | ❌ / ❌ | ✅ | ✅ |
| GRBL 1.1 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (protocolo próprio) |
| DSP / galvo (Ruida, EZCad) | ❌ | ✅ (Pro) | Ruida ✅ | ❌ | ✅ | ❌ |
| Design 2D / CAD | ✅ (básico-médio) | ✅ (completo) | ✅ (**paramétrico**) | ❌ | ✅ (SVG) | ✅ (canvas) |
| Booleanas / offset | ✅ | ✅ | ✅ | ❌ | parcial | parcial |
| Camadas / multi-operação | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Nesting | 🟡 por caixa (sem encaixe irregular) | ✅ (2.1/2.2 Pro) | padrões | ❌ | ❌ | ✅ (Smart Nesting) |
| Import SVG / DXF / PDF / AI | SVG/DXF/PDF | SVG/DXF/PDF/AI/3D | **SVG/DXF/PDF/AI/EPS/HPGL/.lbrn2** | SVG (experimental) | SVG/DXF | SVG/DXF (e G-code) |
| Câmera / alinhamento | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Rotativa (eixo A) | ❌ | ✅ | ✅ (4 eixos) | ❌ | ✅ | ✅ |
| Simulação de job | ✅ (2D + tempo) | ✅ | ✅ (**3D**) | parcial | ✅ | ✅ (3D) |
| Grade de teste de material | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **QR / código de barras** | ✅ (9 1D + QR + Data Matrix) | ✅ (Bar Code) | ❌ | ❌ | ❌ | ✅ (lote) |
| Editor de G-code | ❌ | ✅ | ✅ | ❌ | parcial | ❌ |
| Perfis de máquina / materiais | 22 perfis + Genérico / catálogo | **dezenas** + `.lbdev` | 60+ materiais + perfis | dezenas (COM) | vários | muitos (só xTool) |
| Plugins / addons / CLI | ❌ | REST API | ✅ addons + CLI | ❌ | CLI | ❌ |
| i18n | 3 idiomas | vários | 7 idiomas | vários | vários (incl. pt) | vários |
| Temas / aparência | **11 temas Fluent** | ✅ | ✅ (GTK) | básico | básico | ✅ |
| Robustez de protocolo testada | ✅ (731 testes + E2E) | n/d | n/d | ❌ | n/d | n/d |
| Preview com intensidade `S` | ✅ | ✅ | ✅ | parcial | ✅ | ✅ |
| Nuvem / AI / biblioteca | ❌ | ❌ (local) | AI opcional | ❌ | ❌ | ✅ |

> ✅ tem · ❌ não tem · *n/d* = não publicado. Colunas comparam **capacidade**,
> não qualidade de implementação: em várias linhas o GRBL Studio é mais raso que
> o LightBurn/Rayforge.

### 7.7 Onde o GRBL Studio ganha

1. **Aberto + leve + multiplataforma** — MIT, sem assinatura, sem nuvem, sem
   limite de arquivo, rodando nativo em 3 SOs (Rayforge é o único par nisso).
2. **Robustez de protocolo** — janela por bytes, comandos de tempo real corretos,
   WCO/DTG, alarmes com ação recomendada e **731 testes**. Nenhum rival publica
   esse nível de verificação; LaserGRBL e MeerK40t são notoriamente frágeis em
   bordas de protocolo.
3. **Pipeline de imagem otimizado** — velocidade adaptativa, zigue-zague, fusão
   de trechos, pulo de linhas brancas: mais velocidade real por material queimado.
4. **UX/aparência** — 11 temas Fluent/Windows 11, pt-BR/en/es com paridade
   automática, Assistente para leigos, job bar com emergência.
5. **Design + ferramentas integrados** — booleanas, contorno paralelo, matriz,
   **camadas/multi-operação**, texto em 3 modos e **grade de teste de material**
   dentro do controlador.
6. **QR/código de barras (entregues)** — presente no LightBurn e nos softwares
   de marca; **ausente em todos os gratuitos/abertos** (QR + 9 simbologias 1D +
   Data Matrix no GRBL Studio).
7. **Entrega** — CI/CD com releases assinadas por tag e **auto-update**.

### 7.8 Onde o GRBL Studio perde

1. **Câmera e rotativa** — presentes em LightBurn, Rayforge, MeerK40t, LaserWeb4,
   xTool.
2. **Simulação 3D** — Rayforge e LightBurn mostram o resultado antes de gravar;
   o GRBL Studio tem o playback **2D** com tempo.
3. **Importação vetorial** — SVG/DXF/PDF; Rayforge engole também AI/EPS/HPGL
   e até arquivos do LightBurn.
4. **Catálogo de máquinas** — 22 perfis + Genérico contra dezenas, sem import
   `.lbdev`; atrito para quem tem Ortur/AtomStack/Sculpfun/xTool.
5. **Automação** (REST API, CLI, addons) e **nesting irregular** — o encaixe
   por caixa já está entregue.
7. **Ecossistema** — sem plugins, sem marketplace/AI, sem biblioteca de artes.
8. **Maturidade fora do Linux** — builds Win/macOS existem, mas não há validação
   publicada em hardware; sem assinatura de código.
9. **Galvo/DSP** — irrelevante para diodo GRBL, mas deixa de fora marcadoras a
   fibra e CO² com Ruida.

### 7.9 Ameaças e oportunidades

| Fator | Efeito |
| :--- | :--- |
| **Rayforge** (MIT, ativo, multiplataforma e muito completo) | **Maior ameaça ao posicionamento.** É o "aberto e moderno" que era exclusividade nossa; para se diferenciar, aposta em robustez de protocolo, leveza, aparência Fluent e ferramentas de fabricação (QR/barcode). |
| **MeerK40t em modo de manutenção** | Oportunidade: usuários buscam alternativa viva; ganho ao importar perfis/formatos e cobrir K40/GRBL. |
| **LaserGRBL estagnado (Windows-only)** | Base de usuários enorme e sem caminho Linux/macOS; continua sendo o alvo mais conversível — **importar `.lbrn2`/perfis e ter material test** ajuda. |
| **LightBurn subiu o preço de updates (US$ 30 → 40) e criou recurso Pro-only (True Nest)** | Feedback público de insatisfação; argumento para "grátis e sem travas" — sem prometer paridade total com o Pro. |
| **xTool Studio / LaserPecker oferecem QR, código de barras e dados variáveis em lote de graça** | Mostra que essas ferramentas são esperadas no público de personalização; reforça a prioridade de fechar o S3 (Aztec, símbolo como objeto) do `PLANO_QR_BARCODE.md` — a grade/lote e o PDF417 já saíram. |
| **Marcas prendem o software à máquina** | Vantagem estrutural do software aberto: qualquer GRBL, de qualquer marca. |

### 7.10 Posicionamento estratégico recomendado

**Nicho:** *"o controlador laser grátis, leve e confiável — para qualquer máquina
GRBL, em qualquer sistema"*, com três pilares que **nenhum rival cobre junto**:

1. **Confiabilidade** (protocolo testado, sem travar máquina, emergência sempre
   acessível) — provado por números publicados (RNF-11/12 medidos).
2. **Fabricação integrada de peças** (design 2D + grade de material + **QR/código
   de barras** + offset/booleanas) — o fluxo "abrir → gerar → gravar em 3 cliques".
3. **Aberto e sem amarras** (MIT, multiplataforma, sem conta, sem nuvem, sem
   limite de arquivo, sem plano Pro).

Prioridade de execução para defender o espaço contra o Rayforge:
**catálogo de máquinas + import LightBurn → AI/EPS → rotativa → câmera**, com
**QR/código de barras (S1/S2 entregues, S3 restante)** e **camadas (entregues na
0.8.0)** já no bolso por serem diferenciais baratos.

---

## 8. Fontes e datas

| Fonte | Consulta | Uso |
| :--- | :--- | :--- |
| LightBurn — *Which version / License works / License Renewal Pricing Update* | abr–set/2026 | Core US$ 99, Pro US$ 199, update US$ 40/ano, upgrade US$ 100, assentos, licença perpétua. |
| LightBurn — *What's New in 2.2* / fórum RC-8 | set–out/2026 | True Nest (Pro-only), Center Line Trace, Multi Page, 3D import, REST API, ARM macOS. |
| LightBurn — *Create Bar Code* (docs 1.7/2.1) | 2026 | Ferramenta de código de barras/QR (motor **zint**, 50+ simbologias). |
| GitHub `arkypita/LaserGRBL` (releases) + laseresgrbl.com | out/2026 | v7.14.x, Windows-only, recursos e ausências. |
| GitHub `meerk40t/meerk40t` (README/releases) + PyPI | ago/2026 | 0.9.9x, **modo de manutenção**, dispositivos suportados. |
| GitHub `barebaric/rayforge` + rayforge.org + PyPI | out/2026 | 1.13 beta, MIT, recursos, GTK4, 7 idiomas, imports. |
| GitHub `LaserWeb/LaserWeb4` + laserweb.yurl.ch + guia Pi Stack (jun/2026) | 2026 | CAM no navegador, última release 4.0.996, comparação LaserGRBL/VisiCut. |
| visicut.org · scorchworks.com/K40whisperer | 2026 | VisiCut (LibLaserCut, Inkscape) e K40 Whisperer (GPL, K40). |
| UGS (universalgcodesender.com, releases 2.1.24) · Sienci gSender (releases 1.6.2/1.7 Edge, add-ons) · wiki PiBot (tabela de senders, 2026) | jul–set/2026 | Sendores genéricos e recursos laser/CNC. |
| xTool Support (transição XCS→Studio, release notes V1.9/V1.5) · LaserPecker (LDS PC 3.0 Beta) · Glowforge Premium | fev–set/2026 | Software grátis preso ao hardware; QR/barcode em lote; assinaturas. |
| T2Laser (loja) · picengrave.com · Guideflow (jul/2026) · statpit/worldmetrics (2026) | 2026 | Preços de T2Laser (US$ 39,95–79,95), PicEngrave (US$ 40–85), EZCAD (US$ 50–420), CypCut, LaserCAD, EngraveLab, VectorEase, ACMER Studio. |
| Repositório GRBL Studio (`package.json`, `electron-builder.yml`, `.github/workflows/release.yml`, `src/`, `public/`, `tests/`) | 19/10/2026 | Estado real v0.8.0 (features, 731 testes, builds 3 SOs, auto-update). |

---

## 9. Conclusão

O GRBL Studio **já supera o LaserGRBL em praticamente tudo** (protocolo, preview,
design, ferramentas, i18n/temas, testes, multiplataforma) e cobre parte do
LightBurn no fluxo "enviar e gravar" — mas ainda **não é um concorrente de design
completo**. Em 2026, o adversário que importa no campo gratuito é o **Rayforge**:
também MIT, também multiplataforma, com camadas, câmera, rotativa, simulação 3D e
importação ampla. Contra ele, o GRBL Studio deve jogar nas suas forças —
**confiabilidade medida, leveza, aparência, ferramentas de fabricação (camadas,
QR/código de barras)** e **zero amarras** — e fechar rápido as lacunas que travam
produção: **catálogo de máquinas/import LightBurn e AI/EPS** (SVG/DXF/PDF já entregues).

---

*Atualizado em 18/10/2026 (v0.5.1) e **reconciliado em 19/10/2026 (v0.8.0)**
com base no código, na documentação do repositório e em pesquisa pública do
mercado — fontes e datas em §8.*
