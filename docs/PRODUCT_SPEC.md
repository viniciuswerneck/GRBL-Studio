# GRBL Studio — Especificação de Produto (Product Spec)

- **Versão do documento:** 1.0
- **Status:** rascunho para revisão
- **Última atualização:** 2026-10-16
- **Fontes:** documentação oficial do LaserGRBL (Usage), manual da COMGO Z1 (transcrito em `docs/comgo_z1_lasergrbl_user_manual.md`), especificação do protocolo GRBL v1.1.

---

## 1. Visão

Oferecer, no Linux, uma aplicação **nativa, moderna e confiável** para operar
gravadoras e cortadoras laser com firmware GRBL 1.1 — com a simplicidade do
LaserGRBL e a qualidade de experiência de um software desktop contemporâneo.

> **Resumo em uma frase:** o LaserGRBL que o usuário de Linux sempre quis, sem
> Mono, sem travamentos de UI e com envio de G-code confiável.

---

## 2. Problema e oportunidade

- O **LaserGRBL** é referência no Windows (C#/.NET), mas no Linux roda de forma
  precária via Mono/Wine, sem suporte oficial e com problemas de portas seriais,
  UI e empacotamento.
- Alternativas abertas no Linux (ex.: LaserWeb) são pesadas, focadas em web/browser
  e não reproduzem o fluxo "conectar → carregar → gravar" simples do LaserGRBL.
- O firmware **GRBL 1.1** é ubíquo em máquinas de baixo/médio custo (COMGO,
  AtomStack, Ortur, Sculpfun, TwoTrees etc.), criando um mercado grande com
  demanda por software desktop local.
- **Oportunidade:** ser o "LaserGRBL para Linux" — ou seja, paridade funcional nos
  recursos essenciais + distribuição nativa em `.AppImage`/`.deb`/`Flatpak`.

---

## 3. Público-alvo e personas

| Persona | Descrição | Necessidades principais |
| :--- | :--- | :--- |
| **Hobbista iniciante** | Primeira máquina laser, usa o manual do fabricante como guia. | Conectar fácil, importar imagem, apertar *Play*, não quebrar a máquina. |
| **Maker/prosumer** | Já usa LightBurn/LaserGRBL, quer controle fino. | Overrides em tempo real, edição de `$$`, preview, macros, múltiplos passes. |
| **Pequeno negócio** | Produção recorrente de peças. | Confiabilidade, retomada de job interrompido, perfis de material, estimativa de tempo. |
| **Entusiasta Linux** | Não aceita Wine/Mono. | Instalação nativa (AppImage/deb/Flatpak), integração com o desktop, código aberto. |

---

## 4. Proposta de valor

1. **Nativo em Linux** — Electron + TypeScript, sem camadas de compatibilidade.
2. **Envio G-code confiável** — protocolo *send-response* com confirmação `ok`,
   respeitando o buffer do GRBL (diferencial direto vs. MVP atual).
3. **Paridade com o essencial do LaserGRBL** — interface, jog, overrides, status,
   preview, import de imagem raster, configuração `$$`.
4. **Experiência moderna** — visual **estilo Windows 11 (Fluent Design 2)**:
   cantos arredondados, cor de acento, animações suaves, tema claro/escuro,
   atalhos de teclado, feedback claro de estado/alarme, i18n (pt-BR/en) — com
   orçamento de performance (≤ 1,5 s de startup, ≤ 200 MB de RAM) e precisão de
   instrumento (DRO em 0,001 mm). Ver `DESIGN.md`.
5. **Diagnóstico acessível** — console legível, mensagens de alarme com causa e
   solução (nos moldes do manual da COMGO).

---

## 5. Escopo

### 5.1 Dentro do escopo (produto-alvo)

- Conexão serial (USB) com GRBL 1.1 e 0.9.
- Console de comandos e log de retornos (`ok`, `error:`, `[MSG:]`, `ALARM:`).
- Jog manual (X/Y/Z) com controle de passo e velocidade.
- Carregar, validar, visualizar e **enviar** G-code com controle de fluxo.
- Controle de execução: Start, Pause (Feed Hold), Resume, Stop/Emergency, Reset.
- Status em tempo real (polling `?`), posição, feed/spindle, estimativa de tempo.
- Overrides de feed e potência (GRBL 1.1).
- Preview 2D do caminho com posição em tempo real (zoom/pan).
- Configuração GRBL: ler/editar/aplicar `$$`, ver `$#`, `$I`, `$G`.
- Importação de imagens (BMP/JPG/PNG/GIF): conversão em tons de cinza,
  *line-to-line*, *dithering* e vetorização — gerando G-code.
- Macros / botões customizados.
- Preferências persistentes (porta, baud, tema, unidades, pastas).
- Tema claro/escuro, unidades mm/pol.
- Empacotamento e distribuição para Linux.

### 5.2 Fora do escopo (por ora)

- Suporte a Windows/macOS (arquitetura não deve impedir, mas não é meta).
- Firmware GRBL customizado (ex.: parâmetros `$140` de giroscópio) — tratado
  apenas como comandos/valores genéricos de `$$`.
- CAM 3D / fresagem por eixo Z.
- Controle de câmera/visão computacional (avaliado como "Could", futuro).
- Edição vetorial completa (desenho/CAD) — não competimos com Inkscape/LightBurn.

---

## 6. Requisitos funcionais

Prioridade: **Must** / **Should** / **Could**. Status refere-se ao MVP atual.

### M1 — Conexão e transporte

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-CON-1 | Listar portas seriais disponíveis e atualizar a lista sob demanda. | Must | 🟡 |
| RF-CON-2 | Conectar/desconectar com baud rate selecionável (9600/115200/250000…). | Must | 🟡 |
| RF-CON-3 | Persistir última porta e baud usados. | Should | ⬜ |
| RF-CON-4 | Detectar desconexão inesperada e avisar o usuário. | Must | ⬜ |
| RF-CON-5 | Ao conectar, ler `$I`/`$G` e exibir firmware/estado inicial. | Should | ⬜ |
| RF-CON-6 | Reconexão automática opcional. | Could | ⬜ |
| RF-CON-7 | Conexão via WiFi/serial-over-network (ESP8266). | Could | ⬜ |

### M2 — Console e comandos manuais

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-CON-10 | Enviar qualquer linha de G-code/comando GRBL pelo console. | Must | 🟡 |
| RF-CON-11 | Exibir retornos da máquina (`ok`, `error:`, `[MSG:]`, `ALARM:`). | Must | ⬜ |
| RF-CON-12 | Diferenciar visualmente comandos enviados × respostas × erros. | Should | ⬜ |
| RF-CON-13 | Histórico de comandos (setas ↑/↓). | Should | ⬜ |
| RF-CON-14 | Auto-scroll com opção de pausar/limpar log. | Should | ⬜ |
| RF-CON-15 | Salvar/exportar log do console. | Could | ⬜ |

### M3 — Jog e movimento manual

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-JOG-1 | Jog em X+, X−, Y+, Y− (e Z quando aplicável) com passo configurável. | Must | 🟡 |
| RF-JOG-2 | Jog contínuo ao manter pressionado, com parada ao soltar. | Should | ⬜ |
| RF-JOG-3 | Controle de velocidade do jog. | Should | ⬜ |
| RF-JOG-4 | Homing (`$H`) com feedback de progresso/erro. | Must | 🟡 |
| RF-JOG-5 | Definir origem atual (`G92`/zero) e ir para zero (`G90 G0 X0 Y0`). | Must | ⬜ |
| RF-JOG-6 | Atalhos de teclado para jog (setas, Home, PageUp/Down). | Should | ⬜ |
| RF-JOG-7 | Jog diagonal usando modo jog dedicado do GRBL (`$J=`). | Should | ⬜ |

### M4 — Carregamento e execução de G-code

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-GC-1 | Abrir arquivos `.gcode/.nc/.tap/.txt` e imagens raster. | Must | 🟡 |
| RF-GC-2 | Exibir nome, nº de linhas, tamanho e tempo estimado. | Should | ⬜ |
| RF-GC-3 | **Streaming confiável** com confirmação `ok`/`error` e controle de buffer. | Must | ⬜ |
| RF-GC-4 | Iniciar (Play), Pausar (Feed Hold `!`), Retomar (`~`) e Parar (Reset). | Must | 🟡 |
| RF-GC-5 | Barra de progresso (linha atual / total) e tempo restante. | Must | ⬜ |
| RF-GC-6 | Múltiplos passes (repetir programa N vezes). | Should | ⬜ |
| RF-GC-7 | Retomada de job interrompido (do início, de linha específica ou N linhas antes). | Should | ⬜ |
| RF-GC-8 | Parada de emergência que interrompe o envio e para a máquina. | Must | 🟡 |
| RF-GC-9 | Validação/aviso de linhas perigosas e limites da área de trabalho. | Could | ⬜ |

### M5 — Status, alarmes e segurança

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-STA-1 | Polling de status `?` (5–10 Hz) e exibição do estado (Idle/Run/Hold/Alarm/Home/Jog/Door…). | Must | ⬜ |
| RF-STA-2 | Exibir posição atual (MPos/WPos) e distância para ir. | Must | ⬜ |
| RF-STA-3 | Exibir feed real e rotação/spindle (S) atuais. | Should | ⬜ |
| RF-STA-4 | Traduzir alarmes (`ALARM:Homing fail`, `Soft limit`, `Hard limit`…) com causa e solução. | Should | ⬜ |
| RF-STA-5 | Desabilitar comandos inválidos no estado de alarme. | Must | ⬜ |
| RF-STA-6 | Botões Unlock (`$X`), Reset (soft reset) e Homing (`$H`). | Must | 🟡 |
| RF-STA-7 | Registrar histórico de eventos/alarmes da sessão. | Could | ⬜ |

### M6 — Overrides

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-OVR-1 | Override de feed rate em tempo real (0x90–0x94). | Should | ⬜ |
| RF-OVR-2 | Override de potência/spindle em tempo real. | Should | ⬜ |
| RF-OVR-3 | Exibir valores de override ativos. | Should | ⬜ |
| RF-OVR-4 | Reset para 100% com um clique. | Could | ⬜ |

### M7 — Preview 2D

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-PRV-1 | Renderizar o caminho do G-code carregado em 2D. | Should | ⬜ |
| RF-PRV-2 | Zoom e pan (mouse + barra de rolagem). | Should | ⬜ |
| RF-PRV-3 | Indicador da posição atual da cabeça durante a execução. | Should | ⬜ |
| RF-PRV-4 | Exibir caixa delimitadora e área de trabalho da máquina. | Could | ⬜ |
| RF-PRV-5 | Distinguir movimentos de corte (`G1`) de rápidos (`G0`). | Could | ⬜ |

### M8 — Configuração do GRBL e preferências

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-CFG-1 | Ler e exibir todos os settings `$$` com descrição legível. | Must | ⬜ |
| RF-CFG-2 | Editar e aplicar settings individualmente (`$n=valor`). | Must | ⬜ |
| RF-CFG-3 | Ver `$#` (offsets), `$I` (build info) e `$G` (estado modal). | Should | ⬜ |
| RF-CFG-4 | Perfis de configuração (salvar/restaurar conjunto de settings). | Could | ⬜ |
| RF-CFG-5 | Preferências do app: tema, unidades, porta/baud padrão, pasta de arquivos. | Must | ⬜ |
| RF-CFG-6 | Ajuda contextual sobre settings críticos (`$20`, `$21`, `$22`, `$32`). | Should | ⬜ |

### M9 — Importação de imagens e geração de G-code

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-IMG-1 | Abrir imagem (PNG/JPG/BMP/GIF/WebP/AVIF) via diálogo nativo já filtrado, e exibir preview. | Must | ✅ |
| RF-IMG-2 | Ajustes de imagem: brilho, contraste, *white clip*, inversão, B&W. | Should | ✅ |
| RF-IMG-3 | Redimensionar/reposicionar: largura, altura, offset X/Y, manter proporção. | Must | ✅ |
| RF-IMG-4 | Conversão **line-to-line** (tons de cinza) com direção e resolução (linhas/mm). | Must | ✅ |
| RF-IMG-5 | Conversão **1-bit dithering** (ex.: Floyd–Steinberg). | Should | ✅ |
| RF-IMG-6 | **Vetorização** (raster → vetor) para corte/line-art: contorno por limiar + simplificação (RDP). | Could | ✅ |
| RF-IMG-7 | Parâmetros de gravação: velocidade (mm/min), S-min/S-max, modo **M3/M4**. | Must | ✅ |
| RF-IMG-8 | Perfis de material (potência/velocidade recomendadas; notas trazem as passadas). | Could | ✅ |
| RF-IMG-9 | Compensar tamanho do ponto do laser (ex.: 0,08 mm da COMGO Z1). | Should | ✅ |

### M10 — Macros e botões customizados

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-MAC-1 | Criar/editar botões que executam comandos/macros. | Should | ⬜ |
| RF-MAC-2 | Organizar macros por grupos e importar/exportar. | Could | ⬜ |

### M11 — App, i18n e distribuição

| ID | Requisito | Prioridade | Status |
| :--- | :--- | :--- | :--- |
| RF-APP-1 | Tema escuro (padrão) e claro. | Should | 🟡 |
| RF-APP-2 | Idioma pt-BR e en (estrutura de i18n). | Should | ⬜ |
| RF-APP-3 | Unidades mm/polegadas na UI e nos comandos. | Should | ⬜ |
| RF-APP-4 | Empacotar `.AppImage`, `.deb` e `Flatpak`. | Must | ⬜ |
| RF-APP-5 | Instruções de permissão de porta serial no Linux (grupo `dialout`). | Must | ⬜ |

---

## 7. Requisitos não-funcionais

| ID | Requisito | Justificativa |
| :--- | :--- | :--- |
| RNF-1 | **Confiabilidade de streaming**: nunca enviar mais linhas do que o buffer do GRBL aceita; nunca perder um `ok`. | Envio atual (fire-and-forget) pode travar a máquina. |
| RNF-2 | **Latência de UI**: status visível com ≤ 200 ms de atraso; UI nunca congela durante envio. | Envio deve ser assíncrono no processo main. |
| RNF-3 | **Segurança**: `contextIsolation` ligado, `nodeIntegration` desligado, IPC mínimo e validado. | Requisito de Electron. |
| RNF-4 | **Portabilidade Linux**: Ubuntu/Fedora/Arch, X11 e Wayland; acesso a `/dev/ttyUSB*` e `/dev/ttyACM*`. | Público-alvo. |
| RNF-5 | **Testabilidade**: lógica de protocolo isolada e testável sem hardware (GRBL simulado). | Reduz risco e regressões. |
| RNF-6 | **Tipagem**: TypeScript estrito no main/preload e no renderer. | Manutenibilidade. |
| RNF-7 | **Código aberto** com licença definida e build reprodutível. | Comunidade e adoção. |
| RNF-8 | **Recuperação**: fechar o app durante um job não deve deixar a máquina em estado desconhecido sem aviso. | Segurança do equipamento. |
| RNF-9 | **Observabilidade**: log persistente de sessão para diagnóstico. | Suporte ao usuário. |
| RNF-10 | **Aparência**: seguir o design system Windows 11 (Fluent Design 2) — cantos 4/8 px, tokens de tema, cor de acento, estados de controle. Ver `DESIGN.md`. | Familiaridade e qualidade percebida. |
| RNF-11 | **Performance**: startup ≤ 1,5 s · RAM ≤ 200 MB · resposta a interação ≤ 100 ms · UI ≥ 55 fps com job rodando · CPU ociosa ≈ 0 %. | "Rápido e leve" é requisito medível. |
| RNF-12 | **Precisão visual**: DRO em 0,001 mm com `tabular-nums`, nítido em DPI 100/125/150/200 %, canvas com `devicePixelRatio`, sem arredondar valores de G-code. | "Preciso" é requisito medível. |
| RNF-13 | **Acessibilidade**: contraste AA, alvos de clique ≥ 32 px, foco visível, Stop sempre acessível por teclado, estados redundantes com texto. | Segurança e inclusão. |

---

## 8. Referência do protocolo GRBL (base técnica)

### 8.1 Comandos de tempo real (sem `\n`, enviados como byte único)

| Comando | Byte | Função |
| :--- | :--- | :--- |
| Soft Reset | `Ctrl-X` (0x18) | Reinicia o controlador; aborta o job. |
| Status Report | `?` | Retorna `<Estado\|MPos:…\|FS:…\|…>`. |
| Feed Hold | `!` | Pausa a execução (estado *Hold*). |
| Cycle Start / Resume | `~` | Retoma a execução. |
| Safety Door | 0x84 | Abre/fecha porta de segurança. |
| Override Feed 100% | 0x90 | Define override de avanço em 100%. |
| Override Feed +10% / −10% | 0x91 / 0x92 | Ajuste grosso de avanço. |
| Override Feed +1% / −1% | 0x93 / 0x94 | Ajuste fino de avanço. |
| Spindle/Rapid override | 0x99/0x9A, 0x9B/0x9C, 0x95/0x96 | Overrides de spindle/rápido. |

> **Atenção:** comandos de tempo real **não** levam `\n`. O código atual envia
> `'!\n'`, o que é um bug.

### 8.2 Comandos de linha (terminam com `\n`)

- `$H` homing · `$X` unlock · `$J=X0 Y0 F1000` jog · `G92 X0 Y0` set origin
- `$$` settings · `$#` offsets · `$I` build info · `$G` parser state
- `$n=valor` gravar setting · `$RST=` restore · `$SLP` sleep

### 8.3 Formato do status report

```
<Idle|MPos:0.000,0.000,0.000|FS:0,0|WCO:0.000,0.000,0.000>
<Run|MPos:12.340,5.000,0.000|FS:1200,0|Ov:100,100,100>
<Alarm|MPos:0.000,0.000,0.000>
```

Campos: `MPos` (posição máquina), `WPos` (posição de trabalho), `FS` (feed/S),
`Ov` (overrides), `WCO` (work coordinate offset), `Pn` (pinos), `Bf` (buffer).

### 8.4 Streaming com controle de fluxo

- **Send-response (recomendado no início):** envia uma linha e aguarda `ok`
  (ou `error:`) antes da próxima. Simples e à prova de estouro de buffer.
- **Character-counting (otimização futura):** acompanha o buffer RX do GRBL
  (128 bytes via `Bf:` no report) para manter a máquina sempre ocupada.

---

## 9. Matriz de paridade com o LaserGRBL (alvo)

| Área | LaserGRBL | Meta GRBL Studio |
| :--- | :--- | :--- |
| Interface (conexão, arquivo, console, jog, preview, reset/home/unlock, hold/resume, contagem/tempo, overrides) | ✅ | Paridade |
| Conexão USB/Serial | ✅ | Paridade |
| Conexão WiFi (ESP8266) | ✅ | Could |
| Load & Send + múltiplos passes | ✅ | Paridade |
| Overrides de feed/potência | ✅ | Paridade |
| Jogging | ✅ | Paridade |
| Custom buttons | ✅ | Paridade |
| Raster import (grayscale, line-to-line, dithering, vectorize, target options) | ✅ | Paridade |
| Configuração (`$$`) | ✅ | Paridade |
| Machine status e alarmes | ✅ | Paridade |
| Distribuição | Windows (Mono no Linux) | Nativa: AppImage/deb/Flatpak |

---

## 10. Critérios de aceite globais

1. O usuário consegue conectar em `/dev/ttyUSB0` a 115200, gravar uma imagem
   PNG em madeira e ver a posição da cabeça no preview em tempo real, **sem
   perder linhas nem travar a máquina**.
2. Pausar/retomar/parar funcionam em tempo real durante um job de ≥ 10 min.
3. O status (Idle/Run/Hold/Alarm) e a posição são exibidos corretamente e
   atualizados com ≤ 200 ms de latência.
4. Alarmes exibem causa e ação recomendada; botões inválidos ficam desabilitados.
5. Editar um setting `$$` e enviar em seguida reflete na máquina.
6. O app roda no Ubuntu 24.04 e Fedora 40, em X11 e Wayland, a partir de um
   `.AppImage` sem instalação.
7. Um job interrompido pode ser retomado a partir de uma linha escolhida.

---

## 11. Glossário

| Termo | Significado |
| :--- | :--- |
| **GRBL** | Firmware open-source para controlar máquinas CNC/laser de 3 eixos via G-code. |
| **G-code** | Linguagem de comandos de movimento/ferramenta (ex.: `G0`, `G1`, `G92`). |
| **Jog** | Movimento manual da cabeça, sem executar um programa. |
| **Override** | Ajuste percentual em tempo real de avanço/potência. |
| **Feed Hold / Resume** | Pausar (`!`) / retomar (`~`) a execução. |
| **Homing** | `$H`; levar os eixos aos fins de curso para estabelecer zero. |
| **Unlock** | `$X`; limpar estado de alarme. |
| **Dithering** | Conversão de tons de cinza em padrão de pontos (1-bit). |
| **Line-to-line** | Estratégia de gravação linha a linha com potência variável (PWM/S). |
| **M3 / M4** | Modos de laser: M3 = potência constante; M4 = potência dinâmica por velocidade. |
| **MPos / WPos / WCO** | Posição de máquina / de trabalho / offset de coordenada de trabalho. |
