# GRBL Studio — Guia de Primeiros Passos (P0-5)

> **Versão do guia:** 1.0  
> **App:** GRBL Studio — alternativa nativa para Linux ao LaserGRBL  
> **Firmware alvo:** GRBL 1.1 (compatível com 0.9)  
> **Máquinas testadas:** COMGO, Sculpfun, Ortur, AtomStack, TwoTrees, Comgrow, Neje, LaserTree, AlgoLaser, xTool (D1/P2), D1 Pro, e genéricas

---

## 1. Instalação

O GRBL Studio é distribuído em **três formatos nativos para Linux**. Escolha um:

### 1.1 AppImage (recomendado — sem instalação, roda em qualquer distro)

```bash
# 1. Baixe a última release em: https://github.com/wernecklab/grbl-studio/releases
# 2. Torne executável
chmod +x GRBL-Studio-*.AppImage

# 3. Execute
./GRBL-Studio-*.AppImage
```

> 💡 **Dica:** a AppImage já traz tudo incluso (Electron, Node, dependências nativas). Funciona no Ubuntu, Fedora, Arch, openSUSE, Debian, Linux Mint, Pop!_OS, Manjaro, etc.

---

### 1.2 Pacote `.deb` (Ubuntu, Debian, Mint, Pop!_OS, derivados)

```bash
# Baixe o .deb da release e instale:
sudo apt install ./grbl-studio_*_amd64.deb

# O atalho "GRBL Studio" aparece no menu de aplicativos
```

> ⚠️ **Atenção:** se o `apt` reclamar de dependências, rode `sudo apt -f install` após o comando acima.

---

### 1.3 Flatpak (quando publicado no Flathub)

```bash
# Instalação via Flathub (requer Flatpak configurado)
flatpak install flathub com.grblstudio.app

# Para rodar:
flatpak run com.grblstudio.app
```

> 📌 **Status:** o manifesto Flatpak está em `build/flatpak/` no repositório; a publicação no Flathub ocorre após a v1.0.

---

## 2. Permissão de Porta Serial (Obrigatório no Linux)

> ⚠️ **Atenção:** sem este passo o app **não verá** `/dev/ttyUSB0`, `/dev/ttyACM0` etc. e a conexão falhará silenciosamente.

### Opção A — Grupo `dialout` (padrão Ubuntu/Debian/Mint/Pop)

```bash
sudo usermod -aG dialout $USER
# Saia da sessão e entre novamente (ou reboot) para valer
```

### Opção B — Fedora / RHEL / CentOS / openSUSE

```bash
# Grupos comuns nessas distros:
sudo usermod -aG uucp,lock $USER
# Logout/login
```

### Opção C — Regra udev persistente (para uma máquina específica)

Crie o arquivo `/etc/udev/rules.d/99-grbl-studio.rules`:

```udev
# COMGO / Sculpfun / Ortur / AtomStack (CH340 / CH341 / CP2102)
SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", MODE="0666", GROUP="dialout"
SUBSYSTEM=="tty", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", MODE="0666", GROUP="dialout"
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", MODE="0666", GROUP="dialout"  # FTDI

# Adicione outras linhas conforme seu `lsusb`
```

Aplique:

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

> 🔍 **Descobrir o VID/PID da sua placa:** conecte o cabo USB e rode `lsusb`. Procure linhas como `1a86:7523` (CH340), `10c4:ea60` (CP2102), `0403:6001` (FTDI).

---

## 3. Primeira Execução

![Tela Splash](assets/getting-started/tela-splash.png)

1. **Splash screen** — aparece por ~1–2 s (versão, crédito WerneckLab).
2. **Janela principal** — layout Fluent (Windows 11): rail à esquerda, preview 2D no centro, console embaixo, painel de máquina à direita.
3. **Tour de onboarding (5 passos)** — abre automaticamente na primeira execução:

   1. **Conectar** → escolher porta, baud, perfil
   2. **Perfil da máquina** → 30+ perfis ou "Genérico GRBL"
   3. **Abrir arquivo/imagem** → .gcode, .nc, PNG, JPG…
   4. **Preview & Posicionar** → zoom/pan, contorno fraco, marcar centro
   5. **Gravar** → Play, barra flutuante, overrides em tempo real

   > ✅ O tour pode ser reaberto em **Ajuda → Tour de primeiros passos** e dispensado com "Não mostrar novamente".

