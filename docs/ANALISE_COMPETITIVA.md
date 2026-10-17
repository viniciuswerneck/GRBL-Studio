# GRBL Studio — Análise: pontos fortes, fracos, melhorias e concorrência

> Análise do estado do app em 17/10/2026 (branch `main`, tag `v0.4.0`).
> Fontes: `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/PLANO_DE_ACAO.md`,
> `docs/FEATURES_COMPARISON.md`, `docs/DESIGN.md`, código em `src/` e `public/`,
> além de pesquisa pública sobre LaserGRBL, LightBurn, Meerk40t, UGS e bCNC.

---

## 1. Resumo executivo

**GRBL Studio** é um controlador de gravadoras/cortadoras a laser com firmware
**GRBL 1.1**, nativo em **Linux**, gratuito e de código aberto, escrito em
**Electron + TypeScript**. Posiciona-se como a alternativa Linux ao LaserGRBL
(Windows-only) e como alternativa gratuita ao LightBurn (pago).

**Pontos fortes marcantes:** protocolo GRBL robusto e *testado* (234 testes),
pipeline de imagem → G-code acima da média do segmento (velocidade adaptativa,
zig-zague, fusão de trechos, S como intensidade no preview), i18n em 3 idiomas
com paridade garantida por type-check, 11 temas, segurança IPC correta e CI/CD
com release automática.

**Maiores lacunas vs. concorrentes:** ausência de ferramentas de desenho
vetorial, câmera, rotativa, simulação de job, importação SVG/ DXF, suporte a
macOS/Windows e auto-update. O renderer ainda é vanilla JS (framework planejado).

---

## 2. Posicionamento

| Atributo | GRBL Studio |
| :--- | :--- |
| Público-alvo | Hobbyistas e pequenos ateliês com gravadora GRBL (ex.: Sculpfun, Ortur, AtomStack) em **Linux**. |
| Preço | Gratuito, código aberto (GPLv3 planejada, ver LaserGRBL). |
| Sistemas | **Linux** (AppImage + deb + Flatpak scaffold). Sem macOS/Windows nativos hoje. |
| Controladores | **Somente GRBL** (1.1). |
| Idiomas | pt-BR, en, es (484 chaves, paridade por type-check). |
| Temas | 11 (claro/escuro, Fluent/Windows 11). |

---

## 3. Pontos fortes

### 3.1 Protocolo e comunicação (diferencial técnico)
- **Envio por janela com contagem de caracteres** (até o buffer RX do GRBL lido
  de `[OPT:…]`), evitando tanto o travamento por buffer quanto a fome de linhas
  quando a CPU está ocupada (medição: 63 → 427 linhas/s com latência de 16 ms).
- **Comandos de tempo real corretos** (`?`, `!`, `~`, `0x18`, `0x90–0x94` sem
  `\n`) — erro clássico de implementações amadoras.
- **Cache de WCO** para posição de trabalho estável; DTG ("para ir"); status
  report com overrides de feed/spindle/rapid.
- **Alarmes decodificados com ação recomendada** (`alarmSolution`), bloqueio de
  comandos em alarme, histórico persistente.

### 3.2 Pipeline de imagem → G-code (acima da média do segmento)
- Conversão line-to-line e dithering (Floyd–Steinberg), vetorização por contorno
  (RDP), ajustes (brilho, contraste, white clip, inversão, B&W).
- **Velocidade adaptativa** (dose = S ÷ velocidade), **varredura bidirecional**
  (zigue-zague), **pulo de linhas brancas**, **fusão de trechos** com mesmo
  `S`/`F`, `M5`/rearme apenas quando o laser estava ligado.
- Perfis de material para a COMGO Z1 (3 W/5 W/10 W) e compensação do ponto.
- Aviso quando a velocidade pedida (com a velocidade no claro) passa de
  `$110`/`$111` da máquina.

