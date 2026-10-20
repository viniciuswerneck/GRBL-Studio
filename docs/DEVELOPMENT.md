# GRBL Studio - Desenvolvimento

Guia de ambiente, build, execução e testes. Ver também `AGENTS.md` (convenções e
invariantes) e `ARCHITECTURE.md` (estrutura).

## Requisitos

- Node.js 22+
- Linux (X11 ou Wayland). Para portas seriais: usuário no grupo `dialout`.
- Opcional: `socat` (testes de integração) e `xvfb-run` (testes headless/CI).

## Setup

```bash
npm install
```

## Compilar

```bash
npm run build        # tsc + empacota preload e os bundles do renderer (esbuild)
npm run typecheck    # apenas verificação de tipos (tsc --noEmit)
npm run dev          # tsc em watch (main/preload/shared)
```

O `build` faz duas coisas: `tsc` compila `src/**` para `dist/**` (main,
preload, shared, renderer) e, em seguida, o `esbuild` empacota **cada bundle
consumido pelo renderer em runtime** (JS puro que não importa TS):

| Script | Saída | Global | Fonte |
| :--- | :--- | :--- | :--- |
| `build:preload` | `dist/preload/index.js` | — | `src/preload/index.ts` (roda com `sandbox: true`: não pode usar `require` relativo) |
| `build:worker` | `public/gcode.worker.js` | — | `src/renderer/gcode.worker.ts` (imagem → G-code fora da thread) |
| `build:materials` | `public/materials.js` | `GRBL_MATERIALS` | `shared/materials.ts` (perfis de material) |
| `build:adjust` | `public/adjust.js` | `GRBL_ADJUST` | `shared/image/adjust.ts` (ajustes de imagem) |
| `build:preview` | `public/preview.js` | `GRBL_PREVIEW` | `shared/preview.ts` (parser do preview) |
| `build:resume` | `public/resume.js` | `GRBL_RESUME` | `shared/resume.ts` (retomada de job) |
| `build:preflight` | `public/preflight.js` | `GRBL_PREFLIGHT` | `shared/preflight.ts` (regras MX-1…MX-15) |
| `build:gcodeEditor` | `public/gcodeEditor.js` | `GRBL_GCODE_EDITOR` | `shared/gcodeEditor.ts` (editor de G-code: realce/edições/trecho) |
| `build:macros` | `public/macros.js` | `GRBL_MACROS` | `shared/macros.ts` (macros/botões) |
| `build:qrcode` | `public/qrcode.js` | `GRBL_QR` | `shared/symbol/entry.qr.ts` (QR/Data Matrix/PDF417/Aztec → G-code) |
| `build:barcode` | `public/barcode.js` | `GRBL_BARCODE` | `shared/symbol/entry.barcode.ts` (1D + HRI → G-code) |
| `build:batch` | `public/batch.js` | `GRBL_BATCH` | `shared/entry.batch.ts` (lote: CSV → peças; RF-SYM-10) |
| `build:production` | `public/production.js` | `GRBL_PRODUCTION` | `shared/entry.production.ts` (modo produção: cópias; RF-GC-12) |
| `build:focusTest` | `public/focusTest.js` | `GRBL_FOCUS_TEST` | `shared/entry.focusTest.ts` (teste de foco: escada de Z; RF-IMG-13) |
| `build:presets` | `public/presets.js` | `GRBL_PRESETS` | `shared/entry.materialPresets.ts` (presets: dose + JSON; RF-IMG-14) |
| `build:i18n` | `public/i18n.js` | `GRBL_I18N` | `shared/i18n/entry.ts` (catálogos pt-BR/en/es + `applyDom`) |

Os bundles em `public/*.js` listados acima são de build (estão no `.gitignore`):
**não edite** — altere a fonte TS e rode `npm run build` (ou o script
`build:<nome>`). O único `.js` em `public/` que é **fonte** (editável à mão) é o
`public/renderer.js`.

## Rodar

```bash
npm start            # requer build prévio
npm run start:dev    # build + start
# Em ambiente sem sandbox do Chromium (containers):
npx electron --no-sandbox .
```

## Testes

```bash
npm test             # Vitest (uma execução)
npm run test:watch   # modo watch
npm run test:coverage  # Vitest + cobertura (limiares de ≥ 80 % no protocolo)
npm run test:e2e     # Playwright + Electron (precisa de display: xvfb-run -a)
```

Cobertura atual:

- `tests/protocol.test.ts` — parser de status, classificação de linhas, settings.
- `tests/grbl-client.test.ts` — fila com janela por bytes, progresso, alarmes,
  overrides, watchdog, jog contínuo (`0x85`) e ação recomendada no alarme.