4. **Idioma** — detectado do sistema (`pt-BR`, `en`, `es`). Altere em **Exibir → Aparência e idioma…** a qualquer momento.

---

## 4. Conectar a Máquina

![Tela Conexão](assets/getting-started/tela-conexao.png)

### 4.1 Selecionar a porta

- Rail esquerdo → **Conexão** → combo **Porta**
- Portas típicas:
  - `/dev/ttyUSB0` — adaptadores CH340/CH341/CP2102 (maioria das máquinas baratas)
  - `/dev/ttyACM0` — placas com USB nativo (Arduino, algumas Ortur/xTool)
  - `/dev/ttyS0` — portas seriais reais (raro)

> 🔄 Botão **Atualizar** recarrega a lista sem reiniciar o app.

### 4.2 Baud rate

- **115200** (padrão GRBL 1.1) — funciona em 99% das máquinas
- Outras opções: 9600, 57600, 230400, 250000, 500000, 921600
- Se não conectar, tente 115200 → 9600 → 250000

### 4.3 Perfil de máquina

O app traz **30+ perfis prontos** (curso, `$30`, homing, limites, módulo laser, potência de apontar). Exemplos:

| Fabricante | Perfis incluídos |
| :--- | :--- |
| **Sculpfun** | S6, S9, S10, S30, iCube, C1, S30 Ultra |
| **Ortur** | Laser Master 2/3, LM2 Pro, Y-Axis Rotary |
| **AtomStack** | A5, A10, A20, X7, X12, X20, X30 Pro |
| **COMGO** | Z1, Z1 Pro, Z2 |
| **TwoTrees** | TS2, TS3, TTS-55 |
| **Comgrow** | Z1, Z2, Z3 |
| **Neje** | Master 2, 3, 3 Plus |
| **AlgoLaser** | Delta, Alpha |
| **xTool** | D1, D1 Pro, P2 (GRBL mode) |
| **Genérico GRBL** | fallback quando não há perfil específico |

> 💡 **Por que usar perfil?** O pré-voo (MX-1…MX-15) usa o curso real (`$130`/`$131`), velocidade máxima (`$110`/`$111`), `$30` (S-max) e configuração de laser (`$32`) do perfil — evita queima fora da área e erros de limite.

### 4.4 Conectar

1. Selecione porta + baud + perfil
2. Clique **Conectar**
3. Badge fica **verde "Conectado"**
4. Console mostra banner do firmware:

   ```
   [MSG:GRBL 1.1f ['$' for help]]
   [VER:1.1f.20231010:]
   [OPT:V,15,128]
   ```

5. Painel **Máquina** (rail direito) preenche: firmware, curso X/Y/Z, limites, laser, offsets, startup blocks.

> ✅ **Conexão OK** = badge verde + painel de máquina preenchido + console sem `error:`.

---

## 5. Carregar Arquivo / Imagem / Desenho

O GRBL Studio tem **três abas de entrada** no rail esquerdo:

### 5.1 Aba **Arquivo** — G-code pronto

![Tela Arquivo](assets/getting-started/tela-arquivo.png)

- Formatos: `.gcode`, `.nc`, `.tap`, `.txt` (arraste ou **Abrir arquivo…**)
- Info exibida: **linhas**, **tamanho**, **tempo estimado** (soma `dist/feed`, `G0` a 3000 mm/min)
- Validação: linhas perigosas, limites da área, `M3`/`M4` sem `S`, coordenadas fora do curso
- Botão **Enviar para execução** → move para a área de gravação

---

### 5.2 Aba **Imagem** — Raster → G-code

![Tela Imagem](assets/getting-started/tela-imagem.png)

**Passo a passo:**

1. **Abrir imagem** — PNG, JPG, BMP, GIF, WebP, AVIF (diálogo nativo filtrado)
2. **Ajustes** (painel lateral):
   - Brilho / Contraste / White clip
   - **Inversão** (para gravar em material escuro)
   - **B&W** (limiar único)
