# GRBL Studio

[![CI](https://github.com/viniciuswerneck/GRBL-Studio/actions/workflows/ci.yml/badge.svg)](https://github.com/viniciuswerneck/GRBL-Studio/actions/workflows/ci.yml)

[Português](README.md) · [English](README.en.md) · **Español**

GRBL Studio es una alternativa moderna y nativa para Linux a LaserGRBL, hecha
con Electron + TypeScript, para controlar grabadoras/cortadoras láser con
firmware **GRBL 1.1**.

## Funcionalidades

- **Conexión serie** con GRBL (USB) y **WiFi/TCP** (ESP8266/ESP32).
- **Envío de G-code fiable**: ventana con conteo de caracteres — nunca más bytes
  sin `ok` que el búfer de GRBL. El envío sigue lleno aunque la PC esté ocupada,
  sin bloquear la máquina.
- **JOG** manual (X/Y/Z), Home, Definir origen, Unlock y Reset.
- **Consola** con las respuestas reales de la máquina (`ok`, `error:`,
  `ALARM:`, `[MSG:]`).
- **Vista previa 2D** de la trayectoria (rápidos × quemado), zoom/pan y
  resaltado del progreso.
- **Overrides** en tiempo real (avance, potencia y movimiento rápido).
- **Configuración `$$`**: visor/editor con ayuda contextual, más `$#`, `$I` y
  `$G`.
- **Importación de imagen → G-code**: PNG/JPG/BMP/GIF/WebP/AVIF con ajustes,
  raster (línea/dither) o vectorización (contorno/corte), perfiles de material.
- **Editor vectorial propio** (pestaña Dibujar): mesa de trabajo en mm con
  rectángulos, elipses, polígonos, pluma, texto vectorial y dibujo libre; edición
  de nodos, grosor de trazo, booleanas (unir/restar/intersección/excluir),
  contorno paralelo, matriz de copias, espejo, agrupar y alinear. El G-code sale
  **anclado al origen (X0 Y0)**, listo para grabar con la pieza ya posicionada.
- **Herramientas de símbolos**: **QR Code** y **Data Matrix ECC200** (ECC
  L/M/Q/H, tamaño en mm, quiet zone, avisos de legibilidad) y **códigos de
  barras 1D** — Code 128/GS1-128, EAN-13/8, UPC-A, Code 39, ITF-14, Codabar y
  Code 93 — con HRI; todo se convierte en G-code en el mismo flujo de
  vista previa/Play.
- **Perfiles de máquina** de 22 modelos + Genérico GRBL (área de trabajo, homing,
  módulo láser y techo de `S`) como dato, no fijado en el código.
- **Modo Básico** con un asistente de 6 pasos para principiantes; modo Avanzado
  completo y un **tour de bienvenida** de 5 pasos en el primer arranque.
- **Macros** y botones personalizados, y reanudación de un trabajo interrumpido.
- **11 temas** (5 claros, 4 oscuros, 2 de alto contraste) e interfaz en
  **pt-BR, en y es** (detecta el idioma del sistema en el primer arranque).
- **Accesibilidad y rendimiento**: presupuestos de arranque ≤ 1,5 s, RAM
  ≤ 200 MB, DRO de 0,001 mm (ver `docs/DESIGN.md`).

## Instalación

Paquetes listos (**AppImage** y **`.deb`**) en la página de
[Releases](https://github.com/viniciuswerneck/GRBL-Studio/releases):

```bash
chmod +x GRBL-Studio-*.AppImage && ./GRBL-Studio-*.AppImage
```

O desde el código:

```bash
cd "GRBL Studio"
npm install
npm run build
npm start
# En contenedor/entorno sin sandbox:
npx electron --no-sandbox .
```

En Linux, el acceso al puerto serie puede requerir el grupo `dialout` — consulta
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Desarrollo

- Pruebas: `npm test` (Vitest)
- Lint/format: `npm run lint` (Biome)
- Verificación de tipos: `npm run typecheck`
- Smoke (headless): `GRBL_SMOKE_TEST=1 xvfb-run -a npx electron --no-sandbox .`
- Guía completa: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Documentación

Índice completo en [`docs/README.md`](docs/README.md) (en portugués).

- [Product Spec (requisitos)](docs/PRODUCT_SPEC.md)
- [Plan de Acción](docs/PLANO_DE_ACAO.md)
- [Diseño / Interfaz (Fluent · Win11)](docs/DESIGN.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Desarrollo](docs/DEVELOPMENT.md)
- [Comparación con LaserGRBL](docs/FEATURES_COMPARISON.md)
- [Roadmap](docs/ROADMAP.md)

## Licencia

[MIT](LICENSE) © 2026 Vinicius Werneck