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
npm run build        # tsc + empacota preload e worker de imagem (esbuild)
npm run typecheck    # apenas verificação de tipos (tsc --noEmit)
npm run dev          # tsc em watch (main/preload/shared)
```

O `build` faz cinco etapas:

1. `tsc` compila `src/**` para `dist/**` (main, preload, shared, renderer).
2. `esbuild` **empacota o preload** em `dist/preload/index.js`. Isso é
   necessário porque o preload roda com `sandbox: true` e não pode usar
   `require` relativo nem módulos Node.
3. `esbuild` **empacota o worker de imagem** em `public/gcode.worker.js`
   (formato iife, plataforma browser). É artefato de build — está no
   `.gitignore`; gere com `npm run build:worker` antes de usar a conversão
   imagem → G-code.
4. `esbuild` **empacota os perfis de material** em `public/materials.js`
   (iife, `global-name=GRBL_MATERIALS`) a partir de `shared/materials.ts`. O
   renderer é JS puro (não importa TS), então consome os perfis pelo global
   `window.GRBL_MATERIALS`. Também é artefato de build (`build:materials`).
5. `esbuild` **empacota o parser de G-code** do preview em `public/preview.js`
   (iife, `global-name=GRBL_PREVIEW`) a partir de `shared/preview.ts`. Mesmo
   padrão dos perfis; expõe `window.GRBL_PREVIEW.parseGcode`. Artefato de
   build (`build:preview`).

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
```

Cobertura atual:

- `tests/protocol.test.ts` — parser de status, classificação de linhas, settings.
- `tests/grbl-client.test.ts` — fila send-response, progresso, alarmes,
  overrides, watchdog (com transporte falso).
- `tests/serial-integration.test.ts` — integração real de `SerialTransport` com
  um par de PTYs criado por `socat` (ignorado automaticamente se não houver socat).
- `tests/image-adjust.test.ts` — cinza/alfa, ajustes, Floyd–Steinberg.
- `tests/image-gcode.test.ts` — geometria, reamostragem e invariantes do
  emissor (área de trabalho, limites de `S`, `G0` sem `F`, precisão).
- `tests/image-contour.test.ts` — traçador de contorno (RF-IMG-6): padrões,
  furos, canto de sela, simplificação RDP, mapeamento px → mm e invariantes.
- `tests/file-filters.test.ts` — filtros dos diálogos nativos, detecção de
  extensão (maiúsculas/minúsculas) e MIME da imagem.

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
| **quality** | `npm ci` → `lint` (Biome) → `typecheck` → `test` (Vitest, com `socat` instalado para o teste PTY) → `build`. |
| **smoke** | `npm ci` → `build` → smoke headless do Electron sob `xvfb`. |

Rode a mesma sequência localmente antes de comitar:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Emulador GRBL (testes manuais sem hardware)

Crie um par de PTYs e converse com ele por um script simples:

```bash
socat -d -d pty,raw,echo=0 pty,raw,echo=0
# Anote os dois /dev/pts/N exibidos; conecte o app em um deles.
```

Um "GRBL falso" mínimo (responde `ok` a cada linha e emite status) pode ser
escrito em Node e ligado à outra ponta do PTY. Ver a skill
`.opencode/skills/grbl-protocol/`.

## Estrutura

```
src/
├── main/
│   ├── index.ts              # bootstrap Electron + smoke test
│   ├── ipc.ts                # handlers IPC tipados
│   └── services/
│       ├── SerialTransport.ts  # I/O serial (serialport)
│       └── GrblClient.ts       # protocolo: fila send-response, status, overrides
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
- Comandos de tempo real **sem `\n`**; envio sempre send-response.
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
- O AppImage não traz ícone personalizado ainda: adicione uma imagem em
  `build/icon.png` (256×256 ou maior) para o atalho do desktop ser vinculado
  à janela (`desktopName`/`syncDesktopName` já configurados).
- Flatpak fica como “Could” no plano (após v1.0), por exigir `flatpak-builder`
  e um runtime dedicado.

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
