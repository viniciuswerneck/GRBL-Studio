# Comparação: LaserGRBL vs GRBL Studio

> Atualizado em 20/10/2026 (**v0.18.0**). Status reflete o código atual em `main`.
> Para o confronto com **todo o mercado** (pagos e gratuitos — LightBurn,
> Rayforge, MeerK40t, UGS, xTool, etc.), ver `ANALISE_COMPETITIVA.md` §7.

## Core
| Feature | LaserGRBL (C#) | GRBL Studio (Electron) | Status |
|---|---|---|---|
| Conexão Serial | Sim | Sim | ✅ |
| Envio G-Code (janela por bytes) | Sim | Sim | ✅ |
| JOG (X/Y/Z, contínuo ao segurar) | Sim (X/Y; Z limitado) | Sim (X/Y/Z) | ✅ |
| Console (com respostas da máquina) | Sim | Sim (pausar/limpar/exportar) | ✅ |
| Status GRBL (pos/feed) | Sim | Sim (MPos/WPos, DTG, overrides) | ✅ |
| Override Feed/Spindle/Rapid | Sim | Sim (feed/spindle/rapid) | ✅ |
| Homing | Sim | Sim | ✅ |
| Pausar / Retomar / Parar | Sim | Sim (job bar flutuante) | ✅ |
| Biblioteca de jobs (miniatura, reexecutar, duplicar) | Não (só arquivos recentes) | Sim (últimos 50, com miniatura e retomada do programa guardado) | ✅ |
| WiFi (ESP8266/ESP32) | Sim | Sim (TCP) | ✅ (não validado em HW) |
| Macros / botões customizados | Sim | Sim | ✅ |
| Configurações `$$` (viewer/editor) | Sim | Sim (grupos + perfis) | ✅ |
| Importar/exportar config | Sim | Sim (perfis) | ✅ |
| Decodificação de alarmes | Sim | Sim (com ação recomendada) | ✅ |
| Flash de firmware | Sim | Não | ⬜ |

## Design e ferramentas
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| Editor vetorial (formas, caneta, nós) | Não | Sim (retângulo, elipse, linha, caneta, nós) | ✅ |
| Texto no app | Não | Sim (vetor, traço único, preenchido) | ✅ |
| Texto em curva/arco | Não | Sim (raio escolhido, sem esticar as letras; raio guardado no bloco) | ✅ |
| Gabarito / molde para repetir a peça | Não | Sim (contorno externo + folga, marcas L opcionais no mesmo grupo) | ✅ |
| Biblioteca de formas prontas | Parcial (símbolos/ícones) | Sim (14 formas offline, clique ou arrastar, tamanho em mm, um grupo) | ✅ |
| Tira de teste de código (menor tamanho legível) | Não | Sim (mesmo símbolo em até 10 tamanhos, legenda embaixo, um bloco) | ✅ |
| Catálogo de materiais com aviso de segurança | Parcial (tabela do manual) | Sim (26 fichas, recomendação por módulo/ação, PVC/ABS/vinil em **Perigo** e bloqueados) | ✅ |
| Fila de trabalhos (agenda persistida) | Não | Sim (enfileirar/reordenar, grava em sequência, pré-voo uma vez, Stop e emergência à mão) | ✅ |
| Booleanas / contorno paralelo (offset) | Não | Sim | ✅ |
| Matriz de cópias / espelhar / distribuir / agrupar / snap | Não | Sim | ✅ |
| Potência/velocidade/espessura **por objeto** | Não | Sim (+ copiar/colar estilo) | ✅ |
| Camadas / multi-operação (gravar + cortar) | Não | Sim (parâmetros por camada + ordem de execução) | ✅ |
| Nesting (encaixe na chapa) | Não | Sim (MaxRects: margem, espaçamento e rotação 90°) | ✅ |
| Salvar/abrir o desenho (`.gstudio`) | Não | Sim (documento versionado, Ctrl+S/Ctrl+O) | ✅ |
| Kerf / folga de corte por camada | Sim (compensação de kerf) | Sim (externos +kerf/2, furos −kerf/2, ilhas e furo omitido) | ✅ |
| Abas de retenção e sobre-corte (lead) | Parcial (abas manuais no G-code) | Sim (N abas por camada + sobre-corte na emenda) | ✅ |
| Custo por peça | Não | Sim (tempo × tarifa/h + material × preço/m², R$/US$/€) | ✅ |
| Tiling (peça maior que a mesa) | Sim (manual, por camadas) | Sim (janelas com sobreposição, um arquivo por tile) | ✅ |
| Marcas de registro (fiduciais) | Parcial (marcas manuais) | Sim (L/cruzes em volta da arte, na camada ativa) | ✅ |

## Preview
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| Preview 2D | Sim | Sim (canvas, zoom/pan) | ✅ |
| OpenGL Preview | Sim | Não | ⬜ |
| Visualização tempo real | Sim | Sim (crosshair + trecho por passada) | ✅ |
| Cores por passada / intensidade (S) | Parcial | Sim | ✅ |
| Simulação de job (playback + tempo) | Não | Sim (P2.3/RF-PRV-7: play/pause/seek, 1×–10×, tempo estimado) | ✅ |
| Mover a cabeça clicando no preview | Não | Sim (P2.14/RF-PRV-8: `G90 G0` com confirmação, limitado à área de trabalho) | ✅ |

## Importação
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| G-Code (.gcode/.nc) | Sim | Sim | ✅ |
| Imagem (JPG/BMP/PNG/…) | Sim | Sim (PNG/JPEG/BMP/GIF/WebP/AVIF) | ✅ |
| SVG | Experimental | Sim (importação → contorno) | ✅ |
| DXF | Experimental | Sim (ASCII: geometria, blocos/`INSERT`, camadas e `$INSUNITS` → contorno) | ✅ |
| PDF | Não | Sim (vetorial: object streams, `cm`, Form XObjects e rotação; 1ª página; texto/imagens ignorados) | ✅ |
| Rasterização (Line-to-line/Dithering) | Sim | Sim (line-to-line + Floyd–Steinberg) | ✅ |
| Vetorização | Sim | Sim (contorno/RDP) | ✅ |
| Centerline (imagem → linha única) | Sim | Sim (esqueleto Zhang–Suen + poda/RDP) | ✅ |
| Perfis de material | Sim | Sim (COMGO Z1: 3W/5W/10W) | ✅ |
| Grade de teste de material | Não | Sim | ✅ (superior) |
| Teste de foco (spot) | Não | Sim (escada de Z com 2 potências) | ✅ |

## Ferramentas de geração (RF-SYM-*)
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| Gerador de **QR Code** (ECC L/M/Q/H, dimensões em mm, quiet zone) | Não | Sim (ISO/IEC 18004 próprio, v0.6.0) | ✅ |
| Gerador de **código de barras** (Code 128, EAN-13/8, UPC-A, Code 39) | Não | Sim (v0.6.0) | ✅ |
| Simbologias 1D extras (ITF-14, Codabar, Code 93 Full ASCII, GS1-128) | Não | Sim (v0.7.0) | ✅ |
| Texto legível sob o código (HRI) | Não | Sim (fonte de traço único) | ✅ |
| Simbologias 2D (Data Matrix, PDF417, Aztec) | Não | Data Matrix ECC200 (v0.7.0), PDF417 (v0.8.0) e Aztec (v0.10.0) | ✅ |
| Vários símbolos em grade (RF-SYM-9) | Não | Sim (lista → grade, com espaçamento) | ✅ |
| Símbolo como **objeto do editor** (S3) | Não | Sim (QR/2D/1D como bloco de linhas: mover, escalar, girar, camada/potência e reeditar por duplo clique) | ✅ |
| **Lote / dados variáveis** (RF-SYM-10) | Não | Sim (CSV/TSV → fila de gravação, pausa para trocar a peça, contador e retomada) | ✅ |
| **Modo produção** (RF-GC-12) | Não (só reexecutar manualmente) | Sim (repetir o job N vezes, contador, pausa entre cópias e trava de UI) | ✅ |
| **Teste de foco** (RF-IMG-13) | Não | Sim (escada de Z relativa com 2 potências por passo, prévia da faixa) | ✅ |
| **Presets de material do usuário** (RF-IMG-14) | Sim (biblioteca de materiais) | Sim (salvar/aplicar/excluir, **dose J/mm**, **Ajustar à máquina** e **JSON** para compartilhar) | ✅ |

> Comparação: o **LightBurn** tem `Tools → Create Bar Code` (motor **zint**,
> ~50 simbologias); o **LaserGRBL** não tem nenhuma ferramenta de geração.
> Plano do GRBL Studio: [`PLANO_QR_BARCODE.md`](PLANO_QR_BARCODE.md).

## Configuração / UX
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| Interface Windows | Sim | Inspirada/Moderna (Fluent) | Parcial |
| Linux nativo | Via Wine | Nativo (AppImage/deb) | ✅ |
| macOS | Não | **Empacotado** (.dmg/.zip, CI; não validado em HW) | 🟡 |
| Windows | Sim | **Empacotado** (.exe/.msi/.zip, CI; não validado em HW) | 🟡 |
| Dark/Light theme | Múltiplos | 11 temas | ✅ |
| i18n | Não | pt-BR/en/es (1 587 chaves, paridade por type-check) | ✅ |
| Assistente para leigos | Não | Sim (wizard) | ✅ |
| Log de sessão persistente | Não | Sim (exportável) | ✅ |
| Auto-update | Não | Sim (`electron-updater`) | ✅ |

## Prioridades para o próximo ciclo
1. Validar os builds **Windows/macOS** em hardware real e publicar **Flatpak** (P1.3).
2. **Abas de retenção** e **entrada/saída do corte** (Anexo B do `ROADMAP.md`).
3. **Câmera + rotativa** (P3.1/P3.2).
4. **Preview WebGL** (P3.4) e **nesting irregular** (P3.7).
5. Testes em **hardware real** (Fase 8) — kerf e nesting já têm E2E, falta a máquina.
