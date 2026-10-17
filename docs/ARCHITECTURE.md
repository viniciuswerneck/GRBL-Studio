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
│  │ GrblClient   │  │ SettingsStore│  │ file:save/open     │  │
│  │ (protocolo)  │  │              │  │ (dialog + fs)      │  │
│  └──────┬───────┘  └──────────────┘  └────────────────────┘  │
│         │                                                     │
│  ┌──────▼───────┐                                             │
│  │ SerialTransport │ ── USB/Serial ──▶ Gravadora (firmware GRBL) │
│  └──────────────┘                                             │
└───────────────────────────────────────────────────────────────┘
```

**Princípios**

1. **UI não bloqueia**: envio e parsing ficam no main; a conversão
   imagem → G-code roda em um **Web Worker** no renderer
   (`src/renderer/gcode.worker.ts`) sobre funções puras em `src/shared/image/*`.
2. **Protocolo isolado da UI**: `GrblClient` e o parser são puros e testáveis.
3. **IPC tipado**: canais explícitos, payloads validados, nada de `invoke` genérico.
4. **Segurança**: `nodeIntegration: false`, `contextIsolation: true`, superfície IPC mínima.

---

## 2. Camadas e responsabilidades

### Renderer (frontend)

- **Alvo:** TypeScript + framework leve (Svelte/React) via `electron-vite`
  (ver ADR-2 no plano).
- **Atual:** `public/index.html` + `public/renderer.js` + `public/style.css`
  (vanilla JS). A aparência vem de tokens (`public/tokens.css`) com **11 temas**
  (RF-APP-1); os textos são aplicados por i18n (`data-i18n*` → `public/i18n.js`).
- Responsável por: interface, entrada do usuário, DRO/estado, console,
  preview 2D (canvas), formulários de configuração e importação.
- **Abertura de arquivos** é feita por diálogos nativos no main
  (`file:open-image` / `file:open-gcode`), com filtros tipados em
  `shared/fileFilters.ts` — o `<input type=file>` foi removido para garantir
  filtro consistente e nenhum caminho vindo do renderer.
- Cada ação desabilitada explica o motivo na UI (`#runHint`, `#portHint`,
  `title` + texto do passo em "Imagem → G-code"), já que o fluxo tem 3 etapas
  (escolher imagem → gerar G-code → conectar e enviar).
- **Worker de imagem** (`src/renderer/gcode.worker.ts` → `public/gcode.worker.js`
  via esbuild): executa `shared/image/*` fora da thread principal (ADR-7) e
  devolve o G-code mais a grade processada para o preview.

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
| `services/TcpTransport` | Transporte WiFi/serial-over-network (ESP8266) sobre TCP (RF-CON-7). | ✅ |
| `services/GrblClient` | Fila de envio (janela por bytes), `ok`/`error`, tempo real, overrides, status. | ✅ |
| `shared/protocol.ts` | Parser de status/`$$`/erros/alarmes (funções puras). | ✅ |
| `shared/channels.ts` | Nomes de canais IPC (fonte única). | ✅ |
| `services/PrefsStore` | Persistência em `<userData>/prefs.json` (ADR-6): porta, baud, tema, idioma, unidades, macros. | ✅ |
| `shared/appInfo.ts` | Identidade do app (nome, autor, licença, URLs) + whitelist de links externos. | ✅ |
| `main/menu.ts` | Menu nativo (Exibir/Tema/Idioma/Ajuda→Sobre) montado no idioma ativo. | ✅ |
| `ipc.ts` (`file:save-gcode`) | Diálogo nativo e escrita do `.gcode` gerado pela UI. | ✅ |
| `ipc.ts` (`file:open-image` / `file:open-gcode`) | Diálogos nativos de abertura; devolvem nome + bytes/texto (nunca deixam o renderer informar caminho). | ✅ |
| `shared/fileFilters.ts` | Filtros dos diálogos e validação de extensões (funções puras). | ✅ |
| `shared/i18n/*` | Catálogos pt-BR/en/es, `t()`/`detectLocale`/`slugify` (puros) e `applyDom` (renderer). | ✅ |
| `shared/themes.ts` | Catálogo dos 11 temas (id, variante, rótulo i18n, amostra). | ✅ |

### Imagem → G-code (Fase 5)

| Módulo | Responsabilidade | Status |
| :--- | :--- | :--- |
| `shared/image/adjust.ts` | Cinza (alfa composto sobre branco), brilho, contraste, white clip, inversão, B&W. | ✅ |
| `shared/image/dither.ts` | Floyd–Steinberg e limiar (1-bit). | ✅ |
| `shared/image/raster.ts` | Geometria da varredura (linhas/mm, direção, ponto) + reamostragem bilinear. | ✅ |
| `shared/image/gcode.ts` | Emissão M3/M4, `S` limitado a `[sMin, sMax]`, gaps com `G0`, invariantes de área. | ✅ |
| `shared/image/format.ts` | Utilitários dos emissores: `formatCoord` (3 decimais), `MAX_S` e invariante da área de trabalho. | ✅ |
| `shared/image/contour.ts` | Traçado de contornos (arestas + resolução de sela) e simplificação RDP (RF-IMG-6). | ✅ |
| `shared/image/vector.ts` | Emissão de G-code de recorte (contorno fechado a `sMax`) + grade de preview binária (RF-IMG-6). | ✅ |
| `renderer/gcode.worker.ts` | Executa o pipeline fora da thread principal (ADR-7). | ✅ |

---

## 3. Comunicação serial e protocolo

- Biblioteca: **`serialport`**.
- Terminador de linha: `\n`.
- **Streaming com janela por bytes (contagem de caracteres):** até o tamanho do
  buffer RX do GRBL (de `[OPT:…]`; 128 bytes por padrão) de linhas sem `ok`; cada
  `ok` libera espaço (ADR-4). Esperar cada `ok` — send-response puro — esvaziava
  o buffer da máquina quando o PC estava ocupado. Consultas (`$$`, `$I`) só vão
  com a janela vazia.
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
| Preferências | main (`PrefsStore`) | Porta/baud padrão, tema, idioma, unidades, macros. |

---

## 6. Diferenças: atual × alvo

| Aspecto | Atual | Alvo |
| :--- | :--- | :--- |
| Renderer | Vanilla JS (TS + framework planejado) | TS + framework (electron-vite) |
| Protocolo | ✅ `GrblClient` + `shared/protocol.ts` testáveis | (concluído) |
| Envio | ✅ Fila com janela por bytes (contagem de caracteres) + `ok` | (concluído) |
| Feedback da serial | ✅ Eventos IPC tipados | (concluído) |
| Comandos de tempo real | ✅ Bytes únicos corretos | (concluído) |
| Status/alarmes | ✅ Polling `?` + parser de alarmes | (concluído) |
| Persistência | ✅ `<userData>/prefs.json` (`PrefsStore`) | (concluído) |
| Imagem → G-code | ✅ Web Worker + `shared/image/*` | Perfis de material (RF-IMG-8) ✅ |
| Config `$$` | ✅ Viewer/editor + `$#`/`$I`/`$G` | (concluído) |
| Preview 2D | ✅ Canvas (grid + contornos) | (concluído) |
| i18n | ✅ pt-BR/en/es (`shared/i18n/*` + `public/i18n.js`) | (concluído) |
| Temas | ✅ 11 temas (`shared/themes.ts` + `tokens.css`) | (concluído) |

---

## 6.1 i18n e temas (RF-APP-1/2/6/7)

- **Catálogos puros** em `src/shared/i18n/{pt-BR,en,es}.ts` (chave → texto).
  `en`/`es` são declarados com `satisfies Record<keyof typeof ptBR, string>`:
  o type-check recusa chave faltando ou sobrando (paridade garantida em 484
  chaves, reforçada em `tests/i18n.test.ts`).
- **Núcleo compartilhado** (`shared/i18n/index.ts`): `t(key, params)`,
  `hasKey`, `setLocale`/`getLocale`, `detectLocale(systemLocale)`, `slugify`.
  É importável pelo main (menu, diálogos, mensagens de alarme) e pelo renderer.
- **Bundle do renderer**: `shared/i18n/entry.ts` é empacotado pelo esbuild em
  `public/i18n.js` (IIFE global `GRBL_I18N`, sem dependências). O DOM é
  traduzido por `applyDom()` via atributos `data-i18n`, `-title`, `-placeholder`,
  `-aria` (CSP `script-src 'self'`: nada de inline).
- **Idioma**: `prefs.lang` (validado por `isLang`); sem preferência,
  `detectLocale(app.getLocale())` escolhe pt-BR/en/es na 1ª execução. Trocar o
  idioma re-traduz a UI e remonta o **menu nativo** (`rebuildMenu`).
- **Temas**: `shared/themes.ts` é a fonte única (11 ids, variante, rótulo i18n,
  amostra). O renderer aplica `html[data-theme]`; `tokens.css` só sobrescreve
  variáveis por tema (§DESIGN). `prefs.theme` é validado por `isThemeId`.
- **Identidade/links** (`shared/appInfo.ts` + IPC `app:info`): a versão vem de
  `app.getVersion()` (nunca hardcoded no renderer) e alimenta o rodapé e o modal
  **Sobre**. `app:open-external` só abre `https:` de hosts na whitelist
  (`isAllowedExternalUrl`) via `shell.openExternal`.

---

## 7. Padrões de código

- **TypeScript estrito** em main, preload e renderer.
- Lógica de protocolo/parsing em funções puras (fáceis de testar).
- IPC sempre tipado; nomes de canal em um único lugar (`shared/channels.ts`).
- Textos de UI **nunca hardcoded** no renderer/menu: sempre por chave i18n
  (`t('…')` ou `data-i18n`), com o pt-BR como fonte da verdade das chaves.
- Sem lógica de negócio dentro de handlers de UI.
- Lint + format com **Biome** (`biome.json`; `npm run lint`) no CI. A stack
  ESLint + `typescript-eslint` é inviável com o TypeScript 7 (compilador
  nativo, sem API JS) — por isso Biome, que traz parser próprio.
