# GRBL Studio — Arquitetura

> Visão de arquitetura (**atual** e **alvo**). Para o plano de execução, veja
> [PLANO_DE_ACAO.md](PLANO_DE_ACAO.md); para requisitos, [PRODUCT_SPEC.md](PRODUCT_SPEC.md).

---

## 1. Visão geral

Aplicação **Electron + TypeScript** com a separação padrão em três processos,
isolados por `contextIsolation`:

```
┌──────────────────────────────────────────────────────────────┐
│ RENDERER (UI)                                                │
│  views · state · preview 2D · formulários                    │
│  fala com o main SOMENTE via window.grbl (preload)           │
└───────────────▲───────────────────────────┬──────────────────┘
                │ eventos IPC (push)         │ invoke IPC (request)
┌───────────────┴───────────────────────────▼──────────────────┐
│ PRELOAD (contextBridge)  — contrato tipado, sem Node exposto  │
└───────────────▲───────────────────────────┬──────────────────┘
                │                            │
┌───────────────┴────────────────────────────▼──────────────────┐
│ MAIN (Node/Electron)                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ GrblClient   │  │ SettingsStore│  │ image/ (worker)    │  │
│  │ (protocolo)  │  │                                 │  │  │
│  └──────┬───────┘  └──────────────┘  │ grayscale/dither   │  │
│         │                            │ vectorize/gcode    │  │
│  ┌──────▼───────┐                    └────────────────────┘  │
│  │ SerialTransport │ ── USB/Serial ──▶ Gravadora (firmware GRBL) │
│  └──────────────┘                                             │
└───────────────────────────────────────────────────────────────┘
```

**Princípios**

1. **UI não bloqueia**: envio, parsing e processamento de imagem ficam no main.
2. **Protocolo isolado da UI**: `GrblClient` e o parser são puros e testáveis.
3. **IPC tipado**: canais explícitos, payloads validados, nada de `invoke` genérico.
4. **Segurança**: `nodeIntegration: false`, `contextIsolation: true`, superfície IPC mínima.

---

## 2. Camadas e responsabilidades

### Renderer (frontend)

- **Alvo:** TypeScript + framework leve (Svelte/React) via `electron-vite`
  (ver ADR-2 no plano).
- **Atual:** `public/index.html` + `public/renderer.js` + `public/style.css`
  (vanilla JS, tema escuro).
- Responsável por: interface, entrada do usuário, DRO/estado, console,
  preview 2D (canvas), formulários de configuração e importação.

### Preload (ponte)

- Expõe `window.grbl` com métodos explícitos via `contextBridge`.
- É **empacotado** com esbuild (`dist/preload/index.js`) porque roda com
  `sandbox: true` e não pode usar `require` relativo.
- **Não** expõe `ipcRenderer` cru nem APIs Node.

### Main (Node/Electron)

| Módulo | Responsabilidade | Status |
| :--- | :--- | :--- |
| `main/index.ts` | Bootstrap da janela e ciclo de vida do app. | ✅ |
| `main/ipc.ts` | Handlers IPC tipados (wiring entre UI e serviços). | ✅ |
| `services/SerialTransport` | Abrir/fechar porta, *line framing*, erros, desconexão. | ✅ |
| `services/GrblClient` | Fila de envio (send-response), `ok`/`error`, tempo real, overrides, status. | ✅ |
| `shared/protocol.ts` | Parser de status/`$$`/erros/alarmes (funções puras). | ✅ |
| `shared/channels.ts` | Nomes de canais IPC (fonte única). | ✅ |
| `services/SettingsStore` | Persistência (`electron-store`): porta, baud, tema, unidades. | ⬜ Fase 3 |
| `services/image/*` | Imagem → grayscale/dithering/vetorização → G-code. | ⬜ Fase 5 |

---

## 3. Comunicação serial e protocolo

- Biblioteca: **`serialport`**.
- Terminador de linha: `\n`.
- **Streaming send-response:** envia uma linha e aguarda `ok`/`error:` antes da
  próxima (ADR-4). Otimização futura: *character-counting* com `Bf:`.
- **Comandos de tempo real** (bytes únicos, **sem `\n`**):
  `?` status · `!` feed hold · `~` resume · `0x18` reset · `0x90–0x94` override.
- **Parser de status:** `<Estado|MPos:…|WPos:…|FS:…|Ov:…|WCO:…>` → objeto tipado.

```
UI: Play ──▶ ipc ──▶ GrblClient.enqueue(lines)
                         │
                 ┌───────▼────────┐
                 │ fila de linhas │   (só avança ao receber "ok")
                 └───────┬────────┘
                         │ write("\n")
                 ┌───────▼────────┐
                 │ SerialTransport│──▶ GRBL
                 └───────┬────────┘
                         │ data / <status> / ok / error
                         ▼
              parser (shared/protocol) ──▶ eventos IPC ──▶ UI
```

---

## 4. Fluxo de um job

1. Usuário abre arquivo (G-code ou imagem → G-code).
2. Main valida, conta linhas e estima tempo; renderer desenha o preview.
3. Ao dar **Play**, o `GrblClient` enfileira as linhas e inicia o streaming.
4. Cada `ok` libera a próxima linha; a UI recebe progresso (`job:progress`).
5. Durante o job, o polling `?` atualiza estado/posição; overrides enviam bytes.
6. `error:`/`ALARM:` interrompem o job e notificam a UI com causa e ação.
7. Pause (`!`) → estado *Hold* → Resume (`~`) ou Stop (reset).

---

## 5. Estado da aplicação

| Estado | Onde vive | Descrição |
| :--- | :--- | :--- |
| Conexão | main + renderer | Conectado/desconectado, porta, baud. |
| Status GRBL | main (polling) → renderer | Idle/Run/Hold/Alarm/Home/Jog… |
| Posição / feed | main → renderer | MPos/WPos, FS, overrides. |
| Arquivo + progresso | renderer (+ main no envio) | Nome, linhas, linha atual, tempo. |
| Preferências | main (`SettingsStore`) | Porta/baud padrão, tema, unidades. |

---

## 6. Diferenças: atual × alvo

| Aspecto | Atual | Alvo |
| :--- | :--- | :--- |
| Renderer | Vanilla JS (TS + framework planejado) | TS + framework (electron-vite) |
| Protocolo | ✅ `GrblClient` + `shared/protocol.ts` testáveis | (concluído) |
| Envio | ✅ Fila send-response com `ok` | (concluído) |
| Feedback da serial | ✅ Eventos IPC tipados | (concluído) |
| Comandos de tempo real | ✅ Bytes únicos corretos | (concluído) |
| Status/alarmes | ✅ Polling `?` + parser de alarmes | (concluído) |
| Persistência | ⬜ Nenhuma | `electron-store` (Fase 3) |
| Imagem → G-code | ⬜ Não existe | Pipeline em worker (Fase 5) |
| Config `$$` | ⬜ Não existe | Viewer/editor (Fase 3) |
| Preview 2D | ⬜ Não existe | Canvas (Fase 4) |

---

## 7. Padrões de código

- **TypeScript estrito** em main, preload e renderer.
- Lógica de protocolo/parsing em funções puras (fáceis de testar).
- IPC sempre tipado; nomes de canal em um único lugar (`shared/channels.ts`).
- Sem lógica de negócio dentro de handlers de UI.
- Lint (ESLint) + format (Prettier) no CI.