### 3.3 Preview e UX
- Preview 2D em canvas com **zoom/pan**, área de trabalho tracejada, crosshair
  seguindo a posição de trabalho (WPos), trecho executado **colorido por passada**
  e **brilho proporcional ao `S`** (a imagem aparece como será gravada).
- **Preview em camadas**: 300 ms → 3 ms por quadro com 270 mil trechos (a
  principal causa da "interferência do PC" foi eliminada).
- Barra de status de altura fixa (sem "pulsar" o preview durante o job).
- Modal "Posicionar a gravadora": contorno (laser fraco) + marcar centro
  (laser desligado).
- Job bar flutuante com Pausar/Retomar/Cancelar sempre visíveis; `Esc`/`Ctrl+X`
  = parada de emergência.

### 3.4 Qualidade de engenharia
- **234 testes** (Vitest) + 4 E2E (Playwright) + smoke test headless.
- IPC tipado, `contextIsolation: true`, `nodeIntegration: false`, protocolo
  isolado da UI, funções puras testáveis.
- i18n em 3 idiomas com paridade garantida por `satisfies` + type-check
  (484 chaves).
- 11 temas (tokens CSS, Fluent/Windows 11), modo básico/avançado (Assistente).
- CI (`ci.yml`) e release automática (`release.yml`) no GitHub Actions.

### 3.5 Empacotamento
- AppImage + .deb publicados automaticamente na tag `v*`; Flatpak em scaffold.

---

## 4. Pontos fracos e riscos

### 4.1 Funcionalidades ausentes (vs. concorrentes)
- **Sem ferramentas de desenho vetorial** (depende de software externo, como o
  LaserGRBL) — LightBurn e Meerk40t têm editor completo.
- **Sem importação SVG/DXF/AI/PDF** (apenas raster + G-code; a vetorização é
  por contorno de imagem, não por arquivo vetorial).
- **Sem câmera** (alinhamento visual do desenho na peça).
- **Sem rotativa (eixo A)**.
- **Sem simulação de job** (dry-run / playback visual do G-code).
- **Sem jobs multi-operação** (gravar + cortar numa mesma execução, por camadas).
- **Sem gerador de grade de teste de material** (material test grid).
- **Sem Z-axis no jog** (a UI expõe só X/Y).
- **Sem G-code editor** (edição inline, numeração de linhas, syntax highlight).
- **Sem auto-update** (electron-updater não ligado).

### 4.2 Plataforma e distribuição
- **Somente Linux** (não há build para macOS/Windows). Isso limita fortemente
  o público (LaserGRBL é Windows-only, mas LightBurn é tri-plataforma).
- Flatpak é apenas scaffold (🟡).
- Sem repositório apt/Homebrew; apenas AppImage/.deb avulsos.

### 4.3 Arquitetura e manutenção
- **Renderer em vanilla JS** (`public/renderer.js` enorme, ~4k linhas) enquanto
  o `src/` é TypeScript. O ADR-2 planeja Svelte/React via electron-vite, mas
  ainda não migrou. Isso dificulta refatoração e tipagem.
- **Bundles gerados** (`public/*.js`) exigem rebuild; atrito no desenvolvimento.
- **`FEATURES_COMPARISON.md` está desatualizado** (lista como "pendente" coisas
  já implementadas: `$$`, macros, WiFi, perfis) — confunde onboarding.
- Checklist visual `DESIGN.md` §8 (DPI/RAM/fps) não medido formalmente.
- Testes E2E mínimos (4 casos básicos); cobertura de fluxos de job/protocolo
  em E2E é inexistente.

### 4.4 Produto e escopo
- **Perfis de máquina só para a COMGO Z1** (3 W/5 W/10 W). Sem catálogo amplo
  (Ortur, AtomStack, Sculpfun S9/S10, xTool, etc.).
- **WiFi/TCP não validado em hardware** (🟡).
- **Validação em hardware real** ainda manual e limitada à C1 do autor.
- Sem telemetria/crash reporting (opt-in) — bugs de campo são difíceis de
  diagnosticar.

