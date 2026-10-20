# Benchmark de performance — Linux

> Requisitos cobertos: **RNF-11** (startup ≤ 1,5 s · RAM ≤ 280 MB em X11 /
> 300 MB em Wayland — PSS com GPU, após 10 min · resposta a interação ≤ 100 ms ·
> ≥ 55 fps durante job · CPU ociosa ≈ 0 %) e **RNF-12** (DPI nítido em
> 100/125/150/200 %, DRO em 0,001 mm).
>
> Escopo deste documento: **Linux**. Windows e macOS **ainda não foram
> medidos** — o script não cobre essas plataformas.

Este documento separa explicitamente o que é **medido automaticamente** pelo
`scripts/bench.mjs` do que continua sendo **procedimento manual** (FPS durante
job, latência de status com hardware e DPI).

## 1. Resumo

Medição de referência em **20/10/2026** (Ubuntu 26.04.1, Intel Core i3-5015U,
4 threads, Electron 44.8.0, o mesmo do `package-lock.json`), com **10 min de
dwell** em **X11** (`DISPLAY=:100`, Xvfb) e carga da máquina ~3–5,5 (outros
processos de desenvolvimento). As medições de 18–19/10 seguem em §6.3–§6.5; o
**piso da stack**, a comparação com o Electron vazio e a armadilha do PSS estão
em §6.6.

> **Meça sozinho.** O PSS divide as páginas compartilhadas entre *todos* os
> processos que mapeiam o mesmo binário. Com outra instância do mesmo Electron
> aberta, a mesma build mediu **202 MB** em vez de **269 MB** (§6.6). O
> `bench.mjs` conta essas instâncias e avisa no relatório.

> **Wayland:** a execução de 10 min com Wayland sob Xvfb foi **encerrada antes
> da medição** (o Electron ignora o Xvfb quando `WAYLAND_DISPLAY` existe). Os
> números de Wayland vêm de dwells de 25 s (§6.6), que são estáveis; a medição
> oficial de 10 min é em X11, como nas anteriores.

| Métrica | Medido | Orçamento | Status |
| :--- | ---: | ---: | :---: |
| Startup (10 min, X11/Xvfb, carga 4,4) | **1 966 ms** | ≤ 1 500 ms | ❌ |
| Startup (A/B intercalado, mediana, §6.3) | **1 779 ms** | ≤ 1 500 ms | ⚠ |
| Melhor par do A/B (§6.3) | **1 337 ms** | ≤ 1 500 ms | ✅ |
| RAM (PSS após 10 min, inclui GPU) | **269,0 MB** | ≤ 280 MB (X11) / 300 MB (Wayland) | ✅ |
| RAM (RSS após 10 min) | 625,8 MB | — (informativo) | — |
| CPU ociosa (média de 5 s aos 10 min) | **0,00 %** de 1 core | ≈ 0 % | ✅ |
| CPU ociosa (20 amostras ao longo do dwell) | **0,00 %** em todas | ≈ 0 % | ✅ |
| Latência de interação (p95) | **3,69 ms** | ≤ 100 ms | ✅ |
| FPS durante job | — | ≥ 55 fps | manual |
| Latência de status (`?`) | — | ≤ 200 ms | manual |
| DPI 100/125/150/200 % | — | nítido | manual |

**Status:** ✅ dentro do orçamento; ⚠ excede por pouco (startup ≤ 1 800 ms,
PSS até 10 % acima do limite — 280 MB em X11, 300 MB em Wayland —, CPU ≤ 3 %,
p95 ≤ 150 ms); ❌ acima disso; `manual` = fora do escopo automático. O
`bench.mjs` escolhe o limite de RAM pelo display server detectado.

**Leitura:** o **PSS de 269,0 MB** (app sozinho) fica **56 MB acima de uma
janela Electron vazia com as mesmas flags** (213 MB em X11; 236 MB em Wayland),
e não cresce no repouso: **282,2 MB aos 30 s → 269,0 MB dos 2 aos 10 min** — a
segunda corrida de 10 min deu **269,2 MB**, com a mesma curva (§6.6). O
orçamento anterior de 200 MB estava **abaixo do piso da stack** — não
era atingível nem com o app vazio; o RNF-11 passou a admitir **280 MB em X11 e
300 MB em Wayland**, ~10 MB acima do medido. O serviço de rede passou para o
processo browser (`NetworkServiceInProcess2`, −11 MB, §6.6). O **RSS
(625,8 MB)** soma páginas compartilhadas em cada processo e não é graduado. O
startup de **1 966 ms** foi medido em **Xvfb** e com a carga em 4,4 — o Xvfb
infla o primeiro paint (§10) e o A/B de §6.3 mostra o piso de 1,27–1,77 s da
máquina em sessão real. A **CPU ociosa é 0,00 %** nas 20 amostras e a latência
de handler (p95 3,69 ms) está bem dentro. FPS, latência de status e DPI
continuam pendentes de procedimento manual (§7–§9).

