# GRBL Studio — Diretrizes de Design e Interface

- **Versão:** 1.0
- **Última atualização:** 2026-10-16
- **Princípio:** **Aparência Windows 11 (Fluent Design), performance de app nativo, precisão de instrumento.**

> Este documento define a identidade visual e os limites técnicos de UI/UX.
> Ele vincula o [PRODUCT_SPEC.md](PRODUCT_SPEC.md) (RNF) e
> [PLANO_DE_ACAO.md](PLANO_DE_ACAO.md) (tarefas) ao padrão de qualidade desejado.

---

## 1. Objetivo

O GRBL Studio deve **parecer um aplicativo do Windows 11** (Fluent Design 2),
rodando no Linux — com visual limpo, moderno e *familiar* para quem usa o
Windows — mantendo-se **rápido, leve e preciso**:

| Pilar | Significado |
| :--- | :--- |
| **Bonito/familiar** | Fluent 2: cantos arredondados, materiais Mica/Acrylic, cor de destaque, animações suaves, ícones Segoe/Fluent. |
| **Rápido** | Resposta em ≤ 100 ms, UI nunca bloqueada, startup ≤ 1,5 s. |
| **Leve** | ≤ 200 MB de RAM, CPU ociosa ≈ 0 %, sem frameworks pesados no renderer. |
| **Preciso** | Valores com decimais exatos (0,001 mm), DPI/fractional scaling impecáveis, feedback de estado sem ruído. |

---

## 2. Sistema Fluent (Windows 11) — o que adotar

### 2.1 Fundamentos

| Elemento | Padrão Windows 11 | Uso no GRBL Studio |
| :--- | :--- | :--- |
| **Cantos** | Cards 8 px · janelas/controles 4 px · botões 4 px | Tudo com `border-radius: 4px` (botões) e `8px` (cards/painéis) |
| **Tipografia** | Segoe UI Variable (12/14/20/40/68 px) | Fallback: `Inter`/`system-ui`; 14 px base, 12 px legenda, 20 px título |
| **Espaçamento** | Grade de 4 px (4/8/12/16/24/32) | Tokens `--sp-1..8` |
| **Bordas** | 1 px `CardStrokeDefault` | `rgba(255,255,255,0.06)` no escuro, `rgba(0,0,0,0.08)` no claro |
| **Sombras** | Levíssimas, de 3 camadas | `0 1px 2px rgba(0,0,0,.10)` + `0 0 1px rgba(0,0,0,.20)` |
| **Cor de destaque** | Accent color do sistema | Azul Fluent `#0078D4` (claro) / `#4CC2FF` (escuro), ou cor de acento do sistema via `AccentColor` |
| **Ícones** | Fluent System Icons (SVG) | SVG inline, stroke 1.5 px, 20 px (16/24/32 var.) |
| **Controles** | Botões com estados Normal/Hover/Pressed/Disabled | Todos com os 4 estados (hover usa fill ligeiramente mais claro) |

### 2.2 Materiais (Windows 11)

- **Mica** — fundo da janela: camada de cor suave com base no fundo da área de
  trabalho. **No Linux/Electron, approximar com gradiente estático de baixo custo**
  (não usar `backdrop-filter` na janela inteira — ver §4).
- **Acrylic** — usada apenas em painéis flutuantes (menus, dropdowns, toasts):
  `backdrop-filter: blur(30px)` + `saturate(150%)` **apenas nesses elementos**.
- **Smoke** — overlay modal/escurecimento de fundo: `rgba(0,0,0,0.3)`.

### 2.3 Temas (RF-APP-1)

O app traz **11 temas** em três variantes, escolhidos no menu **Exibir** — no
submenu **Tema** ou em **Aparência e idioma…** (que também traz o idioma e a
pasta de arquivos). A escolha persiste em `prefs.theme` e é validada por
`isThemeId` (`shared/themes.ts`).

| Variante | Ids (`html[data-theme]`) | Notas |
| :--- | :--- | :--- |
| **Claro** (5) | `light`, `solarized-light`, `sand`, `arctic`, `silver` | `light` é o Fluent claro (`#F3F3F3`/`#0078D4`) |
| **Escuro** (4) | `dark`, `midnight`, `solarized-dark`, `oled` | `dark` é o **padrão** (`#202020`/`#4CC2FF`); `oled` usa preto puro |
| **Alto contraste** (2) | `hc-black`, `hc-white` | WCAG AAA; cores sólidas, `outline: 3px` no foco, `--shadow-*: none` |

