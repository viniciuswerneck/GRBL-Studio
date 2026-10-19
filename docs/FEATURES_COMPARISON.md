# Comparação: LaserGRBL vs GRBL Studio

> Atualizado em 19/10/2026 (**v0.8.0**). Status reflete o código atual em `main`.
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
| Booleanas / contorno paralelo (offset) | Não | Sim | ✅ |
| Matriz de cópias / espelhar / distribuir / agrupar / snap | Não | Sim | ✅ |
| Potência/velocidade/espessura **por objeto** | Não | Sim (+ copiar/colar estilo) | ✅ |
| Camadas / multi-operação (gravar + cortar) | Não | Sim (parâmetros por camada + ordem de execução) | ✅ |
| Nesting | Não | Não | ⬜ |

## Preview
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| Preview 2D | Sim | Sim (canvas, zoom/pan) | ✅ |
| OpenGL Preview | Sim | Não | ⬜ |
| Visualização tempo real | Sim | Sim (crosshair + trecho por passada) | ✅ |
| Cores por passada / intensidade (S) | Parcial | Sim | ✅ |
| Simulação de job (playback + tempo) | Não | Sim (P2.3/RF-PRV-7: play/pause/seek, 1×–10×, tempo estimado) | ✅ |

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
| Perfis de material | Sim | Sim (COMGO Z1: 3W/5W/10W) | ✅ |
| Grade de teste de material | Não | Sim | ✅ (superior) |

## Ferramentas de geração (RF-SYM-*)
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| Gerador de **QR Code** (ECC L/M/Q/H, dimensões em mm, quiet zone) | Não | Sim (ISO/IEC 18004 próprio, v0.6.0) | ✅ |
| Gerador de **código de barras** (Code 128, EAN-13/8, UPC-A, Code 39) | Não | Sim (v0.6.0) | ✅ |
| Simbologias 1D extras (ITF-14, Codabar, Code 93 Full ASCII, GS1-128) | Não | Sim (v0.7.0) | ✅ |
| Texto legível sob o código (HRI) | Não | Sim (fonte de traço único) | ✅ |
| Simbologias 2D (Data Matrix, PDF417, Aztec) | Não | Data Matrix ECC200 (v0.7.0); faltam PDF417/Aztec | 🟡 |
| Vários símbolos em grade (RF-SYM-9) | Não | Sim (lista → grade, com espaçamento) | ✅ |

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
| i18n | Não | pt-BR/en/es (1042 chaves, paridade por type-check) | ✅ |
| Assistente para leigos | Não | Sim (wizard) | ✅ |
| Log de sessão persistente | Não | Sim (exportável) | ✅ |
| Auto-update | Não | Sim (`electron-updater`) | ✅ |

## Prioridades para o próximo ciclo
1. Validar os builds **Windows/macOS** em hardware real e publicar **Flatpak** (P1.3).
2. **Catálogo de máquinas** (P2.5) + import de perfis `.lbdev` do LightBurn
   (importação SVG/DXF/PDF, P1.6/P2.4, já existe).
3. **Lote / dados variáveis** (P2.10) e **modo produção** (P2.11) — diferencial no grátis.
4. **Câmera + rotativa** (P3.1/P3.2).
5. **Simbologias restantes** (PDF417/Aztec).