3. **Algoritmo de conversão**:
   - **Line-to-line** (tons de cinza, PWM/M4) — padrão para fotos
   - **Dithering** (Floyd–Steinberg, 1-bit) — padrão para logos/texto
   - **Centerline** (esqueleto Zhang–Suen → linha única) — ideal para letras/logos grossos
   - **Vetorização** (contorno por limiar + RDP) — para corte/line-art
4. **Parâmetros de gravação**:
   - Velocidade (mm/min)
   - **S-min / S-max** (potência mínima/máxima, 0–`$30`)
   - Modo **M3** (potência constante) ou **M4** (dinâmico por velocidade)
   - **Passadas** (N× repetição do mesmo G-code)
5. **Gerar G-code** → abre no preview + área de execução

> 💡 **Dica:** use **Perfis de material** (botão 📦) — potência/velocidade/passadas pré-definidas para madeira, acrílico, couro, papel, etc. Cada perfil traz notas com nº de passadas recomendado.

---

### 5.3 Aba **Desenhar** — Editor vetorial próprio

![Tela Desenhar](assets/getting-started/tela-desenhar.png)

**Prancheta em mm** com réguas, grade e área inicial vinda da máquina (`$130`/`$131`).

**Ferramentas:**
- **Formas:** retângulo, elipse, linha, **caneta** (desenho livre com simplificação RDP), **texto vetorial** (traço ou preenchido, fontes do sistema)
- **Seleção múltipla** (marquee), mover, redimensionar, rotacionar, ordem Z, agrupar/desagrupar, duplicar
- **Snap e alinhamento:** snap a objetos/página, guias, matriz de cópias, espelhar H/V, distribuir
- **Booleanas:** unir, subtrair, intersecção, exclusão (furos por paridade)
- **Offset (contorno paralelo):** distância ± mm, passadas concêntricas, cantos miter/round/bevel
- **Edição de nós:** mover, inserir, remover
- **Camadas / multi-operação:** cada camada tem potência/velocidade/passadas/modo próprios → permite **gravar + cortar numa execução**
- **Importação:** DXF ASCII (LINE, LWPOLYLINE, CIRCLE, ARC, SPLINE, blocos) e PDF vetorial (primeira página)
- **Geradores paramétricos:** caixa com encaixe de dedos, engrenagem evolvente
- **Kerf por camada, abas (tabs), lead-in/out, marcas de registro (L/cruzes), gravar dos dois lados**

**Fluxo:**
1. Desenhe / importe / gere paramétrico
2. **Gerar e visualizar** → pergunta tamanho da arte, abre posicionamento (contorno/centro + parâmetros), regenera G-code
3. Preview pinta **só a queima** (caixa da área de trabalho é referência)

---

## 6. Preview e Posicionamento

![Tela Preview](assets/getting-started/tela-preview.png)

### 6.1 Preview 2D

- **Canvas** com zoom (roda do mouse / `F` = ajustar / `0` = 100%) e pan (arrasta botão médio ou `Espaço` + arrasta)
- **Caixa de trabalho da máquina** (curso real do perfil) — job fora da área = aviso no pré-voo
- **Movimentos:** `G1` (corte/gravação) coloridos por potência `S`, `G0` (rápidos) tracejados
- **Durante execução:** crosshair da posição atual (WPos) em tempo real
- **Simulação de job** (RF-PRV-7): playback 2D à velocidade real (play/pause/seek, 1×–10×), tempo estimado, cabeça andando no preview

### 6.2 Posicionar a gravadora (RF-PRV-6)

Dois botões no preview:

| Botão | Ação | Laser |
| :--- | :--- | :--- |
| **Contorno** | Desenha o **bounding box** da arte com laser **bem fraco** (`S` mínimo) | Ligado (fraco) |
| **Marcar centro** | Move a cabeça até o **centro geométrico** da arte | **Desligado** (`M5`) |

> ⚠️ **Atenção:** use óculos de proteção. O contorno usa potência mínima, mas o laser **está ligado**.

### 6.3 Definir origem no material

Após posicionar o laser no canto inferior esquerdo da peça (ou no centro, conforme seu fluxo):