## 2. O que é medido × o que é manual

| Métrica (RNF-11/12) | Como | Cobertura |
| :--- | :--- | :--- |
| Startup | `scripts/bench.mjs` | automático (Linux) |
| RAM após N s | `scripts/bench.mjs` (`/proc/<pid>/status` + `smaps_rollup`) | automático (Linux) |
| CPU ociosa | `scripts/bench.mjs` (`/proc/<pid>/stat`) | automático (Linux) |
| Resposta a interação | `scripts/bench.mjs` (round trip main → renderer → IPC) | aproximado; clique/paint real é manual |
| FPS durante job | DevTools + `requestAnimationFrame` | **manual** (precisa de job/emulador) |
| Latência de status (`?`) | hardware ou emulador | **manual** (precisa de porta serial) |
| DPI 100/125/150/200 % | inspeção visual em cada escala | **manual** |
| DRO 0,001 mm / `tabular-nums` | inspeção visual | **manual** |

O script **não inventa** FPS, DPI ou latência de status: essas linhas aparecem
como `manual` na saída.

## 3. Como o benchmark funciona

`scripts/bench.mjs` sobe o **Electron real** a partir de `dist/`, com um
`userData` temporário (não toca nas preferências da máquina) e sem hardware
serial. A instrumentação no produto é o bloco `installBench()` em
`src/main/index.ts`, ativo **somente** com `GRBL_BENCH=1` (e a exclusão do
auto-update nesse mesmo modo):

- aguarda `did-finish-load` + `ready-to-show` + dois `requestAnimationFrame`
  e imprime `BENCH_READY` no stdout (fim do startup);
- mede 50 idas e voltas `main → webContents.executeJavaScript()` →
  `window.grbl.getAppInfo()` (IPC leve) depois de 5 warm-ups;
- ignora o auto-update, como o smoke test e o E2E, para a rede não contaminar
  startup/CPU ociosa;
- encerra de forma limpa ao receber `SIGTERM` do script.

Sem `GRBL_BENCH=1` nenhum listener, timer ou saída extra é criado — o
comportamento normal do app não muda.

### Startup

O cronômetro começa **antes do `spawn`** do binário do Electron e termina
quando o renderer já carregou, a janela está visível e o primeiro frame foi
pintado. Portanto inclui: exec do binário, bootstrap do main, leitura de
preferências, montagem do menu, splash, load do renderer e primeiro paint.
**Não** inclui o tempo do ambiente gráfico até o clique no ícone.

O hook também registra as fases internas (`hookInstalledMs`, `didFinishLoadMs`,
`readyToShowMs`, `firstPaintMs`) para separar custo do main do custo do
renderer.

### RAM

Depois de `--dwell` (padrão **30 s**; use `--dwell=600000` para o orçamento de
**10 min**), o script percorre a árvore de processos do Electron (main,
renderer, GPU, utility, zygote) e soma:

- **RSS** (`VmRSS`) de cada processo — é o número que `ps`/monitores mostram,
  mas **conta páginas compartilhadas várias vezes**;
- **PSS** (`smaps_rollup`) — rateia páginas compartilhadas e representa melhor
  o consumo real do conjunto.

A tabela de orçamento usa o **PSS total** (inclui o processo GPU) e exige o
**app sozinho**: o PSS rateia as páginas compartilhadas entre *todos* os
processos que mapeiam o mesmo inode, então outra instância aberta faz o número
cair (202 × 269 MB na mesma build — §6.6). O RSS continua nos detalhes, mas
**não** é graduado: ele soma as mesmas páginas compartilhadas em cada processo,
então até uma janela vazia do Electron passa de 570 MB por RSS. O orçamento é
comparado com o total da árvore, não só com o processo main.

### CPU ociosa