- `tests/preview.test.ts` / `tests/preview-estimate.test.ts` — parser de
  movimento (`G0/G1/G2/G3`, `G90/G91`, unidades) e tempo estimado (RF-GC-2/5).
- `tests/prefs-store.test.ts` — sanitização das preferências (pasta de arquivos,
  perfis de `$$`, histórico de alarmes).
- `tests/session-log.test.ts` — log persistente de sessão (RNF-9).
- `tests/serial-integration.test.ts` — integração real de `SerialTransport` com
  um par de PTYs criado por `socat` (ignorado automaticamente se não houver socat).
- `tests/image-adjust.test.ts` — cinza/alfa, ajustes, Floyd–Steinberg.
- `tests/image-gcode.test.ts` — geometria, reamostragem e invariantes do
  emissor (área de trabalho, limites de `S`, `G0` sem `F`, precisão).
- `tests/image-contour.test.ts` — traçador de contorno (RF-IMG-6): padrões,
  furos, canto de sela, simplificação RDP, mapeamento px → mm e invariantes.
- `tests/file-filters.test.ts` — filtros dos diálogos nativos, detecção de
  extensão (maiúsculas/minúsculas) e MIME da imagem.

### Cobertura (Fase 8)

`vitest.config.ts` mede a cobertura do **núcleo do protocolo**
(`src/shared/protocol.ts` e `src/shared/preview.ts`) com limiar de **90 %** em
linhas/funções/branches/statements e **95 %** em `src/shared/protocol.ts` (P0.6).
`npm run test:coverage` falha se cair abaixo. Estado atual: 96,3 % statements,
93,9 % branches, 100 % funções — `protocol.ts` em 100/97,8/100/100.

### E2E (Playwright + Electron)

`e2e/` sobe o **Electron real** (sem baixar navegadores) e dirige o renderer:

```bash
xvfb-run -a npm run test:e2e      # headless
npm run test:e2e                  # com display
```

Cada teste usa um `--user-data-dir` temporário, então não toca nas preferências
do ambiente. Configuração em `playwright.config.ts`.

### Smoke test (headless / CI)

Verifica que o app sobe e que o renderer carrega sem erros:

```bash
GRBL_SMOKE_TEST=1 npx electron --no-sandbox .          # com display
GRBL_SMOKE_TEST=1 xvfb-run -a npx electron --no-sandbox .   # headless
# Saída esperada: SMOKE_OK
```

`SMOKE_EVAL` permite avaliar uma expressão JS no renderer após o load e imprimir
`SMOKE_EVAL_RESULT` — útil para probes de UI (ex.: fluxo imagem → G-code) sem
maquinário de E2E:

```bash
SMOKE_EVAL="$(cat probe.js)" GRBL_SMOKE_TEST=1 xvfb-run -a npx electron --no-sandbox .
```

### Benchmark dos orçamentos (P0.1)

Mede, com o app Electron real e sem hardware, os orçamentos de **RNF-11**:
startup (spawn → primeiro frame), RAM (PSS da árvore de processos, ao longo do
dwell; o RSS aparece só como informação), CPU ociosa e latência de ida e volta
main → renderer → IPC. O limite de RAM é escolhido pelo display server
detectado (280 MB em X11, 300 MB em Wayland — `BENCHMARK.md` §6.6).
Meça com o app sozinho: outra instância do mesmo Electron aberta faz o PSS
parecer menor (o script conta e avisa).

```bash
npm run build
npm run bench                              # 10 min de dwell, tabela markdown
node scripts/bench.mjs --dwell=2000        # execução curta
node scripts/bench.mjs --json > bench.json # JSON (para comparar versões)
```

O script exige `dist/` compilado e um display (X11/Wayland) — use `xvfb-run -a`
no headless. Ele liga `GRBL_BENCH=1` no main, que só então registra os marcos de
tempo (fora disso, nada muda no app) e é **Linux-only** (`/proc`). FPS durante
job, latência de status com hardware e DPI são **procedimentos manuais** — ver
[`BENCHMARK.md`](BENCHMARK.md), que traz a metodologia, os números medidos e a
leitura honesta de onde os orçamentos **não** são atendidos.

## Lint e formatação (Biome)

Usamos **Biome** — linter + formatter num único binário (Rust). Não é
capricho: o projeto usa **TypeScript 7** (compilador nativo), que **não expõe a
API JavaScript** exigida pelo `typescript-eslint`; a stack ESLint + Prettier
padrão é inviável aqui.

