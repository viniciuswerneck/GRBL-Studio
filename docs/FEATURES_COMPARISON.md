# Comparação: LaserGRBL vs GRBL Studio

## Core
| Feature | LaserGRBL (C#) | GRBL Studio (Electron) | Status |
|---|---|---|---|
| Conexão Serial | Sim | Sim | ✅ Implementado |
| Envio G-Code (send-response) | Sim | Sim | ✅ Implementado |
| JOG | Sim | Sim | ✅ Implementado |
| Console (com respostas da máquina) | Sim | Sim | ✅ Implementado |
| Status GRBL (pos/feed) | Sim | Sim | ✅ Implementado |
| Override Feed/Spindle | Sim | Parcial (feed) | 🟡 Parcial |
| Homing | Sim | Sim | ✅ Implementado |
| Pausar / Retomar / Parar | Sim | Sim | ✅ Implementado |

## Preview
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| Preview 2D | Sim | Sim (canvas) | ✅ Implementado |
| OpenGL Preview | Sim | Não | Pendente |
| Zoom/Pan | Sim | Não | Pendente |
| Visualização tempo real | Sim | Não | Pendente |

## Importação
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| G-Code (.gcode/.nc) | Sim | Sim | Implementado |
| Imagem (JPG/BMP/PNG) | Sim | Sim (PNG/JPEG/BMP/GIF/WebP/AVIF) | Implementado |
| SVG | Experimental | Não | Pendente |
| Rasterização (Line-to-line/Dithering) | Sim | Sim (line-to-line + Floyd–Steinberg) | Implementado |
| Vetorização | Sim | Sim (contorno/recorte por limiar) | Implementado |
| Perfis de material | Sim | Sim (matriz COMGO Z1: 5W e 10W) | Implementado |

## Configuração
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| Grbl Settings ($$) | Sim | Não | Pendente |
| Custom Buttons | Sim | Não | Pendente |
| WiFi (ESP8266) | Sim | Não | Pendente |
| Macros | Sim | Não | Pendente |

## UX
| Feature | LaserGRBL | GRBL Studio | Status |
|---|---|---|---|
| Interface Windows | Sim | Inspirada/Moderna | Parcial |
| Linux nativo | Via Mono | Nativo | Implementado |
| Dark/Light theme | Múltiplos | Dark/Light | Implementado |

## Prioridades para MVP funcional
1. ~~Status GRBL em tempo real - `?` polling~~ ✅
2. ~~Mostrar posição X/Y/Z~~ ✅
3. ~~Transmissão confiável (aguardar `ok`)~~ ✅
4. ~~Feed Hold/Resume/Reset~~ ✅
5. Configurações básicas (`$$`) — **próximo (Fase 3)**
6. Persistir preferências (porta/baud/tema) — **Fase 3**