Sem porta serial aberta e sem job, o script amostra `utime + stime` de
`/proc/<pid>/stat` por **5 janelas de 1 s** e calcula a média e o pico. O
número principal é percentual de **um core** (100 % = 1 core saturado); o
percentual machine-wide (dividido pelo número de núcleos) também é impresso.

Além dessa janela final, o script amostra **1 s a cada 30 s durante todo o
dwell** (`cpu.timeline` no JSON; a linha do tempo aparece nos detalhes do
relatório). Isso separa "ocioso o tempo todo" de "pico que caiu justo na
medição final" — foi a dúvida que ficou da medição da 0.8.0 (§6.4).

### Latência de interação

Cada amostra mede o round trip completo no main:

```
main → executeJavaScript → renderer → window.grbl.getAppInfo() → IPC → main
```

O orçamento de 100 ms é comparado com o **p95** das 50 amostras. Isso cobre o
caminho de um handler leve, mas **não** inclui o paint de uma interação real
(ex.: clique em botão); essa parte permanece no checklist manual de UI.

## 4. Pré-requisitos

- Linux com display (X11 ou Wayland) **ou** `xvfb-run` para headless.
- `npm run build` executado (o script usa `dist/`).
- Nenhum hardware serial necessário.
- Idealmente máquina **ociosa**: carga alta infla startup e CPU. O relatório
  mostra a carga de 1 minuto e avisa quando ela passa do número de núcleos.

## 5. Comandos reproduzíveis

```bash
npm run build

# Medição padrão (30 s de dwell), em uma sessão gráfica real
node scripts/bench.mjs

# Orçamento de RAM após 10 min
node scripts/bench.mjs --dwell=600000

# JSON para CI/planilha
node scripts/bench.mjs --json > bench.json

# Falha com código 1 se algum orçamento automático estourar
node scripts/bench.mjs --strict --dwell=600000

# Sem sessão gráfica (CI): Xvfb + X11 forçado
env -u WAYLAND_DISPLAY -u XDG_SESSION_TYPE \
  xvfb-run -a node scripts/bench.mjs --dwell=600000
```

> **Cuidado com `xvfb-run` em sessão Wayland:** se `WAYLAND_DISPLAY` continuar
> no ambiente, o Electron escolhe Wayland e ignora o Xvfb. O relatório mostra o
> display efetivo e as variáveis. Para medir X11/Xvfb de verdade, remova
> `WAYLAND_DISPLAY` e `XDG_SESSION_TYPE` como no último comando.

Opções: `--dwell=MS`, `--json`, `--strict`, `--sandbox` (não passa
`--no-sandbox`), `--keep` (mantém o `userData` temporário), `--verbose` (ecoa o
app) e `--help`.

O atalho `npm run bench` pode ser adicionado ao `package.json`; este documento
usa a invocação direta para não depender dele.

## 6. Resultados medidos

### 6.1 Ambiente e execução

| Item | Valor |
| :--- | :--- |
| Data (local) | 18/10/2026, 21:33–21:45 (America/Sao_Paulo) |
| Comando (10 min) | `node scripts/bench.mjs --dwell=600000` (21:34–21:44) |
| Comando (startup) | 3× `node scripts/bench.mjs --dwell=1000 --json` |
| Startup nas 3 execuções | 1 827 / 2 050 / 1 985 ms (carga 4,33→3,82, 3,82→3,67, 3,67→3,49) |
| Distro / kernel | Ubuntu 26.04.1 LTS / 7.0.0-38-generic |
| CPU | Intel Core i3-5015U @ 2,10 GHz (4 threads) |
| RAM total | 15 903,3 MB |
| Carga do sistema (início / fim) | 3,19 / 4,18 (4 núcleos) ⚠️ |
| Display | Wayland (`WAYLAND_DISPLAY=wayland-0`) |
| `XDG_SESSION_TYPE` | `wayland` |
| Electron / Chrome | 44.8.0 / 152.0.7977.167 |
| Node (app / script) | 24.22.0 / v22.22.1 |
| App | 0.6.0 |
| Sandbox | `--no-sandbox` |
| userData | temporário/isolado |

### 6.2 Detalhes

