# GRBL Studio

[![CI](https://github.com/viniciuswerneck/GRBL-Studio/actions/workflows/ci.yml/badge.svg)](https://github.com/viniciuswerneck/GRBL-Studio/actions/workflows/ci.yml)

GRBL Studio é uma alternativa moderna ao LaserGRBL, feita em Electron + TypeScript para Linux.

## Funcionalidades
- Conexão serial com GRBL
- JOG (movimento manual)
- Envio de arquivo G-Code
- Console interativo
- Interface moderna e intuitiva

## Instalação
```bash
cd "GRBL Studio"
npm install
npm run build
npm start
# Em container/ambiente sem sandbox:
npx electron --no-sandbox .
```

## Desenvolvimento
- Testes: `npm test`
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
