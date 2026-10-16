# Contribuindo com o GRBL Studio

Obrigado pelo interesse! Este projeto é uma alternativa **nativa** (Electron +
TypeScript) ao LaserGRBL para **Linux**, que controla gravadoras/cortadoras
laser com firmware **GRBL 1.1**.

## Antes de começar

- Leia o [`AGENTS.md`](AGENTS.md): regras que valem sempre (invariantes do
  protocolo, orçamentos de performance/precisão, gate de fases, DoD).
- Guia de ambiente/build/testes: [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).
- Documentação canônica: [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) (o *quê*),
  [`docs/PLANO_DE_ACAO.md`](docs/PLANO_DE_ACAO.md) (o *como/quando*),
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) e [`docs/DESIGN.md`](docs/DESIGN.md).

## Setup

```bash
npm install
npm run build
npm test
```

## Definition of Done (resumo)

Antes de comitar, rode e deixe passar:

```bash
npm run lint        # Biome (lint + formatação)
npm run typecheck   # tsc --noEmit (TypeScript estrito)
npm test            # Vitest (unit + integração)
npm run build       # tsc + preload + worker
```

E garanta:

- **Segurança**: `contextIsolation: true`, `nodeIntegration: false`; toda ponte
  renderer↔main passa pelo preload com IPC tipado. Nunca exponha `ipcRenderer`.
- **Protocolo**: comandos de tempo real são **byte único e SEM `\n`**; o envio de
  G-code é **send-response** (nunca em massa); nada de lógica de protocolo na UI.
- **Performance** dentro dos orçamentos RNF-11/RNF-12 (ver `AGENTS.md`).
- **Documentação**: se o código divergir da doc, atualize a doc na mesma tarefa.
- **Rastreabilidade**: cite o requisito que a mudança atende (`RF-…`/`RNF-…`).

## Estilo

- TypeScript estrito; sem `any` desnecessário; protocolo/parsing como funções puras.
- Lint/format é responsabilidade do **Biome** — não discuta estilo em review,
  rode `npm run lint:fix`.
- Commits no imperativo e em português, no estilo *Conventional Commits*
  (`feat:`, `fix:`, `docs:`, `chore:`, `test:`…).

## Testes

- Protocolo/parsing: funções puras, cobertas em `tests/`.
- **Sem hardware?** Não assuma uma máquina disponível: use o emulador GRBL
  (`scripts/grbl-emulator.mjs`) e os smoke tests headless (ver `DEVELOPMENT.md`).
- Mudanças em pause/stop/emergência merecem testes extras — o app controla uma
  máquina que queima material.

## Não faça

- Commitar segredos, `.bak` ou artefatos de build (`dist/`, `public/gcode.worker.js`
  são gerados e ignorados pelo Git).
- Introduzir dependência pesada de UI sem checar os orçamentos (ver ADR-11).

## Licença

Ao contribuir, você concorda que a sua contribuição é licenciada sob a licença
**MIT** deste repositório — ver [`LICENSE`](LICENSE).