```bash
npm run lint          # biome check .            (lint + formatação; não altera)
npm run lint:fix      # biome check --write .    (aplica correções seguras)
npm run format        # biome format --write .
npm run format:check  # biome format .
```

- Configuração em `biome.json` (aspas simples, `;`, 2 espaços, 80 colunas).
- `vcs.useIgnoreFile` faz o Biome respeitar o `.gitignore` (não toca `dist/` nem
  `public/gcode.worker.js`).
- A regra `style/noNonNullAssertion` está **desativada de propósito**: o código
  usa `!` em laços numéricos e o `tsc` estrito é a rede de segurança de tipos.
- Rode `npm run lint` antes de cada commit (faz parte do DoD).

## Integração contínua (CI)

`.github/workflows/ci.yml` roda em cada push para `main` e em cada PR:

| Job | O que faz |
| :--- | :--- |
| **quality** | `npm ci` → `lint` (Biome) → `typecheck` → `test` (Vitest, com `socat` instalado para o teste PTY) → `test:coverage` → `build`. |
| **smoke** | `npm ci` → `build` → smoke headless do Electron sob `xvfb`. |
| **e2e** | `npm ci` → `build` → `npm run test:e2e` (Playwright + Electron sob `xvfb`). |

`.github/workflows/release.yml` publica a release do GitHub (AppImage + deb)
quando uma tag `v*` é empurrada (`workflow_dispatch` só gera os artefatos).

Rode a mesma sequência localmente antes de comitar:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

> `npm run typecheck` roda `tsc --noEmit` (em `src/`) **e** `tsc -p
> tsconfig.test.json` (em `tests/` e `e2e/`), fechando o type-check do DoD §11.

## Emulador GRBL (testes manuais sem hardware)

Crie um par de PTYs e converse com ele por um script simples:

```bash
socat -d -d pty,raw,echo=0 pty,raw,echo=0
# Anote os dois /dev/pts/N exibidos; conecte o app em um deles.
```

Um "GRBL falso" mínimo (responde `ok` a cada linha e emite status) pode ser
escrito em Node e ligado à outra ponta do PTY. Ver a skill
`.opencode/skills/grbl-protocol/`.

### Máquina real — leitura e comandos explícitos

Duas ferramentas para **estudar a máquina de verdade** sem arriscar material.
As duas exigem a porta livre: **o app tem de estar desconectado**.

```bash
npm run probe                 # lê ? $I $$ $# $G $N e salva um JSON (só leitura)
npm run grbl:send             # dry-run: mostra o que seria enviado
npm run grbl:send -- --yes -- 'M5' '?' '$J=X5 F500' '?'   # envia de verdade
```

- `scripts/probe-machine.mjs`: **allowlist** de consultas (`? $I $$ $# $G $N`),
  abre a porta com `dtr:false, rts:false` (não reseta a máquina) e grava o
  transcript cru em `/tmp/opencode/grbl-probe.json`.
- `scripts/grbl-send.mjs`: todo comando vai **na linha de comando** (nada
  escondido no script). Sem `--yes` é simulação; `M3`/`M4` (ligar o laser) só
  passam com `--laser`; `$RST=` e `$SLP` são sempre bloqueados. Comandos de
  tempo real: `?`, `!`, `~` e `RESET` (0x18).
- Coletas viram **fixture de teste** (`tests/fixtures/`) e o perfil da máquina
  (`src/shared/machines.ts`). Exemplo pronto: Sculpfun C1 — ver
  [`PLANO_MAQUINA.md`](PLANO_MAQUINA.md) §11.

> **Antes de mover ou ligar o laser:** óculos, material fixado, nada de olhar
> direto para o ponto e extintor/pano úmido à mão. Movimento sem laser: use
> `$J=` (jog) com `F` baixo; nunca `G1 X…` sem `M5` — em modo laser (`$32=1`) o
> GRBL **mantém o `S` do job anterior** e o primeiro movimento pode queimar
> (regra **MX-12**).

## Estrutura