- Botão **Definir origem** → envia `G10 L20 P1 X0 Y0` (ou `G92 X0 Y0` se preferir)
- Ou console manual: `G92 X0 Y0` + Enter

> 💡 **Boa prática:** faça o homing (`$H`) antes da primeira gravação do dia. Depois, use **Definir origem** no material.

---

## 7. Gravar

![Tela Gravacao](assets/getting-started/tela-gravacao.png)

### 7.1 Iniciar

- Botão **Play** (▶) na barra de execução / rail / preview
- **Pré-voo MX-1…MX-15** roda automaticamente:
  - `block` = impede início (ex.: job fora da área, `M3` sem `S`, velocidade > `$110`)
  - `warn` = avisa mas permite (ex.: dose alta, override ≠ 100%)
  - `info` = só informa
- Se passar: job começa, badge fica **"Executando"**, barra flutuante aparece

### 7.2 Barra flutuante (sempre visível durante o job)

![Barra Flutuante](assets/getting-started/barra-flutuante.png)

| Botão | Comando GRBL | Função |
| :--- | :--- | :--- |
| **Pausar** | `!` (Feed Hold) | Para o movimento, mantém posição, laser desliga (M4) ou mantém (M3) |
| **Retomar** | `~` (Cycle Start) | Continua de onde parou |
| **Parar** | `Ctrl-X` (0x18, Soft Reset) | Aborta job, reseta GRBL, laser desliga |
| **Emergência** | `!` + `Ctrl-X` | Para imediato, mesmo se buffer cheio |

> ⚠️ **Atenção:** a barra flutuante **não some** — fica sobreposta a tudo. O botão **Parar** é sempre acessível por teclado (`Esc`).

### 7.3 Progresso e info em tempo real

- **Linha atual / total** (ex.: `1.247 / 15.832`)
- **ETA** — tempo estimado para terminar (baseado no tempo decorrido × linhas restantes)
- **DTG** — distância para ir (mm restantes no plano de trabalho)
- **Posição** — DRO X/Y/Z com 0,001 mm (`tabular-nums`)
- **Feed real / Spindle (S)** — lidos do status report `?`
- **Overrides ativos** — feed % e potência %

### 7.4 Overrides em tempo real (GRBL 1.1)

| Controle | Comando | Passo |
| :--- | :--- | :--- |
| **Feed ±1%** | `0x93` / `0x94` | Fino |
| **Feed ±10%** | `0x91` / `0x92` | Grosso |
| **Feed 100%** | `0x90` | Reset |
| **Potência ±1% / ±10%** | `0x95`…`0x9C` | Spindle/rapid override |
| **Rápido 3 níveis** | `0x96`/`0x97`/`0x98` | 50% / 100% / 200% |

> 💡 **Dica:** para madeiras sensíveis, reduza **Feed** em 10–20% e aumente **Potência** em 5–10% para manter a dose (J/mm).

---

## 8. Após a Gravação

### 8.1 Finalização

- Job finalizado → badge **"Concluído"**, console mostra `ok` final
- **Retorno ao zero opcional** (configurável em Preferências): `G90 G0 X0 Y0` ou `G28`/`G30` se definidos
- Laser desligado (`M5`) automaticamente

### 8.2 Biblioteca de jobs (últimos 50)

![Biblioteca Jobs](assets/getting-started/biblioteca-jobs.png)

- Rail → **Biblioteca** — lista os últimos 50 programas executados
- Cada item: miniatura do preview, nome, data, tempo, material/parâmetros
- Ações: **Reexecutar** (mesmo G-code, sem arquivo original), **Duplicar** (editar parâmetros), **Excluir**

> 💡 **Útil para:** repetir a mesma peça no dia seguinte sem reabrir o arquivo.

### 8.3 Fila de trabalhos (agenda)

![Fila Trabalhos](assets/getting-started/fila-trabalhos.png)

- **Enfileirar** múltiplos arquivos G-code (arraste para a lista ou botão +)
- **Reordenar** (drag-and-drop), **Remover**
- **Gravar fila** → executa um após o outro automaticamente
- **Persistência:** fila salva em `queue.json` — sobrevive a reinício do app
- **Pré-voo** roda uma vez no primeiro item
- **Erro/alarme/"Parar fila"** → pausa a agenda, devolve item atual para a fila
- **Stop/Emergência** continuam acessíveis na barra flutuante