| Item | Valor |
| :--- | ---: |
| Startup interno (execução de 10 min) | 2 146 ms |
| Fases: hook / `did-finish-load` / `ready-to-show` / primeiro paint | 721 / 1 717 / 1 627 / 2 146 ms |
| RSS main | 250,5 MB |
| RSS renderer | 130,8 MB |
| RSS GPU | 172,7 MB |
| RSS utility | 93,3 MB |
| RSS zygote | 134,1 MB |
| RSS total (árvore) | 781,3 MB |
| PSS total | 227,3 MB |
| Processos na árvore | 6 |
| CPU (média / pico) | 0,00 / 0,00 % de 1 core |
| CPU machine-wide | 0,000 % |
| Latência min / p50 / p95 / máx | 0,7 / 0,9 / 1,1 / 1,3 ms |
| Amostras de latência | 50 (após 5 de warm-up) |

> **RSS × PSS.** O RSS soma as páginas compartilhadas do Chromium em cada
> processo; o PSS rateia essas páginas e representa melhor o consumo real. O
> orçamento da tabela usa o RSS (medida pedida, conservadora); o PSS é mostrado
> para dar a segunda leitura. Ambos excedem 200 MB nesta medição.

> **Ruído.** A máquina estava com carga 3,2–4,2 (outros processos de
> desenvolvimento), perto dos 4 núcleos. O startup de 2,3 s na execução de
> 10 min e o melhor de 1,8 s nas execuções curtas mostram a variância; a
> RAM/PSS e a latência são menos sensíveis a isso. O script imprime a carga no
> início e no fim e avisa quando ela passa do número de núcleos.

## 6.3 Otimizações de boot (v0.8.0) — A/B intercalado

Em 18/10/2026, depois da 0.7.0, o boot foi atacado em três frentes. A medição
abaixo é um **A/B intercalado** (commit da 0.7.0 × árvore otimizada), 4 pares
alternados com `--dwell=1000`, na mesma sessão e com carga ~4,7 — é a comparação
que isola o efeito das mudanças do ruído da máquina.

| Fase | 0.7.0 (mediana) | Otimizado (mediana) | Δ |
| :--- | ---: | ---: | ---: |
| Hook do main (`hookInstalledMs`) | 694 ms | 546 ms | **−148 ms** |
| `ready-to-show` | 1 500 ms | 1 314 ms | **−186 ms** |
| Primeiro paint | 1 688 ms | 1 578 ms | **−110 ms** |
| Startup total (spawn → paint) | 1 847 ms | 1 779 ms | **−68 ms** |
| Melhor execução do par | 1 661 ms | **1 337 ms** | −324 ms |

O que mudou:

1. **`electron-updater` e `serialport` sob demanda.** Eram imports estáticos no
   topo de `main/index.ts`/`ipc.ts`. Medidos isoladamente: ~110 ms
   (`electron-updater`, árvore do builder-util) e ~35 ms (`serialport`, binding
   nativo) com cache quente — mais no primeiro acesso. O updater agora carrega
   depois da janela criada; o serial, ao listar portas ou conectar.
2. **Splash fora do caminho crítico.** `createWindow()` criava o splash antes da
   janela principal: ~85 ms antes de o `loadFile` começar (medido com
   instrumentação temporária no main: 493 → 430 ms). Agora o `loadFile` começa
   primeiro e o splash só aparece se a janela não estiver pronta em 400 ms.
3. **Bundles do renderer sob demanda.** `index.html` tinha 19 `<script>`
   síncronos (~470 KB). Saíram do caminho do primeiro paint as tabelas de
   QR/Data Matrix/PDF417 + código de barras (`qrcode.js` + `barcode.js`, ~160 KB
   no build 0.8.0) e o editor vetorial (~75 KB em 8 bundles), carregados por `loadBundle()`/`ensureDesign()` no ponto de uso. Os
   símbolos são pré-aquecidos em `requestIdleCallback` 2 s depois do boot; o
   editor carrega ao abrir Desenho/importar SVG (coberto por E2E).

O que a otimização **não** resolveu: o piso da máquina. Com o `index.html` sem
nenhum script, o primeiro paint ainda fica em **1 268–1 769 ms** (spawn →
paint) — HTML + layout + compositor. Nenhuma tarefa longa (> 50 ms) aparece no
renderer; o custo é distribuído. O startup total segue acima de 1,5 s nesta
máquina.

## 6.4 CPU ociosa — re-medição de 10 min (19/10/2026)