```
src/
├── main/
│   ├── index.ts              # bootstrap Electron + smoke test
│   ├── ipc.ts                # handlers IPC tipados
│   └── services/
│       ├── SerialTransport.ts  # I/O serial (serialport)
│       ├── SessionLog.ts       # log persistente de sessão (RNF-9)
│       ├── PrefsStore.ts       # preferências (prefs.json)
│       └── GrblClient.ts       # protocolo: fila com janela por bytes, status, overrides
├── renderer/
│   └── gcode.worker.ts       # worker: imagem -> G-code (empacotado p/ public/)
├── shared/
│   ├── channels.ts           # nomes de canais IPC (fonte única)
│   ├── protocol.ts           # parser puro GRBL (testável)
│   ├── fileFilters.ts        # filtros/MIME dos diálogos nativos
│   ├── types.ts              # tipos compartilhados
│   └── image/                # pipeline puro de preparação de arquivo (testado)
│       ├── adjust.ts         #   cinza + brilho/contraste/clip/inversão/B&W
│       ├── dither.ts         #   Floyd–Steinberg e limiar
│       ├── raster.ts         #   geometria da varredura + reamostragem
│       ├── contour.ts        #   traçador de contorno (RF-IMG-6) + RDP/shoelace
│       ├── vector.ts         #   emissor de recorte (contorno fechado a S-max)
│       ├── format.ts         #   formatCoord/MAX_S/assertWorkArea compartilhado
│       ├── gcode.ts          #   emissão M3/M4 com invariantes de segurança
│       └── types.ts          #   opções e estatísticas
└── preload/
    └── index.ts              # contextBridge -> window.grbl (empacotado)
public/                       # renderer (html/css/js) + tokens.css (+ gcode.worker.js)
tests/                        # Vitest (unit + integração)
e2e/                          # Playwright + Electron (Fase 8)
```

## Adicionando funcionalidades

1. **Shared**: tipos em `shared/types.ts`; se for protocolo, função pura em
   `shared/protocol.ts` (com teste).
2. **Main**: lógica em `main/services/*`; registre o handler em `main/ipc.ts`.
3. **Preload**: exponha o método em `window.grbl` (`preload/index.ts`).
4. **Renderer**: consuma `window.grbl` e atualize a UI.

## Convenções

- TypeScript estrito; sem `any` desnecessário.
- Protocolo/parsing = funções puras e testadas (nunca na UI).
- Comandos de tempo real **sem `\n`**; envio do job com **janela por bytes**
  (nunca mais bytes sem `ok` que o buffer RX do GRBL).
- Lint/format: **Biome** (`npm run lint`) — ver a seção "Lint e formatação".

## Empacotamento e release (RF-APP-4)

O projeto usa **`electron-builder`** (configuração em `electron-builder.yml`).
Artefatos ficam em `release/` (no `.gitignore`).

```bash
npm run package          # build + AppImage + deb (x64)
npm run package:linux     # mesmo, deixando claro o alvo
```

Saídas de exemplo:

- `release/GRBL Studio-0.1.0.AppImage`
- `release/grbl-studio_0.1.0_amd64.deb`

Notas:

- `serialport` passa pelo `@electron/rebuild` usado pelo `electron-builder`; não
  é necessário comando manual.
- O ícone do app vem de `docs/icone.png` → `build/icon.png` (512×512) e o
  splash de `docs/splash.png` → `public/splash.png` (984×437). **As fontes
  são os arquivos em `docs/`**; os do app são derivados e se geram com
  `python3 scripts/gen-assets.py` (precisa de Pillow). O
  `electron-builder` usa o ícone para o AppImage/.deb (atalho do desktop
  vinculado à janela por `desktopName`/`syncDesktopName`) e a janela principal
  o define em `BrowserWindow.icon`. O splash de abertura é `public/splash.png`
  exibido por `public/splash.html` (janela frameless de 738×328 — a proporção
  da imagem —, fechada em `ready-to-show`; desligado com
  `GRBL_SMOKE_TEST=1`/`GRBL_E2E=1`).
- Flatpak (RF-APP-4, “Could”): esqueleto pronto em `build/flatpak/` — o manifesto
  `com.grblstudio.app.yml` reempacota o AppImage gerado por `electron-builder`.
  Construa com `npm run package:flatpak` (requer `flatpak-builder` e os runtimes;
  ver `build/flatpak/README.md`). Não é construído no CI.

## Permissão de porta serial no Linux (RF-APP-5)

Se o app não detecta `/dev/ttyUSB*` ou `/dev/ttyACM*`, ou `SerialPort.list()`
volta vazio, normalmente é falta de permissão:

```bash
# 1. Adicionar o usuário ao grupo dialout
sudo usermod -aG dialout $USER

# 2. (Fedora/RHEL) em vez de dialout pode ser 'lock' ou 'uucp'
sudo usermod -aG uucp,lock $USER

# 3. Sair e entrar de novo (ou reboot) para a nova associação valer.
```

Se quiser liberar uma porta específica sem alterar grupos, crie uma regra udev:

```bash
# /etc/udev/rules.d/99-grbl-studio.rules
SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", MODE="0666", GROUP="dialout"

sudo udevadm control --reload-rules
sudo udevadm trigger
```

Os `idVendor`/`idProduct` de cada placa são obtidos com `lsusb`.