---

## 9. Solução de Problemas Comuns

### 9.1 "Não conecta"

| Sintoma | Causa provável | Solução |
| :--- | :--- | :--- |
| Lista de portas vazia | Sem permissão serial | Ver **§2** (grupo `dialout` ou regra udev) |
| "Access denied" / "Permission denied" | Mesmo acima | `sudo usermod -aG dialout $USER` + logout/login |
| Conecta mas console mudo | Baud rate errado | Tente 115200 → 9600 → 250000 |
| Conecta mas `ALARM:9` | Homing não feito | Rode `$H` (botão **Home**) ou desative `$22=0` se sem fim de curso |
| Firmware não identificado | GRBL 0.9 ou fork antigo | Perfil "Genérico GRBL"; verifique `$I` no console |
| Cabo USB ruim / hub sem energia | Sinal instável | Cabo curto (< 1,5 m), hub com fonte, porta USB 2.0 direta na placa-mãe |

### 9.2 "Trava no meio do job"

| Sintoma | Causa provável | Solução |
| :--- | :--- | :--- |
| Para em linha aleatória, console para | Buffer GRBL estourou | Use perfil correto (buffer RX 128 bytes padrão); não envie arquivos gigantes sem streaming confiável (o app já faz janela por bytes) |
| Para e mostra `error:20` | Override de feed 0% | Verifique se override não foi zerado acidentalmente |
| PC trava / UI congela | RAM/CPU excedida | Feche navegador/outros apps; GRBL Studio alvo ≤ 280 MB RAM |
| Cabo USB desconecta | Cabo frouxo / vibração | Prenda o cabo com fita/velcro; use cabo com ferrite |
| `ALARM:3` (reset durante job) | Ruído EMI / fonte instável | Cabo blindado, ferrite, fonte aterrada, roteamento longe do motor/laser |

### 9.3 "Alarme" — códigos GRBL 1.1 com causa e solução

| Alarme | Significado | Causa comum | Ação recomendada |
| :--- | :--- | :--- | :--- |
| **1** | Hard limit acionado | Cabeça bateu no fim de curso físico | **Unlock (`$X`)** → jog para longe do limite → **Home (`$H`)** |
| **2** | Soft limit excedido | Job tenta sair da área (`$130`/`$131`) | Verifique preview; ajuste origem ou reduza arte |
| **3** | Reset durante execução | Ruído EMI, cabo, fonte, PC dormiu | Cabo blindado, desative suspensão, ferrite |
| **4** | Porta de segurança aberta | Pino de door aberto (se `$21=1`) | Feche a tampa/porta ou desative `$21=0` |
| **5** | Homing falhou (não achou switch) | Switch solto, fio quebrado, `$22=0` | Verifique fiação; `$H` novamente |
| **6** | Homing falhou (não liberou switch) | Switch travado, ruído | Limpe switch, verifique `debounce` (`$26`) |
| **7** | Homing falhou (direção errada) | Inversão de eixo (`$3`/`$4`) | Corrija `$3`/`$4` no perfil; refaça `$H` |
| **8** | Jog cancelado (limite) | `$J=` tentou passar do limite | Jog dentro da área; verifique `$130`/`$131` |
| **9** | Homing não feito (precisa `$H`) | Primeira ligação ou após reset | Clique **Home** (botão 🏠) ou `$H` no console |

> 🔘 **Botões de recuperação** (sempre visíveis no painel de máquina / console):
> - **Unlock** → `$X` (limpa alarme)
> - **Home** → `$H` (homing completo)
> - **Reset** → `Ctrl-X` (soft reset, para tudo)

---

## 10. FAQ Rápido

