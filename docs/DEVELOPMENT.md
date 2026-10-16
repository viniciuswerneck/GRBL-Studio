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
npm run build        # tsc + empacota o preload com esbuild
npm run typecheck    # apenas verificação de tipos (tsc --noEmit)
npm run dev          # tsc em watch (main/preload/shared)
```

O `build` faz duas etapas:

1. `tsc` compila `src/**` para `dist/**` (main, preload, shared).
2. `esbuild` **empacota o preload** em `dist/preload/index.js`. Isso é
   necessário porque o preload roda com `sandbox: true` e não pode usar
   `require` relativo nem módulos Node.

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

### Smoke test (headless / CI)

Verifica que o app sobe e que o renderer carrega sem erros:

```bash
GRBL_SMOKE_TEST=1 npx electron --no-sandbox .          # com display
GRBL_SMOKE_TEST=1 xvfb-run -a npx electron --no-sandbox .   # headless
# Saída esperada: SMOKE_OK
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
├── shared/
│   ├── channels.ts           # nomes de canais IPC (fonte única)
│   ├── protocol.ts           # parser puro GRBL (testável)
│   └── types.ts              # tipos compartilhados
└── preload/
    └── index.ts              # contextBridge -> window.grbl (empacotado)
public/                       # renderer (html/css/js) + tokens.css
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
- Lint/format (ESLint + Prettier) ainda não configurado — pendente na Fase 0.