Paleta de referência do tema padrão:

| | Escuro (`dark`, padrão) | Claro (`light`) |
| :--- | :--- | :--- |
| Fundo app | `#202020` | `#F3F3F3` |
| Fundo card | `#2B2B2B` | `#FFFFFF` |
| Texto primário | `#FFFFFF` | `#1A1A1A` |
| Texto secundário | `#A0A0A0` | `#5D5D5D` |
| Acento | `#4CC2FF` | `#0078D4` |
| Erro/Alarme | `#FF5C5C` | `#C42B1C` |
| Sucesso/Idle | `#6CCB5F` | `#0F7B0F` |

> Adotar variáveis CSS (`--bg`, `--text`, `--accent`…) em um único arquivo
> `tokens.css`, respeitando também o acento do sistema se detectado.
> `data-theme` é aplicado no `<html>` antes do primeiro paint (sem flash).

### 2.4 Layout recomendado (janela 1200×800)

```
┌───────────────────────────────────────────────────────────────┐
│ Title bar (custom, com controles estilo Win11)                │
├──────┬────────────────────────────────────────┬───────────────┤
│      │                                        │  MÁQUINA      │
│ NAVE │   PREVIEW 2D (canvas)                  │  ────────     │
│ (nav │   ─ zoom/pan + crosshair de posição    │  Estado       │
│  rail│                                        │  X/Y/Z DRO    │
│ 200px│                                        │  Feed/S       │
│      │                                        │  Progresso    │
│      ├────────────────────────────────────────┤  Overrides    │
│      │ CONSOLE (log) ──── input de comando    │  ────────     │
└──────┴────────────────────────────────────────┴───────────────┘
  Rail: Conexão · Arquivo · Jog · Config · Imagem · Sobre
```

- **Nav rail** (esquerda) com ícones + rótulo, estilo Windows 11.
- **Cards** agrupando: conexão, jog, arquivo, status.
- **DRO** (Digital Read Out) da posição em fonte monoespaçada (`tabular-nums`),
  3 casas decimais alinhadas à direita — como um instrumento de medição.
- Botões principais (Play/Pause/Stop) ancorados e nunca escondidos.

---

## 3. Números que definem "rápido, leve e preciso"

### 3.1 Performance (RNF obrigatórios)

| Métrica | Orçamento | Como medir | Medido (17/10/2026) |
| :--- | :--- | :--- | :--- |
| Tempo de startup (janela pronta) | ≤ 1,5 s | `performance.now()` no bootstrap | SMOKE_OK (~1,2 s) |
| Memória residente (RAM) | ≤ 200 MB após 10 min | `process.memoryUsage()` / `ps` | a medir em hardware |
| CPU ociosa (sem job) | ≈ 0 % | DevTools Performance | a medir |
| Resposta a clique/tecla | ≤ 100 ms | DevTools Performance (interaction) | a medir |
| Atualização de status (`?`) | ≤ 200 ms de latência | Timestamp no parser → paint | a medir |
| Frame rate da UI durante job | ≥ 55 fps | DevTools Rendering FPS meter | a medir |
| Render do preview (50k linhas) | ≤ 2 s no primeiro desenho; **≤ 16 ms por quadro durante o job** (camadas em cache) | `performance.now()` no draw / `npm run bench:preview` | **3 ms** (quente, 270k trechos) vs 300 ms antes |
| Abertura da janela | < 3 reflows principais | DevTools Layout Shift | a medir |

### 3.2 Precisão (o que não pode errar)

| Área | Exigência |
| :--- | :--- |
| **DRO / posição** | 3 decimais mm (0,001 mm), nunca valores truncados ou *jitter* visual (usar `tabular-nums`, largura fixa). |
| **Escala DPI** | Correto em 100 %/125 %/150 %/200 %, sem pixel blur em ícones (SVG) e sem sub-pixel fuzz no texto. |
| **Frações de pixel** | Canvas do preview desenhado com `devicePixelRatio` (câmera retina) — linhas nítidas em escala fracionária. |
| **Zoom do preview** | Zoom contínuo/preciso, com nível exato exibido (ex.: 137 %); pan sem "vai e vem" de 1px. |
| **Arredondamento** | Nunca arredondar valores de comando G-code (enviar a precisão original do arquivo). |
| **Conversão imagem → G-code** | Posição gerada sempre dentro da área de trabalho; S limitado a `S-min`/`S-max` reais da máquina. |
| **Teclado/DPI do jog** | Valores de passo exatos (0,01 / 0,1 / 1 / 5 / 10 / 50 mm) sem ruído de ponto flutuante. |