---

## 5. Melhorias recomendadas (por prioridade)

### Curto prazo (Fase 7 — polish)
1. **Medir e registrar** os orçamentos RNF-11/12 (startup ≤1,5 s, RAM ≤200 MB,
   ≥55 fps, DPI 100/125/150/200 %) — checklist `DESIGN.md` §8.
2. **Atualizar `FEATURES_COMPARISON.md`** para refletir o estado real (evita
   confusão de onboarding).
3. **Onboarding / guia de primeiros passos** (o Assistente já existe; falta um
   "tour" da UI).
4. **Auto-update** com `electron-updater` (AppImage/.deb).
5. **Publicar Flatpak** (scaffold já pronto).

### Médio prazo
6. **Z-axis no jog** + suporte a máquinas com Z.
7. **Importação SVG** (parser + conversão para paths) — a vetorização já existe
   para imagens; falta aceitar `.svg`.
8. **G-code editor** inline (syntax highlight, numeração, edição de linha).
9. **Simulação de job** (playback visual do caminho com tempo real).
10. **Grade de teste de material** (material test grid) — feature muito pedida
    no segmento.
11. **Jobs multi-operação** (camadas: gravar + cortar numa execução).
12. **Migração do renderer para TypeScript** (Svelte/React + electron-vite) —
    ADR-2; reduz o `renderer.js` de ~4k linhas e melhora testabilidade.

### Longo prazo
13. **Builds para macOS e Windows** (CI matrix) — maior expansão de público.
14. **Câmera** (captura USB + alinhamento visual).
15. **Rotativa (eixo A)**.
16. **Catálogo de perfis** de máquinas (Ortur, AtomStack, Sculpfun S9/S10,
    xTool, etc.) — hoje só COMGO Z1.
17. **Plugin/extension system** (macros já existem; generalizar).
18. **Preview acelerado** (WebGL) para arquivos gigantes (14 M de linhas, como
    no LaserGRBL).

---

## 6. Novos recursos sugeridos (roadmap)

| Recurso | Valor | Esforço | Observação |
| :--- | :--- | :--- | :--- |
| Auto-update (electron-updater) | Alto | Baixo | Já empacota AppImage/.deb. |
| Builds Win/macOS no CI | Muito alto | Médio | Aproveita o `release.yml`. |
| Importação SVG | Alto | Médio | Parser + paths; vetorização já existe. |
| Simulação de job | Alto | Médio | Reaproveita o preview + estimativa de tempo. |
| Grade de teste de material | Alto | Baixo | Feature "killer" para hobbyistas. |
| Z-axis no jog | Médio | Baixo | Infra já suporta `Z` no `GrblClient.jog`. |
| Câmera + alinhamento | Alto | Alto | USB capture + overlay no canvas. |
| Rotativa | Médio | Alto | Eixo A, cinemática. |
| Editor de G-code | Médio | Médio | Syntax highlight + numeração. |
| Catálogo de máquinas | Médio | Baixo | Dados estáticos + perfis. |
| Telemetria opt-in | Médio | Médio | Sentry/GlitchTip. |
| Plugins | Alto | Alto | Generaliza macros. |

---

## 7. Comparação com os principais concorrentes

### 7.1 Visão geral

| | **GRBL Studio** | **LaserGRBL** | **LightBurn** | **Meerk40t** | **UGS/Candle/bCNC** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Preço | Gratuito | Gratuito | US$ 60–199 | Gratuito | Gratuito |
| Código aberto | Sim | Sim (GPLv3) | Não | Sim | Sim |
| Linux nativo | **Sim** | Não (Wine) | Sim | Sim | Sim (Java) |
| macOS | Não | Não | Sim | Sim | Sim |
| Windows | Não | Sim | Sim | Sim | Sim |
| Controladores | GRBL apenas | GRBL | GRBL + Ruida + Trocen + galvo | K40 + GRBL + outros | GRBL/CNC genérico |
| Ferramentas de desenho | Não | Não | **Sim (completo)** | Sim (SVG) | Não |
| Câmera | Não | Não | Sim | Sim | Não |
| Rotativa | Não | Limitado | Sim | Sim | Não |
| Simulação de job | Não | Não | Sim (preview) | Sim | Limitado |
| Testes automatizados | **234 (Vitest) + E2E** | Não público | N/D | N/D | Limitado |