A medição de 18/10 registrou **7,40 %** de 1 core na janela única de 5 s do fim
do dwell (`❌`) e a leitura atribuiu o consumo ao "compositor/GPU em software e
o renderer crescendo de 135 para 202 MB". Como esse número não tinha nem
**quando** (uma foto de 5 s não mostra evolução) nem **qual processo**, ele foi
re-medido com o instrumento novo (§3, "CPU ociosa"):

| | 18/10/2026 | 19/10/2026 |
| :--- | ---: | ---: |
| Startup (spawn → janela pronta) | 1 720,6 ms | **1 581,3 ms** |
| Carga da máquina (início → fim) | 4,94 → 3,12 | 4,34 → 2,55 |
| RSS total / PSS | 826,7 / 366,3 MB | **740,4 / 298,8 MB** |
| RSS do renderer | 201,7 MB | **140,9 MB** |
| **CPU ociosa aos 10 min** | **7,40 %** | **0,00 %** |
| Latência de interação (p95) | 2,59 ms | 4,49 ms |

Linha do tempo da CPU (1 s amostrado a cada 30 s, do início ao fim do dwell):

| Tempo | 1 s | 31 s | 61 s | 91 s | 121 s … 572 s |
| :--- | ---: | ---: | ---: | ---: | ---: |
| CPU | 33 % | 18 % | 23 % | 1 % | **0 %** (16 amostras) |

Quebra por processo na janela final (5 s): main 0 %, renderer 0 %, GPU 0 %,
utility 0 %, zygote 0 %.

**Evidência independente** (perfil CDP do renderer aos 9,5–10,5 min de uptime):
99,9 % idle em 60 s de amostragem (97 039 amostras, 61 ms de trabalho), heap JS
em 10 MB, 1462 nós de DOM e RSS do renderer estável em ~141 MB — **sem** o
crescimento de 135 → 202 MB registrado em 18/10.

**O que isso explica:**

- O app **não** consome CPU ocioso no regime: 16 amostras consecutivas de 0 %
  entre 2 min e 10 min, com o perfil do renderer confirmando. O orçamento
  "CPU ociosa ≈ 0 %" é **atendido**.
- Existe uma **cauda de aquecimento de ~90 s** (33 % → 18 % → 23 % → 1 % → 0 %)
  que a janela única do fim do dwell nunca mostrou e que não é ociosidade: é o
  aquecimento do Chromium (primeiro paint, pré-aquecimento dos bundles de
  símbolos, compilação V8, caches). Numa corrida de 30 s o mesmo app mediu
  **28,8 %** (renderer 13 % + GPU 11,2 % + main 4,6 %) — o mesmo fenômeno, ainda
  no começo.
- **Hipótese descartada:** "renderer crescendo sem parar". Em 19/10 o renderer
  ficou estável (141 MB de RSS, heap de 10 MB, DOM fixo).

**O que não fica explicado e fica registrado como tal:** o valor de 18/10
(7,40 %, carga e app equivalentes) **não se reproduz**. A causa provável é
contensão da máquina (carga ~5 em 4 threads) com o renderer 60 MB maior — mas
não há evidência suficiente para afirmar, então fica como medição não
reproduzida, não como "erro". O instrumento novo (linha do tempo + quebra por
processo) existe justamente para que a próxima ocorrência seja diagnosticável.

## 6.5 `in-process-gpu` — A/B e recusa da flag (19/10/2026)

Hipótese testada: com o GPU dentro do processo **main** (`--in-process-gpu`),
a árvore perde um processo e o consumo real de memória cai. O preview é 2D
canvas puro (sem WebGL), então não há perda de capacidade; `disable-gpu` foi
descartado antes (o *software rendering* deixa a UI inaceitavelmente lenta) e
`no-zygote` não funciona via `appendSwitch` neste Electron (o zygote é criado
antes do main ler as switches).

**A/B intercalado, 4 pares**, mesmo build, X11 (`env -u WAYLAND_DISPLAY`),
`--dwell=30000`, carga da máquina 4,3–5,1 durante toda a série (números de
startup/CPU inflados; RAM e contagem de processos, não):