### 3.3 Sensação de leveza (regras)

1. **Nada de blur generalizado** — `backdrop-filter` só em overlays pequenos.
2. **Animações só com CSS/GPU** — `transform`/`opacity`, nunca `width/top/left`.
3. **Sem `setState` a cada byte serial** — throttling de UI para ~10–20 Hz
   (a 100 % de updates o app trava apesar de "não dever").
4. **Canvas, não DOM**, para preview e para o log (log renderizado com
   *virtual scrolling* — consoles longos são a causa nº 1 de travamento).
5. **Lazy**: carregar módulos de imagem/vetorização sob demanda.
6. **Zero timers órfãos**; polling `?` pausado quando desconectado.
7. **Preview em camadas** — a camada **estática** (área de trabalho + `G0` +
   queima) é pintada uma vez por (programa, vista, tamanho, dpi, tema) e o
   **trecho executado é incremental**; por quadro só há dois `drawImage` e o
   crosshair. Repintar o caminho inteiro a cada status custava ~300 ms/quadro
   num raster de 270 mil trechos e **roubava CPU do envio** (a máquina travava
   no meio do movimento). Orçamento: **≤ 16 ms por quadro** (cache quente).
8. **Altura da barra de status fixa** (`flex-wrap: nowrap` + `min-height`):
   progresso/DTG/restante mudam de largura durante o job; se a barra quebrasse
   linha, o preview (`flex: 1`) encolheria e o desenho “pulsaria”. Em janelas
   estreitas, some o menos crítico (Restante `≤ 1040 px`, “Para ir” `≤ 980 px`)
   antes de espremer o DRO.

---

## 4. Animações e micro-interações (Fluent)

| Interação | Animação | Duração / easing |
| :--- | :--- | :--- |
| Hover de botão | fill ligeiramente mais claro | 150 ms `cubic-bezier(.33,0,.67,1)` |
| Clique | leve `scale(0.98)` | 80 ms |
| Troca de painel/taba | fade + slide 8 px | 200 ms |
| Dropdown/tooltip | fade + Y 4 px | 150 ms |
| Toggle | thumb desliza | 200 ms `ease-out` |
| Toast/snackbar | slide do canto | 250 ms, some após 3–5 s |
| **Estado de conexão** | pulso do badge (Idle→Run) | 1×/s, apenas quando ativo |
| **Progresso do job** | barra linear com transição | 100 ms |

> **Regra:** toda animação deve poder ser reduzida (`prefers-reduced-motion`)
> e **nunca** deve competir com o feedback do job.

---

## 5. Acessibilidade e controle

- Contraste mínimo **4.5:1** (texto) / **3:1** (UI) — WCAG AA.
- Foco visível com anel de 2 px na cor de acento (padrão Win11).
- Alvo de toque/clique mínimo **32×32 px** (40 px nos botões do jog).
- Todo botão crítico (Stop) é acionável por teclado (`Esc`/`Ctrl+X`) e
  **não desaparece** ao mudar o layout.
- Atalhos documentados na UI (tooltip com a tecla).
- Códigos de cor redundantes com texto no estado (Idle/Run/Hold/Alarm).

---

## 6. Sistema de tokens (arquivo único)

```css
:root {
  /* cores */   --bg, --bg-card, --text, --text-sub, --accent, --danger, --ok
  /* espaço */  --sp-1:4px  --sp-2:8px  --sp-3:12px  --sp-4:16px  --sp-6:24px
  /* raio */    --r-sm:4px  --r-md:8px  --r-pill:999px
  /* sombra */  --shadow-1, --shadow-2
  /* tipo */    --font-ui, --font-mono, --fs-12/14/20
  /* motion */  --dur-fast:80ms  --dur:150ms  --ease:cubic-bezier(.33,0,.67,1)
}
```