### 7.2 Onde o GRBL Studio ganha

1. **Linux nativo e gratuito** — LaserGRBL é Windows-only (Wine no Linux);
   LightBurn é pago. É o único controlador GRBL *nativo* em Linux com UI moderna.
2. **Pipeline de imagem acima da média** — velocidade adaptativa, zigue-zague,
   fusão de trechos, S como intensidade no preview, per-pass colors. LaserGRBL
   tem dithering/line-to-line/vectorização, mas sem essas otimizações de
   velocidade e sem preview por intensidade.
3. **Robustez de protocolo** — janela por bytes, realtime commands corretos,
   WCO cache, DTG, alarmes com ação recomendada, testes. Raro no segmento.
4. **UX moderna** — 11 temas, i18n em 3 idiomas, Fluent/Windows 11, modo
   básico/avançado (Assistente), job bar flutuante.
5. **Engenharia** — IPC tipado, `contextIsolation`, funções puras testáveis,
   CI/CD com release automática.

### 7.3 Onde o GRBL Studio perde

1. **Sem ferramentas de desenho** (LightBurn é all-in-one; Meerk40t tem SVG
   completo). O usuário precisa de Inkscape/Illustrator externo.
2. **Sem câmera** (LightBurn/Meerk40t) — alinhamento visual na peça.
3. **Sem rotativa** (LightBurn/Meerk40t).
4. **Sem simulação** (LightBurn/Meerk40t).
5. **Sem importação SVG/DXF/AI/PDF** (LightBurn/Meerk40t).
6. **Sem jobs multi-operação** (gravar + cortar numa execução; LightBurn tem
   layers).
7. **Sem grade de teste de material** (LightBurn tem gerador).
8. **Sem macOS/Windows** (LightBurn tri-plataforma; Meerk40t tri-plataforma).
9. **Sem auto-update**.
10. **Sem Z-axis no jog**.
11. **Catálogo de máquinas limitado** (só COMGO Z1; LaserGRBL/LightBurn
    suportam dezenas de marcas).

### 7.4 Posicionamento estratégico recomendado

**Nicho: "LaserGRBL para Linux, com qualidade de engenharia"** — gratuito,
nativo, focado em GRBL, com pipeline de imagem superior e UX moderna. Não
tentar competir com LightBurn em design/câmera/rotativa no curto prazo; em
vez disso, ser a melhor opção para quem usa Linux e quer um controlador
confiável e moderno, com interoperabilidade com Inkscape (importar SVG) como
ponte para design.

Prioridades para ampliar o público: **builds Win/macOS** (maior impacto),
**importação SVG**, **auto-update**, **grade de teste de material** e
**simulação de job**.

---

## 8. Conclusão

O GRBL Studio já é, em vários aspectos técnicos (protocolo, preview, pipeline
de imagem, i18n/temas, testes, CI), **superior ao LaserGRBL** e se aproxima de
parte da experiência do LightBurn — mas apenas no eixo "enviar e gravar" em
Linux. As lacunas que mais limitam adoção são **plataforma (só Linux)**,
**ausência de design tools/câmera/rotativa** e **importação SVG**. Atacar essas
três frentes (Win/macOS + SVG import + simulação) é o caminho de maior retorno
para transformar o app numa alternativa real ao LightBurn para hobbyistas.

---

*Gerado em 17/10/2026 com base no código e na documentação do repositório.*
