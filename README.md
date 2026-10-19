# GRBL Studio

[![CI](https://github.com/viniciuswerneck/GRBL-Studio/actions/workflows/ci.yml/badge.svg)](https://github.com/viniciuswerneck/GRBL-Studio/actions/workflows/ci.yml)

**Português** · [English](README.en.md) · [Español](README.es.md)

GRBL Studio é uma alternativa moderna e nativa para Linux ao LaserGRBL, feita em
Electron + TypeScript, para controlar gravadoras/cortadoras laser com firmware
**GRBL 1.1**.

## Funcionalidades

- **Conexão serial** com GRBL (USB) e **WiFi/TCP** (ESP8266/ESP32).
- **Envio de G-code confiável**: janela com contagem de caracteres — nunca mais
  bytes sem `ok` que o buffer do GRBL. O envio continua cheio mesmo com o PC
  ocupado, sem travar a máquina.
- **JOG** manual (X/Y/Z), Home, Definir origem, Unlock e Reset.
- **Console** interativo com as respostas reais da máquina (`ok`, `error:`,
  `ALARM:`, `[MSG:]`).
- **Preview 2D** do caminho (rápidos × queima), zoom/pan e destaque do progresso.
- **Overrides** em tempo real (feed, potência e deslocamento rápido).
- **Configuração `$$`**: viewer/editor com ajuda contextual, `$#`, `$I` e `$G`.
- **Importação de imagem → G-code**: PNG/JPG/BMP/GIF/WebP/AVIF com ajustes,
  raster (linha/dither) ou vetorização (contorno/recorte), perfis de material.
- **Editor vetorial próprio** (aba Desenhar): prancheta em mm com retângulos,
  elipses, polígonos, caneta, texto vetorial e desenho livre; edição de nós,
  espessura de traço, booleanas (unir/subtrair/intersectar/excluir), contorno
  paralelo, matriz de cópias, espelhar, agrupar e alinhar. O G-code sai
  **ancorado na origem (X0 Y0)**, pronto para gravar com a peça já posicionada.
- **Ferramentas de símbolos**: **QR Code** e **Data Matrix ECC200** (ECC
  L/M/Q/H, tamanho em mm, quiet zone, avisos de legibilidade) e **código de
  barras 1D** — Code 128/GS1-128, EAN-13/8, UPC-A, Code 39, ITF-14, Codabar e
  Code 93 — com HRI; tudo vira G-code no mesmo preview/Play.
- **Perfis de máquina** de 22 modelos + Genérico GRBL (curso, homing, módulo do
  laser e teto de `S`) como dado, não chumbado no código.
- **Modo Básico** com wizard de 6 passos para quem está começando; modo Avançado
  completo e **tour de boas-vindas** de 5 passos na primeira execução.
- **Macros** e botões customizados, retomada de job interrompido.
- **11 temas** (5 claros, 4 escuros, 2 de alto contraste) e **interface em
  pt-BR, en e es** (detecta o idioma do sistema na 1ª execução).
- **Acessibilidade e performance**: orçamentos de startup ≤ 1,5 s, RAM ≤ 200 MB,
  DRO em 0,001 mm (ver `docs/DESIGN.md`).

## Instalação

Pacotes prontos (**AppImage** e **`.deb`**) na página de
[Releases](https://github.com/viniciuswerneck/GRBL-Studio/releases):

```bash
chmod +x GRBL-Studio-*.AppImage && ./GRBL-Studio-*.AppImage
```

Ou a partir do código:

```bash
cd "GRBL Studio"
npm install
npm run build
npm start
# Em container/ambiente sem sandbox:
npx electron --no-sandbox .
```

No Linux, o acesso à porta serial pode exigir o grupo `dialout` — instruções em
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Desenvolvimento

- Testes: `npm test` (Vitest)
- Lint/format: `npm run lint` (Biome)
- Type-check: `npm run typecheck`
- Smoke (headless): `GRBL_SMOKE_TEST=1 xvfb-run -a npx electron --no-sandbox .`
- Guia completo: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Documentação

Índice completo em [`docs/README.md`](docs/README.md).

- [Product Spec (requisitos)](docs/PRODUCT_SPEC.md)
- [Plano de Ação](docs/PLANO_DE_ACAO.md)
- [Design / Interface (Fluent · Win11)](docs/DESIGN.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Desenvolvimento](docs/DEVELOPMENT.md)
- [Comparação com LaserGRBL](docs/FEATURES_COMPARISON.md)
- [Roadmap](docs/ROADMAP.md)

## Licença

[MIT](LICENSE) © 2026 Vinicius Werneck