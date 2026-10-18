# AGENTS.md — GRBL Studio

Instruções persistentes para agentes de IA que trabalham neste repositório.
**Estas regras valem sempre.** Conhecimento de domínio (protocolo, UI, release)
está nas skills em `.opencode/skills/`.

## O que é este projeto

**GRBL Studio** — alternativa nativa para Linux ao LaserGRBL. App
**Electron + TypeScript** que controla gravadoras/cortadoras laser com firmware
**GRBL 1.1** (conexão serial, jog, status, envio de G-code, overrides, preview,
importação de imagem).

## Fonte da verdade (leia antes de codar)

| Tema | Documento |
| :--- | :--- |
| Requisitos (o *quê*) | `docs/PRODUCT_SPEC.md` |
| Plano, fases, DoD (o *como/quando*) | `docs/PLANO_DE_ACAO.md` |
| Design / Fluent / performance | `docs/DESIGN.md` |
| Arquitetura (atual e alvo) | `docs/ARCHITECTURE.md` |
| Paridade com LaserGRBL | `docs/FEATURES_COMPARISON.md` |
| Manual de hardware (COMGO Z1) | `docs/comgo_z1_lasergrbl_user_manual.md` |

Se o código divergir da documentação, **atualize a documentação na mesma tarefa**.

## Comandos

```bash
npm install            # dependências
npm run build          # tsc + empacota o preload (esbuild) -> dist/
npm run typecheck      # tsc --noEmit
npm start              # rodar o app Electron (requer build)
npm run start:dev      # build + rodar
npm test               # Vitest (unit + integração)
```

- Testes: **Vitest** (unit/integração) já configurado; **Playwright** (E2E)
  pendente na Fase 6. Configure os testes antes de adicionar lógica de protocolo.
- Smoke test headless: `GRBL_SMOKE_TEST=1 xvfb-run -a npx electron --no-sandbox .`.
- Emulador GRBL para testes sem hardware: ver skill `grbl-protocol`
  (há teste de integração real via PTY/socat em `tests/serial-integration.test.ts`).
- Sempre rode `tsc`/type-check e os testes antes de considerar uma tarefa pronta.
- Guia de ambiente/build/testes: `docs/DEVELOPMENT.md`.
- Tabelas do QR Code são **geradas**: `node scripts/gen-qr-tables.mjs` reescreve
  `src/shared/symbol/qr.tables.ts` (formato já compatível com o Biome) a partir
  da referência `qrcode-generator` — não editar a tabela à mão.
- Tabelas do código de barras 1D são **geradas**:
  `node scripts/gen-barcode-tables.mjs` reescreve
  `src/shared/symbol/barcode/tables.ts` (Code 128/39 + L/G/R do EAN/UPC) a partir
  da referência `jsbarcode` (devDependency) — não editar à mão.

## Invariantes do protocolo (NUNCA quebre)

1. **Comandos de tempo real** (`?`, `!`, `~`, `0x18`, `0x90–0x94`) são **byte
   único e NÃO levam `\n`**. Ex.: Feed Hold é `'!'`, não `'!\n'`.
2. **Nunca estoure o buffer do GRBL.** O envio usa uma **janela com contagem de
   caracteres**: no máximo o tamanho do buffer RX da máquina (lido de `[OPT:…]`;
   128 bytes por padrão) e nunca mais linhas que a profundidade do planner em
   linhas sem `ok`, e cada `ok` libera espaço — nada de `write` em massa.
   Consultas/comandos avulsos só vão com a janela vazia; `error:` interrompe o
   job. Estourar o buffer trava a máquina e queima material.
3. **`contextIsolation: true`, `nodeIntegration: false`** sempre. Toda ponte
   renderer↔main passa pelo preload (`contextBridge`), com IPC tipado. Nunca
   exponha `ipcRenderer` cru nem APIs Node ao renderer.
4. **Nada de lógica de protocolo na UI.** Parsing/estado vive em módulos puros e
   testáveis (`src/shared/protocol.*`, `src/main/services/GrblClient.*`).
5. **Nunca arredonde valores de G-code** ao reenviar; preserve a precisão do arquivo.

## Orçamentos (RNF-11 / RNF-12 — são requisitos, não sugestões)

| Métrica | Limite |
| :--- | :--- |
| Startup | ≤ 1,5 s |
| RAM | ≤ 200 MB após 10 min |
| Resposta a interação | ≤ 100 ms |
| FPS durante job | ≥ 55 |
| CPU ociosa | ≈ 0 % |
| Latência de status (`?`) | ≤ 200 ms |
| DRO / posição | 0,001 mm, estável (`tabular-nums`) |
| Escala DPI | nítido em 100/125/150/200 % |

Regras de leveza: nada de `backdrop-filter` na janela inteira; animar só
`transform`/`opacity`; console com *virtual scrolling*; preview em `<canvas>`;
*polling* parado ao desconectar.

## Fluxo de trabalho

1. **Respeite o gate de fases.** A **Fase 1** (core de comunicação confiável —
   bugs B1–B6 do plano) é pré-requisito das demais. Não comece features novas
   antes de resolvê-la.
2. Toda tarefa deve citar o requisito (`RF-…`/`RNF-…`) que atende.
3. Siga o **Definition of Done** (`docs/PLANO_DE_ACAO.md` §11): testes, lint,
   type-check, sem regressão de segurança, performance dentro do orçamento.
4. Mudanças pequenas e focadas; não misture refatoração com feature.

## Convenções de código

- TypeScript **estrito** em main, preload e renderer.
- Protocolo/parsing = funções puras (fáceis de testar).
- Nomes de canal IPC centralizados (`src/shared/channels.ts`) e tipados.
- Textos de UI **nunca hardcoded**: use chaves i18n (`t('…')` ou `data-i18n`)
  com o pt-BR como fonte da verdade (`src/shared/i18n/`); en/es mantêm paridade
  garantida por type-check.
- Design: use os tokens de `docs/DESIGN.md` (`tokens.css`) e os ids de tema de
  `src/shared/themes.ts`, não valores soltos.
- Lint/format: **Biome** — `npm run lint` (+ `lint:fix`, `format`). Ver
  `docs/DEVELOPMENT.md` §"Lint e formatação". Rode antes do commit.

## Não faça

- Não edite arquivos gerados (`dist/`, e os bundles gerados em `public/*.js` —
  ex.: `qrcode`, `i18n`, `materials`, `gcode.worker`). Eles são listados no
  `.gitignore`: edite a fonte TS e recompile (`npm run build`).
  `public/renderer.js` **é fonte** (editável) e não é gerado.
- Não faça commit de segredos, `.bak` ou artefatos de build.
- Não introduza dependência pesada de UI (frame de componentes grande) sem
  confirmar que os orçamentos de performance continuam válidos (ver ADR-11).
- Não assuma hardware disponível: use o emulador GRBL.
