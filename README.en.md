# GRBL Studio

[![CI](https://github.com/viniciuswerneck/GRBL-Studio/actions/workflows/ci.yml/badge.svg)](https://github.com/viniciuswerneck/GRBL-Studio/actions/workflows/ci.yml)

[Português](README.md) · **English** · [Español](README.es.md)

GRBL Studio is a modern, native Linux alternative to LaserGRBL, built with
Electron + TypeScript to control laser engravers/cutters running **GRBL 1.1**
firmware.

## Features

- **Serial connection** to GRBL (USB) and **WiFi/TCP** (ESP8266/ESP32).
- **Send-response G-code streaming**: the next line is only sent after the `ok`
  — it respects the GRBL buffer and won't lock up the machine.
- Manual **JOG** (X/Y/Z), Home, Set Origin, Unlock and Reset.
- **Console** with the machine's real responses (`ok`, `error:`, `ALARM:`,
  `[MSG:]`).
- **2D preview** of the toolpath (rapids × burning), zoom/pan and progress
  highlight.
- Real-time **overrides** (feed, power and rapid movement).
- **`$$` settings**: viewer/editor with contextual help, plus `$#`, `$I` and
  `$G`.
- **Image → G-code import**: PNG/JPG/BMP/GIF/WebP/AVIF with adjustments, raster
  (line/dither) or vector tracing (outline/cut), material profiles.
- **Built-in vector editor** (Draw tab): mm workspace with rectangles, ellipses,
  polygons, pen, vector text and freehand drawing; node editing, stroke width,
  booleans (union/subtract/intersect/exclude), parallel contour, copy matrix,
  mirror, group and align. The G-code comes out **anchored at the origin
  (X0 Y0)**, ready to engrave with the workpiece already in place.
- **Symbol tools**: **QR Code** and **Data Matrix ECC200** (ECC L/M/Q/H, size in
  mm, quiet zone, legibility warnings) and **1D barcodes** — Code 128/GS1-128,
  EAN-13/8, UPC-A, Code 39, ITF-14, Codabar and Code 93 — with HRI; all of it
  becomes G-code in the same preview/Play flow.
- **Machine profiles** for 22 models + Generic GRBL (work area, homing, laser
  module and `S` ceiling) as data, not hardcoded.
- **Basic Mode** with a 6-step wizard for beginners; a full Advanced mode and a
  5-step **welcome tour** on first run.
- **Macros** and custom buttons, plus job resume after an interruption.
- **11 themes** (5 light, 4 dark, 2 high contrast) and a UI in **pt-BR, en and
  es** (auto-detects the system language on first run).
- **Accessibility and performance**: budgets of ≤ 1.5 s startup, ≤ 200 MB RAM,
  0.001 mm DRO (see `docs/DESIGN.md`).

## Installation

Prebuilt packages (**AppImage** and **`.deb`**) are on the
[Releases](https://github.com/viniciuswerneck/GRBL-Studio/releases) page:

```bash
chmod +x GRBL-Studio-*.AppImage && ./GRBL-Studio-*.AppImage
```

Or from source:

```bash
cd "GRBL Studio"
npm install
npm run build
npm start
# In a container/sandbox-less environment:
npx electron --no-sandbox .
```

On Linux, serial port access may require the `dialout` group — see
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Development

- Tests: `npm test` (Vitest)
- Lint/format: `npm run lint` (Biome)
- Type-check: `npm run typecheck`
- Smoke (headless): `GRBL_SMOKE_TEST=1 xvfb-run -a npx electron --no-sandbox .`
- Full guide: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Documentation

Full index in [`docs/README.md`](docs/README.md) (in Portuguese).

- [Product Spec (requirements)](docs/PRODUCT_SPEC.md)
- [Action Plan](docs/PLANO_DE_ACAO.md)
- [Design / UI (Fluent · Win11)](docs/DESIGN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development](docs/DEVELOPMENT.md)
- [LaserGRBL comparison](docs/FEATURES_COMPARISON.md)
- [Roadmap](docs/ROADMAP.md)

## License

[MIT](LICENSE) © 2026 Vinicius Werneck