# Comparação: LaserGRBL vs GRBL Studio

> Atualizado em 17/10/2026 (v0.4.0). Status reflete o código atual em `main`.

## Core
| Feature | LaserGRBL (C#) | GRBL Studio (Electron) | Status |
|---|---|---|---|
| Conexão Serial | Sim | Sim | ✅ |
| Envio G-Code (janela por bytes) | Sim | Sim | ✅ |
| JOG (X/Y, contínuo ao segurar) | Sim | Sim (X/Y; Z em andamento) | 🟡 |
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

## Preview
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| Preview 2D | Sim | Sim (canvas, zoom/pan) | ✅ |
| OpenGL Preview | Sim | Não | ⬜ |
| Visualização tempo real | Sim | Sim (crosshair + trecho por passada) | ✅ |
| Cores por passada / intensidade (S) | Parcial | Sim | ✅ |

## Importação
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| G-Code (.gcode/.nc) | Sim | Sim | ✅ |
| Imagem (JPG/BMP/PNG/…) | Sim | Sim (PNG/JPEG/BMP/GIF/WebP/AVIF) | ✅ |
| SVG | Experimental | Sim (importação → contorno) | ✅ |
| Rasterização (Line-to-line/Dithering) | Sim | Sim (line-to-line + Floyd–Steinberg) | ✅ |
| Vetorização | Sim | Sim (contorno/RDP) | ✅ |
| Perfis de material | Sim | Sim (COMGO Z1: 3W/5W/10W) | ✅ |
| Grade de teste de material | Não | Sim | ✅ (superior) |

## Ferramentas de geração (RF-SYM-*)
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| Gerador de **QR Code** (ECC L/M/Q/H, dimensões em mm, quiet zone) | Não | Planejado (fase S1) | ⬜ |
| Gerador de **código de barras** (Code 128, EAN-13/8, UPC-A, Code 39) | Não | Planejado (fase S2) | ⬜ |
| Texto legível sob o código (HRI) | Não | Planejado (fase S2) | ⬜ |
| Simbologias 2D (Data Matrix, PDF417, Aztec) | Não | Planejado (fase S3) | ⬜ |

> Comparação: o **LightBurn** tem `Tools → Create Bar Code` (motor **zint**,
> ~50 simbologias); o **LaserGRBL** não tem nenhuma ferramenta de geração.
> Plano do GRBL Studio: [`PLANO_QR_BARCODE.md`](PLANO_QR_BARCODE.md).

## Configuração / UX
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| Interface Windows | Sim | Inspirada/Moderna (Fluent) | Parcial |
| Linux nativo | Via Wine | Nativo | ✅ |
| macOS | Não | Não (planejado) | ⬜ |
| Windows | Sim | Não (planejado) | ⬜ |
| Dark/Light theme | Múltiplos | 11 temas | ✅ |
| i18n | Não | pt-BR/en/es (484 chaves) | ✅ |
| Assistente para leigos | Não | Sim (wizard) | ✅ |
| Log de sessão persistente | Não | Sim (exportável) | ✅ |
| Auto-update | Não | Não (planejado) | ⬜ |

## Prioridades para o próximo ciclo
1. Builds Windows/macOS (P1.1).
2. Auto-update (P1.2).
3. Simulação de job (P2.3).
4. Ferramentas de desenho + camadas (P2.1/P2.2).
5. Câmera + rotativa (P3.1/P3.2).
6. Geradores de QR Code e código de barras (P2.7/P2.8 — `PLANO_QR_BARCODE.md`).