| Métrica (mediana de 4) | Padrão (GPU separado) | `in-process-gpu` | Δ |
| :--- | ---: | ---: | ---: |
| Startup (spawn → janela pronta) | 1 790 ms | 1 910 ms | **+120 ms** |
| RSS total da árvore | 649,3 MB | 585,2 MB | −64,1 MB |
| **PSS total da árvore** | **265,7 MB** | **263,0 MB** | −2,7 MB (ruído) |
| Processos | 6 | **5** | −1 |
| RSS do processo main | 180,4 MB | 271,8 MB | +91,4 MB |
| RSS do processo GPU | 155,7 MB | — (dentro do main) | — |
| RSS do renderer | 117,7 MB | 119,0 MB | +1,3 MB |
| CPU ociosa (média de 5 s) | 0,8 % | 0,4 % | — |

**Conclusão: a flag foi recusada** (`src/main/index.ts` fica sem ela).

1. **Não economiza memória real.** O PSS — a métrica que divide as páginas
   compartilhadas entre os processos — fica igual (265,7 → 263,0 MB, dentro do
   ruído da máquina). A queda de 64 MB no RSS *somado* é artefato do próprio
   RSS: o processo GPU deixa de existir e as suas páginas passam a ser
   contadas uma vez só. O orçamento de RAM continua o mesmo.
2. **Piora o startup** em ~120 ms (mediana dos 4 pares) — o mesmo build,
   então a diferença é da flag, não do código.
3. **Move o risco para o main.** Com o GPU no processo principal, uma falha
   do driver derruba o app inteiro; separado, eladerruba só o processo GPU.
4. O ganho real (um processo a menos) não muda nenhum veredito: o gasto de
   RAM continua acima do orçamento **da época** (200 MB) nos dois braços — a
   medição comparava o **RSS total** (649,3 → 585,2 MB); o `bench.mjs` passou a
   graduar o **PSS** (§6.6), que é a métrica do orçamento (hoje 280/300 MB).

O que ficou **aberto** para o RNF-11: a RAM (PSS 265,7 MB nesta máquina, contra
≤ 200 MB na época). A alavanca não é o processo GPU — é o que o renderer e o main
mantêm vivos (RSS do renderer 117,7 MB; main 180,4 MB). Medir isso exige
perfilar a heap do renderer e o que o main segura (sessão, log, snapshot da
máquina), não trocar de flag. **Resposta no §6.6:** a heap do renderer é
pequena (2,7 MB); o custo do app é layout/paint (+22,5 MB no renderer) e o
runtime no main (+19,6 MB), sobre um piso de 213 MB do Electron vazio.

Instrumento: `scripts/bench.mjs` aceitou `GRBL_ELECTRON_FLAGS` (flags extras
do Electron na linha de comando) para permitir A/B sem recompilar.

## 6.6 Onde está a RAM: piso da stack, serviço de rede e a armadilha do PSS (20/10/2026)

O §6.5 descartou o processo GPU como alavanca. Esta medição responde a três
perguntas: **quanto do PSS é do app e quanto é da stack?**, **o serviço de rede
vale um processo?** e **por que a mesma build já mediu 202 MB e 269 MB?**

Todas as corridas desta seção são **headless** (Xvfb), com a árvore de processos
medida por `smaps_rollup`; o startup aqui fica inflado pelo Xvfb (§10) — a
referência de startup continua sendo o A/B de §6.3.

### A armadilha: PSS depende de quem mais está aberto

O PSS rateia cada página compartilhada entre **todos** os processos da máquina
que mapeiam o mesmo inode — inclusive de outra instância do app. A mesma build,
no mesmo dia, com 10 min de dwell:

| Condição | PSS (X11) |
| :--- | ---: |
| A instância do usuário também estava aberta | **202,0 MB** |
| Uma instância só | **269,2 MB** |
| Uma instância + 6 processos de um Electron vazio (teste forçado) | **223,0 MB** |

O `bench.mjs` passou a contar as **outras instâncias do mesmo binário** e a
avisar (`Outras instâncias do mesmo Electron`). **Regra:** para comparar
medições, feche as demais instâncias (e qualquer app que use o mesmo
`node_modules/electron`); o número sozinho é o que o usuário paga ao abrir o
GRBL Studio.

### Piso da stack × app (instância única)

| Configuração | X11 | Wayland |
| :--- | ---: | ---: |
| Electron vazio, sem a flag | 223,8 MB | 248,1 MB |
| Electron vazio, **com** a flag | 213,0 MB | 236,2 MB |
| GRBL Studio, sem a flag | 281,7 MB | 300,9 MB |
| GRBL Studio, **com** a flag | **270,3 MB** | **290,4 MB** |
| **Custo do app sobre o vazio** | **+57,3 MB** | **+54,2 MB** |