- Um único arquivo `tokens.css` é a **fonte da verdade visual**.
- Temas = troca de variáveis, zero CSS duplicado: cada tema é um bloco
  `html[data-theme="<id>"] { … }` que **só sobrescreve** os tokens (§2.3 —
  11 temas). O picker lê `shared/themes.ts` (`THEMES`), a mesma fonte usada pelo
  `PrefsStore` e pelo menu nativo.
- Isso também é o que garante **leveza**: sem lib de UI pesada; se um framework
  de componentes for usado (ADR-2), escolher o **Fluent para React**
  (`@fluentui/react-components`) apenas se o orçamento de RAM/perf for cumprido.

---

## 7. Tela por tela (o que o usuário vê)

| Tela | Conteúdo | Estilo |
| :--- | :--- | :--- |
| **Conexão** | Porta, baud, botão Conectar, badge de estado | Card + botão acento |
| **Jog** | Cruz X/Y/Z, passos, velocidade, Home/Set Origin/Unlock/Reset | Grade de botões 40 px, ícones Fluent |
| **Arquivo** | Nome, linhas, tempo estimado, Play, progresso; Pausar/Retomar/Cancelar na **barra flutuante** (sempre visível no job) | Barra de progresso + botões âmbar/verde/vermelho |
| **Preview** | Canvas 2D + crosshair (posição de trabalho) + zoom/pan + caixa de trabalho; trecho gravado colorido **por passada** e brilho proporcional ao `S` | Fundo `#202020`, caminho corte `#4CC2FF`, rápido `#5D5D5D` |
| **Posicionar** | Jog + **Definir origem** + **Contorno** (laser bem fraco) + **Marcar centro** (laser desligado) + **Conectar/Desconectar** + parâmetros (potência/velocidade/passadas) + **Gravar** | Diálogo em duas colunas (sem rolagem): “Mover a cabeça” (pad + origem) e “Conferir a área” (contorno/centro + parâmetros); rodapé com status + Conectar + Cancelar/Gravar. Em imagem os parâmetros regeram a conversão; em desenho alimentam a prancheta e regeram o G-code; em arquivo já estão prontos. |
| **Desenhar** | Prancheta em mm com réguas, caixa de ferramentas (seleção, retângulo, elipse, linha, texto, excluir) e barra de propriedades: X/Y/L/A/R + **potência/velocidade do objeto** + alinhamento + ordem Z + agrupar; painéis Objetos / Documento / Gravação | Modal de tela cheia com grade, snap e zoom (roda do mouse, `F`, `0`); **Gerar e visualizar** pergunta o tamanho da arte, abre o posicionamento (contorno/centro/parâmetros) e grava; parâmetros de gravação e do último texto são lembrados entre sessões |
| **Console** | Log virtualizado (enviado / resposta / erro) com cores | Mono, scroll automático com pausa |
| **Config** | Tabela `$$` editável + ajuda contextual | Tabela Win11 com header fixo e linhas zebra |
| **Imagem** | Pipeline: imagem → ajustes → modo → parâmetros → gerar; **Bidirecional** e **Velocidade no claro (×)** no grupo Gravação; aviso quando a velocidade passa de `$110`/`$111` | Stepper estilo Win11 |
| **Status** | Estado, DRO, feed/S, overrides, alarmes | Card direito, sticky |

---

## 8. Checklist de aceite visual

- [ ] Parece um app do Windows 11 ao lado de um (cantos, sombras, acento, tipografia).
- [ ] Os 11 temas trocam sem flash (aplicados antes do primeiro paint) e persistem.
- [ ] Temas de alto contraste (`hc-black`/`hc-white`) mantêm foco visível e contraste AAA.
- [ ] Rodapé (nome · versão · WerneckLab) e modal **Sobre** exibem a versão real do app.
- [ ] Nenhuma animação cai abaixo de 55 fps com um job rodando.
- [ ] DRO estável em 0,001 mm sem "piscar".
- [ ] Escala 125 %/150 % sem texto/ícone borrado.
- [ ] RAM ≤ 200 MB após 10 min; CPU ociosa ~0 %.
- [ ] `prefers-reduced-motion` desliga animações não essenciais.
- [ ] Todos os componentes possuem estados Normal/Hover/Pressed/Focused/Disabled.