| Pergunta | Resposta curta |
| :--- | :--- |
| **Preciso de internet para usar?** | Não. Totalmente offline após instalado. |
| **Funciona no Wayland?** | Sim. Testado no GNOME/KDE Wayland (Ubuntu 24.04, Fedora 40). |
| **Posso usar no Windows/macOS?** | Arquitetura não impede, mas **não é alvo** — foco é Linux nativo. |
| **Como atualizo a AppImage?** | Baixe a nova, substitua o arquivo, `chmod +x` e rode. |
| **Onde ficam as preferências / logs?** | `~/.config/grbl-studio/` (`prefs.json`, `session-log.json`, `queue.json`). |
| **Como faço backup das minhas configurações?** | Copie a pasta `~/.config/grbl-studio/` ou use **Exportar perfis** em Configuração. |
| **Meu laser não tem fim de curso. E agora?** | No perfil, defina `$22=0` (homing off). Use **Definir origem** manualmente no material. |
| **O preview mostra a arte invertida/espelhada?** | Verifique `$3`/`$4` (inversão X/Y) no painel Máquina → edite se necessário. |
| **Como gravo texto direito (não espelhado)?** | No editor de desenho, use **Texto vetorial** → não espelha. Imagens raster: marque **Inversão** se o material exige. |
| **O que é "Dose" (J/mm) nos presets?** | Energia por milímetro = `S × 60 / F`. Ajuda a levar receitas entre lasers de potência diferente (3 W / 5 W / 10 W). |

---

## 11. Links Úteis

| Recurso | Link |
| :--- | :--- |
| **GitHub Issues / Bugs / Feature requests** | https://github.com/wernecklab/grbl-studio/issues |
| **WerneckLab (site do autor)** | https://lab.werneck.dev.br |
| **Manual COMGO Z1 (referência de parâmetros)** | `docs/comgo_z1_lasergrbl_user_manual.md` (no repo) |
| **GRBL Wiki (protocolo, settings, alarmes)** | https://github.com/gnea/grbl/wiki |
| **LaserGRBL Usage (manual do produto de referência)** | https://lasergrbl.com/usage/ |
| **Comparativo de funcionalidades (paridade)** | `docs/FEATURES_COMPARISON.md` |
| **Roadmap e glossário** | `docs/ROADMAP.md` |
| **Plano para ser o melhor do mercado (P0–P4)** | `docs/PLANO_PREMIUM.md` |
| **Changelog** | `CHANGELOG.md` (raiz do repo) |
| **Como contribuir** | `CONTRIBUTING.md` |

---

## Anexos

### A. Atalhos de teclado essenciais

| Ação | Atalho |
| :--- | :--- |
| Conectar/Desconectar | `Ctrl+Shift+C` |
| Home (homing) | `Ctrl+H` |
| Definir origem (G92) | `Ctrl+Shift+Z` |
| Play / Pausar / Retomar | `Espaço` / `P` / `R` |
| Parar / Emergência | `Esc` / `Ctrl+Esc` |
| Override Feed +10% / −10% | `]` / `[` |
| Override Feed +1% / −1% | `Shift+]` / `Shift+[` |
| Zoom ajustar / 100% | `F` / `0` |
| Console focar / limpar | `Ctrl+L` / `Ctrl+Shift+L` |
| Abrir arquivo | `Ctrl+O` |
| Salvar G-code | `Ctrl+S` |
| Tela cheia | `F11` |
| Aparência e idioma | `Ctrl+,` |

> Lista completa em **Ajuda → Atalhos de teclado**.

### B. Estrutura de pastas do usuário

```
~/.config/grbl-studio/
├── prefs.json           # Preferências (tema, idioma, porta, baud, perfis, pastas)
├── session-log.json     # Log persistente de sessão (RNF-9)
├── queue.json           # Fila de trabalhos persistida
├── jobs/                # Biblioteca de jobs (últimos 50, com miniatura)
│   ├── job-001.json
│   └── ...
├── presets/             # Presets de material do usuário (JSON exportável)
├── macros/              # Macros/botões customizados
└── machines/            # Perfis de máquina personalizados
```

---

> **Última atualização:** 2026-10-26  
> **Versão do app alvo:** v0.8+ (Fase P0.5 concluída)  
> **Licença:** MIT — código aberto em https://github.com/wernecklab/grbl-studio

---

*Desenvolvido por **WerneckLab** — https://lab.werneck.dev.br*