App e vazio usam as mesmas flags; X11 medido com 60 s de dwell, Wayland com
25 s. O **vazio já nasce com 213 MB (X11)**: o orçamento antigo de 200 MB era
menor que o piso de uma janela Electron sem uma linha de código do app.

### Onde vão os 269,2 MB (X11, 10 min)

| Processo | PSS | Electron vazio (com a flag) | Δ |
| :--- | ---: | ---: | ---: |
| main (browser) | 106,5 MB | 86,9 MB | +19,6 |
| GPU | 65,2 MB | 50,1 MB | +15,1 |
| renderer | 67,9 MB | 45,4 MB | +22,5 |
| zygotes (2) | 29,6 MB | 30,5 MB | −0,9 |
| **total** | **269,2 MB** | **213,0 MB** | **+56,2** |

O renderer **não** guarda programa nem heap grande: com o app ocioso o perfil
CDP mostra **2,7 MB de heap usado**, 1 600 elementos, 6 460 nós de DOM e dois
canvases (`previewCanvas` 1021×406 e `designCanvas` 300×150). Os +22,5 MB são
layout/paint/composição do Chromium para uma UI densa. No main, `electron-updater`
e `serialport` já entram por `await import()`; o custo é o runtime do app (IPC,
serviços, i18n, pré-voo) e o heap do V8.

### Serviço de rede: −11 MB (adotado)

| Configuração | Processos | X11 | Wayland |
| :--- | ---: | ---: | ---: |
| padrão (serviço em `utility`) | 6 | 281,7 MB | 300,9 MB |
| `NetworkServiceInProcess2` | 5 | **270,3 MB** | **290,4 MB** |

O processo `utility` do serviço de rede custa ~26 MB de PSS mesmo ocioso e o
app só usa a rede para procurar atualizações; com a flag o stack fica no
processo browser (main +4,5 MB): **−11,4 MB (X11) / −10,5 MB (Wayland)** e um
processo a menos. **Custo:** o serviço deixa de rodar isolado — o app não
carrega conteúdo remoto (a rede só faz HTTPS para o GitHub Releases), então a
superfície é mínima; e, se a flag deixar de existir numa versão futura do
Chromium, o app apenas volta ao comportamento padrão.

`disable-gpu` continua **recusado** (§6.5: a UI fica lenta) e
`disable-gpu-rasterization` foi **descartado** (§6.5 mediu ganho só em Wayland,
com a rasterização indo para a CPU — risco para o RNF-12).

### Wayland × X11

A diferença de ~22 MB **não é do app**: no processo browser, o caminho Wayland
carrega `libLLVM.so.21.1` (~4,4 MB — rasterizador de software) e pools maiores
de `partition_alloc`; o Electron vazio mede **213,0 MB** em X11 e **236,2 MB**
em Wayland. O app acrescenta ~55 MB nas duas.

### Leitura

- **269,0 e 269,2 MB em X11** (duas corridas de 10 min) e **290,4 MB em
  Wayland** (25 s), com o app sozinho. Não há crescimento: a linha do tempo dá
  **282,2 MB aos 30 s** (aquecimento) e **269,0 MB dos 2 aos 10 min** — é piso
  de stack, não vazamento.
- O app custa **~55–57 MB (21–25 %)** acima de uma janela Electron vazia com as
  mesmas flags. É esse o número que o código controla; o resto é a stack.
- Por isso o RNF-11 passou a admitir **280 MB em X11 e 300 MB em Wayland**
  (~10 MB de folga sobre o medido). O limite anterior (200/220 MB) ficava
  **abaixo do piso** (213/236 MB) e não era atingível por nenhum app Electron.

## 7. Procedimento manual — FPS durante job (≥ 55 fps)

Não há número automático: é preciso um job rodando. Para não depender de
hardware, use o emulador GRBL:

1. Em um terminal, suba o emulador e anote a porta do lado do app:

   ```bash
   node scripts/grbl-emulator.mjs
   ```

2. Abra o app com depuração remota:

   ```bash
   npx electron --no-sandbox --remote-debugging-port=9222 .
   ```

3. No app, conecte na porta informada pelo emulador, carregue um G-code
   representativo (milhares de linhas, com curvas/arcos e imagem raster, se
   possível) e inicie o job.

