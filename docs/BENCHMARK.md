# Benchmark de performance — Linux

> Requisitos cobertos: **RNF-11** (startup ≤ 1,5 s · RAM ≤ 200 MB · resposta a
> interação ≤ 100 ms · ≥ 55 fps durante job · CPU ociosa ≈ 0 %) e **RNF-12**
> (DPI nítido em 100/125/150/200 %, DRO em 0,001 mm).
>
> Escopo deste documento: **Linux**. Windows e macOS **ainda não foram
> medidos** — o script não cobre essas plataformas.

Este documento separa explicitamente o que é **medido automaticamente** pelo
`scripts/bench.mjs` do que continua sendo **procedimento manual** (FPS durante
job, latência de status com hardware e DPI).

## 1. Resumo

Medição em 18/10/2026, numa sessão **Wayland** (Ubuntu 26.04.1, Intel Core
i3-5015U, 4 threads, Electron 44.8.0, o mesmo do `package-lock.json`). A
referência de RAM/CPU/latência usa **10 min de dwell**; o startup foi repetido
**3×** em execuções curtas para reduzir o ruído de uma máquina de
desenvolvimento com carga ~3–4.

| Métrica | Medido | Orçamento | Status |
| :--- | ---: | ---: | :---: |
| Startup (melhor de 3, carga 3,7–4,3) | **1 827 ms** | ≤ 1 500 ms | ❌ |
| Startup (execução de 10 min, carga 3,2) | **2 323 ms** | ≤ 1 500 ms | ❌ |
| RAM (RSS total após 10 min) | **781,3 MB** | ≤ 200 MB | ❌ |
| RAM (PSS total, referência) | **227,3 MB** | ≤ 200 MB | ❌ |
| CPU ociosa (média de 5 s) | **0,00 %** de 1 core | ≈ 0 % | ✅ |
| Latência de interação (p95) | **1,1 ms** | ≤ 100 ms | ✅ |
| FPS durante job | — | ≥ 55 fps | manual |
| Latência de status (`?`) | — | ≤ 200 ms | manual |
| DPI 100/125/150/200 % | — | nítido | manual |

**Status:** ✅ dentro do orçamento; ⚠ excede por pouco (startup ≤ 1 800 ms,
RSS ≤ 220 MB, CPU ≤ 3 %, p95 ≤ 150 ms); ❌ acima disso; `manual` = fora do
escopo automático.

**Leitura:** os orçamentos de startup e RAM **não** são atendidos nesta
máquina/versão. A melhor execução (1 827 ms, com carga menor) fica ~22 % acima
de 1,5 s; a execução de 10 min ficou em 2 323 ms. O PSS (227,3 MB) é a leitura
mais justa do consumo total e ainda excede 200 MB em ~27 MB; o RSS total é
muito maior (781,3 MB) porque soma páginas compartilhadas, e só o processo main
já tem 250,5 MB de RSS. CPU ociosa e latência de handler estão bem dentro do
orçamento. FPS, latência de status e DPI continuam pendentes de procedimento
manual (§7–§9).

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

A tabela de orçamento usa o **RSS total** (medida pedida e conservadora) e o
PSS aparece nos detalhes. O orçamento de 200 MB é comparado com o total da
árvore, não só com o processo main.

### CPU ociosa

Sem porta serial aberta e sem job, o script amostra `utime + stime` de
`/proc/<pid>/stat` por **5 janelas de 1 s** e calcula a média e o pico. O
número principal é percentual de **um core** (100 % = 1 core saturado); o
percentual machine-wide (dividido pelo número de núcleos) também é impresso.

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
- **RSS ≠ PSS.** O RSS soma páginas compartilhadas em cada processo; use o PSS
  para estimar o consumo real. O orçamento é comparado com o RSS total de
  forma conservadora.
- **Variância.** Rode 3 vezes em máquina ociosa e use a mediana para números
  oficiais. Carga do sistema e cache de disco aparecem no relatório.
- **Versões.** Electron/Chromium/Node vêm do `package-lock.json`; anote-os ao
  comparar medições de versões diferentes do app.