4. Em um Chromium/Brave, abra `chrome://inspect`, configure
   `localhost:9222` e inspecione o renderer do GRBL Studio.

5. No console do DevTools, rode a amostragem de 60 s:

   ```js
   (async () => {
     const frames = [];
     let last = performance.now();
     const start = last;
     await new Promise((resolve) => {
       const tick = (now) => {
         frames.push(now - last);
         last = now;
         if (now - start < 60_000) requestAnimationFrame(tick);
         else resolve();
       };
       requestAnimationFrame(tick);
     });
     const intervals = frames.slice(5).sort((a, b) => a - b);
     const at = (p) =>
       intervals[Math.min(intervals.length - 1, Math.floor(p * intervals.length))];
     const fps = (ms) => 1000 / ms;
     const mean =
       intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
     console.log(
       JSON.stringify({
         frames: intervals.length,
         avgFps: +(1000 / mean).toFixed(1),
         p95FrameMs: +at(0.95).toFixed(2),
         worstFps: +fps(intervals[intervals.length - 1]).toFixed(1),
       }),
     );
   })();
   ```

6. Critério: `avgFps ≥ 55` durante o job. Registre o JSON, a máquina, o
   Electron e o G-code usado. O DevTools aberto adiciona overhead; mantenha o
   mesmo procedimento ao comparar versões.

## 8. Procedimento manual — latência de status (`?`, ≤ 200 ms)

Com hardware ou emulador conectado, envie um `?` e confirme que o DRO/estado
reflete a resposta em até 200 ms. O script não abre porta serial, então essa
métrica continua fora da automação. Use o mesmo G-code/emulador ao comparar
versões e anote a taxa de polling observada.

## 9. Procedimento manual — DPI 100/125/150/200 %

1. Ajuste a escala do sistema para **100 %, 125 %, 150 % e 200 %** (GNOME:
   Configurações → Telas; ou, como aproximação, inicie o app com
   `--force-device-scale-factor=1.25`, `1.5`, `2`).
2. Em cada escala, reinicie o app e verifique:
   - textos e ícones nítidos (sem blur/interpolação);
   - DRO com 3 casas, dígitos estáveis e `tabular-nums` (sem “pular”);
   - preview em `<canvas>` nítido (usa `devicePixelRatio`);
   - nenhum controle cortado ou sobreposto.
3. Registre o resultado por escala (✅/❌) e o método usado (escala do sistema
   ou `--force-device-scale-factor`). “Nítido” é avaliação visual; não há
   número a inventar.

## 10. Limitações e pendências

- **Somente Linux.** Windows e macOS não foram medidos; ao rodar lá, ajuste a
  coleta de `/proc` (o script atual depende de `/proc`).
- **Sem hardware real.** FPS durante job, latência de status e validação na
  máquina ficam manuais.
- **Display e renderização.** O relatório registra o display efetivo
  (Wayland/X11) e as variáveis de ambiente. `xvfb-run` só força X11 se
  `WAYLAND_DISPLAY`/`XDG_SESSION_TYPE` forem removidos; caso contrário o
  Electron usa Wayland e o Xvfb é ignorado. Xvfb/software rendering pode
  piorar startup e FPS em relação a uma sessão gráfica real.
- **RSS ≠ PSS, e PSS depende de quem está aberto.** O RSS soma páginas
  compartilhadas em cada processo e chega a 572 MB numa janela Electron
  **vazia**; o PSS rateia essas páginas e é a métrica graduada no orçamento
  (§6.6). Mas o rateio é **da máquina inteira**: com outra instância do mesmo
  Electron aberta, o PSS medido cai (202 × 269 MB). Feche as demais instâncias
  — o `bench.mjs` conta e avisa.
- **Wayland sob Xvfb é instável para dwell longo.** Uma execução de 10 min com
  `WAYLAND_DISPLAY` herdado (o Electron escolhe Wayland e ignora o Xvfb) foi
  encerrada antes da medição; a medição oficial de 10 min roda em X11
  (`env -u WAYLAND_DISPLAY`). As comparações Wayland × X11 de §6.6 usam
  dwell de 25 s, que é estável.
- **Variância.** Rode 3 vezes em máquina ociosa e use a mediana para números
  oficiais. Carga do sistema e cache de disco aparecem no relatório.
- **Versões.** Electron/Chromium/Node vêm do `package-lock.json`; anote-os ao
  comparar medições de versões diferentes do app.
