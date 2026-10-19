# GRBL Studio — Informação da máquina: leitura, diagnóstico e pré-voo (v0.6)

> **Especificação técnica.** Requisitos **RF-MAQ-1…9** (`PRODUCT_SPEC.md` §6,
> módulo **M14**); itens **P0.7/P0.8** do [`ROADMAP.md`](ROADMAP.md) (v0.6).
> Base: `PLANO_PREMIUM.md` §2 (placar) e `ANALISE_COMPETITIVA.md` §7.
>
> **Princípio:** usar o que a máquina **já responde** (`$I`, `$$`, `$#`, `$G`,
> `?`) para evitar queima errada, material perdido e suporte demorado — sem
> hardware novo, sem dependência nova e sem tocar em settings sem consentimento.

---

## 1. Objetivo

Hoje a resposta da máquina chega toda, mas só uma parte vira informação:

| Já chega | Hoje |
| :--- | :--- |
| `[VER:…]` (firmware) | aparece no console como texto |
| `[OPT:…]` | **usado** só para dimensionar a janela de envio |
| `Pn:` (pinos) e `Bf:` (buffer) | **parseados e descartados** |
| `$G`, `$#` | exibidos crus no modal de Configurações |
| `$$` | catálogo rico, mas pouco usado para **decidir** |

Esta entrega transforma isso em três coisas: **painel "Máquina"**,
**checagens de pré-voo** antes de gravar e **diagnóstico copiável** para suporte.

## 2. Escopo

**Dentro (v0.6):** leitura estruturada de `$I`/`$#`/`$G`; fatos derivados de
`$$`; painel; pré-voo; indicador de pinos; diagnóstico copiável; área de trabalho
do preview vinda de `$130`/`$131`.

**Fora (v0.7+):** auto-perfil/"smart connect" (**P2.5**), seletor de WCS
(**P2.15**), ETA com aceleração (**P2.16**), sonda (`PRB`) e rotativa (`A:`).

## 3. Dados a ler

| Fonte | Campo | Uso |
| :--- | :--- | :--- |
| `$I` | `[VER:1.1h.20190825:]` | firmware/plataforma → recursos e *workarounds* |
| `$I` | `[OPT:V,15,128]` | `V` PWM/spindle variável · `C` CoreXY · `M` mist · 15 blocos · 128 B RX |
| `$I` | `[MSG:Using machine:…]` | auto-identificação da máquina → sugerir o perfil ao conectar (P2.5) |
| `$G` | `[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]` | estado modal → badges (G0/G54/G21/G90/M3-S0) |
| `$#` | `[G54:…]`…`[G59:…]`, `[G28:]`, `[G30:]`, `[G92:]`, `[TLO:]`, `[PRB:]` | offsets de trabalho; futura sonda |
| `$N` | `$N0=…` | *startup blocks* (rodam a cada reset — avisar) |
| `$$` | `$130/$131/$132` | **curso real** → área de trabalho e pré-voo |
| `$$` | `$110-$112` · `$120-$122` | velocidade/aceleração máximas → avisos e ETA |
| `$$` | `$30` · `$31` · `$32` · `$33` | teto de `S`, piso, **modo laser**, PWM |
| `$$` | `$20` · `$21` · `$22` · `$23-$26` | soft/hard limits e homing (coerência) |
| `$$` | `$3` · `$5` · `$6` · `$10` · `$13` | inversões e **máscara de status** |
| `?` | `Pn` · `Bf` · `Ov` · `extra` (`A:`) | pinos, saturação, overrides, rotativa |

> Só é possível ler o que o firmware reporta: **não** há telemetria de potência,
> temperatura ou foco do diodo.

## 4. Arquitetura

### 4.1 Módulo puro (novo): `src/shared/machine.ts`

Funções puras, testáveis (padrão de `protocol.ts`), sem I/O:

```ts
export interface FirmwareInfo { raw: string; version?: string; platform?: string;
  options?: { variableSpindle?: boolean; coreXY?: boolean; mist?: boolean };
  plannerBlocks?: number; rxBufferSize?: number }
export interface MachineFacts { travel?: Vec3; maxRate?: Vec3; accel?: Vec3;
  stepsPerMm?: Vec3; laserMode?: boolean; sMax?: number; sMin?: number; pwmFreq?: number;
  softLimits?: boolean; hardLimits?: boolean; homing?: boolean; startupBlocks?: string[];
  statusMask?: number; reportInches?: boolean }
export interface ModalState { motion?: string; wcs?: string; plane?: string; units?: string;
  distance?: string; arc?: string; programFlow?: string; spindle?: string; coolant?: string;
  tool?: number; feed?: number; speed?: number }
export type PreflightSeverity = 'block' | 'warn' | 'info';
export interface PreflightIssue { id: string; severity: PreflightSeverity;
  title: string; detail: string; fix?: { label: string; kind: 'setting' | 'action'; code?: number; value?: string } }
```

| Função | Entrada | Saída |
| :--- | :--- | :--- |
| `parseFirmware(lines)` | linhas de `$I` | `FirmwareInfo` (`[VER:…]` + `[OPT:…]`, tolerante a variações) |
| `parseModalState(lines)` | linhas de `$G` | `ModalState` (do `[GC:…]`) |
| `parseOffsets(lines)` | linhas de `$#` | `{ g54..g59, g28, g30, g92, tlo, prb }` |
| `parseStartupBlocks(lines)` | linhas de `$N` | `string[]` |
| `deriveFacts(settingsMap)` | `parseSettings('$$')` | `MachineFacts` |
| `preflight({ lines, facts, status, useWorkCoords })` | G-code + fatos | `PreflightIssue[]` (ordenado por severidade) |
| `machineReport({ app, transport, firmware, modal, offsets, facts, status, alarms })` | tudo | **texto do diagnóstico** |

### 4.2 Main

- `GrblClient`: guardar `[VER:…]`/`[OPT:…]` vistos no connect (`firmware`), expor
  `firmware`/`lastStatus` e um `snapshot()` que consulta `$I`, `$$`, `$#`, `$G` e
  `$N` **com a janela vazia** (mesma regra de hoje: `query()` já garante isso).
- `ipc.ts`: canais `machine:snapshot` (JSON) e `machine:report` (texto);
  registrar em `src/shared/channels.ts`. Nenhum polling novo.

### 4.3 Renderer

- Modal **"Máquina"** (padrão dos modais de Ferramentas; tokens do `DESIGN.md`).
- Chip de **pinos** (`Pn`) na barra de status, ao lado dos overrides.
- **Banner de pré-voo** acima do botão **Gravar** quando houver `block`/`warn`.
- Botão **"Copiar diagnóstico"** (com *fallback* de seleção quando o clipboard falhar).
- Consome o **perfil de máquina** (`src/shared/machines.ts` → `GRBL_MACHINES`) em
  vez de valores chumbados no renderer (RF-MAQ-10).

### 4.4 i18n

Chaves `machine.*` e `preflight.*` em pt-BR/en/es (fonte pt-BR; paridade
garantida por type-check). Nenhum texto hardcoded.

## 5. Painel "Máquina" (UI)

| Seção | Linhas | Origem |
| :--- | :--- | :--- |
| **Firmware** | versão · plataforma · opções (`V`/`C`/`M`) · planner · buffer RX | `$I` |
| **Curso e movimento** | curso X/Y/Z · velocidade máx · aceleração · passos/mm | `$$` |
| **Limites** | soft/hard limits · inversões (`$3/$5/$6`) · coerência `$20`+`$22` | `$$` |
| **Homing** | habilitado · direção · avanço/busca · *startup blocks* (`$N`) | `$$`/`$N` |
| **Laser/Spindle** | modo laser (`$32`) · faixa de `S` (`$31`…`$30`) · PWM (`$33`) | `$$` |
| **Agora** | estado · WCS ativo · unidades · modo modal · `S`/`F` · overrides · pinos | `$G`/`?` |
| **Offsets** | G54–G59, G28/G30, G92, TLO | `$#` |

**Degradação graciosa:** campo não informado pelo firmware → `—` com dica
"o firmware não informa" (nunca vazio sem explicação, nunca erro).

## 6. Pré-voo (regras)

Roda sobre o G-code **já carregado/gerado** e os fatos da máquina, antes de
iniciar o job (e também no desenho, antes de gerar).

| ID | Sev. | Condição | Mensagem (causa) | Ação de 1 clique |
| :--- | :--- | :--- | :--- | :--- |
| **MX-1** | warn | `S` do job > `$30` | "A máquina limita `S` em `$30` — a potência pedida não será atingida." | Normalizar potência para 100 % de `$30` |
| **MX-2** | **block** | G-code usa `M3/M4` e `$32=0` | "Sem modo laser o GRBL responde `error:17`." | Ativar `$32=1` (com confirmação) |
| **MX-3** | **block**\* | caixa do job > curso (`$130/$131`) + margem | "O job não cabe no curso da máquina." | Rever tamanho/origem; mostrar excedente em mm |
| **MX-4** | warn | `$20=1` com `$22=0` | "Soft limits exigem homing (`$22`); o GRBL responde `error:10`." | Ativar `$22=1` ou desativar `$20=0` |
| **MX-5** | warn | `$22=0` e G-code usa `G28`/`G30` | "Não há home definido; `G28`/`G30` podem ir ao lugar errado." | Remover `G28`/`G30` / definir home |
| **MX-6** | **block** | `G1` sem `F` e sem feed anterior | "Movimento sem velocidade → `error:22`." | Definir velocidade (mm/min) |
| **MX-7** | **block** | `Pn` com porta (`D`) ou fim de curso ativo | "Entrada de segurança ativa: `Pn:<…>`." | Ver estado / Liberar (`$X`) quando aplicável |
| **MX-8** | warn | G-code com `M7/M8` e `OPT` sem `M` | "Este firmware não tem refrigeração." | Remover `M7/M8` |
| **MX-9** | info | G-code em `G20` com `$13=0` | "Código em polegadas; relatórios em mm." | — |
| **MX-10** | info | `$N` contém blocos | "Há `n` bloco(s) de inicialização que rodam a cada reset." | Mostrar conteúdo |
| **MX-11** | warn | jog: passo > curso ou feed > `$110-112` | "O jog excede o curso (`error:15`) / acima da velocidade máx." | Ajustar passo/feed |
| **MX-12** | warn | 1º movimento de corte (`G1/G2/G3` com `M3/M4`) sem palavra `S` e `S` modal ≠ 0 | "O GRBL mantém o `S` do job anterior na mesma sessão: o 1º movimento pode queimar com a potência antiga." | Inserir `M5`/`S0` no início do job |
| **MX-13** | warn | `$30` da máquina ≠ `S-max` do perfil (RF-MAQ-10) | "100 % no app ≠ 100 % na máquina: a potência efetiva sai diferente da pedida." | Ajustar o `S-max` para `$30` |
| **MX-14** | info | `[OPT:…]` sem `,blocos,buffer` | "O firmware não informa o buffer RX: a janela de envio usa o padrão (128 B)." | — |
| **MX-15** | warn | `$21=1` (hard limits) e o job volta/parqueia em `X0 Y0` | "Com hard limits, voltar ao zero pode encostar na chave: dispara `ALARM:1` e o controlador **reinicia** (a porta serial pode cair)." | Parquear alguns mm fora do zero |

\* `block` permite **gravar assim mesmo** com confirmação explícita — o usuário
decide, mas nunca por engano (invariante nº 5 do `PLANO_PREMIUM.md`).

**Nunca alterar settings sem consentimento:** cada ação `setting` abre confirmação
com o valor antes/depois (RF-MAQ-9).

## 7. "Copiar diagnóstico"

Texto único, colável em issue/chat (sem dados pessoais; caminhos de porta
preservados):

```
GRBL Studio 0.5.1 — diagnóstico da máquina
2026-10-18T17:10:24Z · Linux (x64) · Electron/Node 22
Transporte: serial /dev/ttyUSB0 @115200

[Firmware $I]      [VER:1.1h.20190825:] · [OPT:V,15,128]  (planner 15 · RX 128)
[Estado $G]        G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0
[Curso $$]         X 400 × Y 400 × Z 0 mm · máx 3000 mm/min · 200 mm/s² · $32=1
[Limites]          soft=$20 1 · hard=$21 0 · homing=$22 1 · $3=0 $5=0 $6=0
[Laser]            S 0…1000 · PWM $33=5000
[Offsets $#]       G54 0,0,0 · G92 0,0,0 · TLO 0
[Status ?]         <Idle|MPos:…|FS:0,0|Ov:100,100,100|Pn:>
[Startup $N]       (nenhum)
[Alarmes]          ALARM:1 (hard limit) ×1 — re-home
[Pré-voo]          MX-1 S=1200 > $30=1000
```

## 8. Testes

- **Unit (Vitest, funções puras):** `parseFirmware` (GRBL 1.1 vanilla, grblHAL,
  FluidNC, `[OPT:]` sem letras), `parseModalState`, `parseOffsets`,
  `parseStartupBlocks`, `deriveFacts`, `preflight` (uma fixture por regra
  MX-1…MX-15) e `machineReport` (formato estável, com campo faltante).
- **Integração (PTY):** emulador respondendo `$I`/`$$`/`$#`/`$G`/`$N` →
  snapshot completo; máquina que **não** responde → painel parcial sem erro.
- **E2E (Playwright):** abrir painel e ver firmware/curso; job com `S > $30`
  mostra MX-1 e (com MX-2) bloqueia o Gravar.
- Regra: nenhuma regra de pré-voo sem teste.

## 9. DoD

- [x] `src/shared/machine.ts` (puro) + testes com fixtures reais coletadas
      (`tests/machine.test.ts`, `tests/fixtures/machine-sculpfun-c1.json`).
- [x] **Perfil de máquina como dado** (`src/shared/machines.ts`, RF-MAQ-10),
      com a Sculpfun C1 conferida contra a coleta real (`tests/machines.test.ts`).
- [x] `GrblClient` guardando `[VER:]`/`[OPT:]` do connect + `snapshot()`.
- [x] Canais `machine:snapshot`/`machine:report` (`channels.ts`, `ipc.ts`, `preload`).
- [x] Modal "Máquina" + banner de pré-voo (`index.html`, `renderer.js`, `style.css`).
- [x] Chip `Pn` dedicado na barra de status, desabilitado com explicação quando
      `$10` não reporta pinos (**RF-MAQ-7**); o `Pn` também aparece no painel
      Máquina.
- [x] i18n `machine.*`/`preflight.*` nos 3 idiomas (paridade ok).
- [x] "Copiar diagnóstico" funcionando sem rede.
- [x] Área de trabalho do preview vinda de `$130/$131` quando disponível.
- [x] `npm run typecheck`, `npm test`, `npm run lint` verdes; sem regressão de perf
      (nenhum polling novo; modal só lê sob demanda).

## 10. Riscos e degradação

| Risco | Mitigação |
| :--- | :--- |
| Firmware que não responde `$I/$#/$G` | painel parcial com "não informado"; nunca falha o connect |
| `$10` sem `Pn`/`Bf` no relatório | indicador desabilitado **com explicação**; sugerir `$10` só com consentimento |
| Variações grblHAL/FluidNC (campos extras, `A:`) | parser tolerante + campo `extra` preservado |
| Regra de pré-voo falsa-positiva | severidade mínima `info` por padrão; `block` só nos erros que o GRBL realmente rejeitaria (`17`, `22`) |
| Performance | leitura sob demanda (sem polling); reusa o status existente |

## 11. Achados reais — máquina de referência (Sculpfun C1)

Coletados em **18/10/2026** com `scripts/probe-machine.mjs` (**somente leitura**:
sem movimento, sem laser, sem `$n=`), bruto em
`tests/fixtures/machine-sculpfun-c1.json`. Os valores já estão no perfil de
máquina **Sculpfun C1** (`src/shared/machines.ts` → `public/machines.js`), e
`tests/machines.test.ts` confere perfil × coleta.

**Identificação:** Sculpfun C1 (3 W) · placa **Artery AT32** (`2e3c:5740`,
`/dev/ttyACM0` @115200) · firmware `[VER:1.3a.20250324:]` · `[OPT:H]` ·
**sem banner** · `[MSG:Using machine:Sculpfun C1]`.

### 11.1 O que foge do GRBL 1.1h "vanilla"

| Observado | Por que importa | Ação no app |
| :--- | :--- | :--- |
| `[VER:1.3a.20250324:]` — sem letra `h`, com data | versão/plataforma não seguem o formato canônico | `parseFirmware` tolerante + **fixture** de teste |
| `[OPT:H]` — uma letra, **sem `,blocos,buffer`** | planner/buffer não informados → janela de envio no padrão (16 blocos/128 B) | painel: "não informado (padrão 128 B)"; **nunca** `warn` |
| Sem banner `Grbl 1.1` | o connect não pode depender do banner | já tolerante |
| `[MSG:…]` antes do `ok` | canal de recados do firmware (aqui: **auto-identificação**) | mostrar no console; base do *smart connect* (P2.5) |
| `$N0=` e `$N1=` **vazios** | "2 blocos de inicialização" seria falso positivo | `parseStartupBlocks` ignora valor vazio |
| `error:3` esporádico na 1ª leitura | sobra/ruído de linha depois do reset | repetir a leitura **uma vez** e não marcar alarme (§11.7) |
| `$$` **sem** `$27`, `$28/$29`, `$33`, `$37/$39/$40/$43-47` | firmware enxuto: vários settings não existem | todo campo é opcional (`—` + "não informado") |
| Status **sem** `Pn` e **sem** `Bf` (`$10=1`) | pinos e saturação de buffer invisíveis | chip de pinos desabilitado **com explicação** (RF-MAQ-7) |
| `WCO` e `Ov` aparecem **só quando mudam** | o relatório varia entre leituras | manter o último valor conhecido (o app já cacheia `state.wco`) |

### 11.2 Fatos verificados (`$$`) e o que eles mudam

| Bloco | Valores reais | Consequência |
| :--- | :--- | :--- |
| Curso | `$130/$131/$132 = 150/130/45` | área de trabalho do preview = 150×130; **MX-3** é o aviso mais valioso nesta máquina |
| Movimento | `$100-102 = 80/80/1600` · `$110-112 = 10000/10000/500` · `$120-122 = 200` | teto de jog (MX-11) e futura ETA (P2.16) |
| Laser | `$30=1000` · `$31=0` · `$32=1` (**modo laser ligado**) | potência 100 % = `S1000`; **MX-2** já satisfeita de fábrica |
| Limites | `$20=0` (soft **off**) · `$21=1` (hard **on**) · `$22=1` (**homing on**) · `$23=3` | botão **Home** habilitado; MX-4 não se aplica (`$20=0`) |
| Homing | `$24=1000` · `$25=3000` · `$26=250` | — |
| Inversões | `$3=1` (X) · `$5=1` (limites) · `$6=1` (probe) | painel mostra a coerência |
| Status/unidade | `$10=1` · `$13=0` (mm) · `$11=0.005` · `$12=0.002` | MX-9 não se aplica |
| Offsets | G54–G59, G28, G30, G92, TLO e PRB **zerados** | `G92`/`G10 L20` são o caminho para definir origem |

### 11.3 Movimento testado (sem laser)

`M5` → `ok`; `$J=X5 F500` → `ok` (relatório `<Jog|MPos:…|FS:500,0>`); `$J=X-5 F500`
→ de volta a `MPos:0,0,0`, **Idle, sem alarme**. Um 2º `$J=` durante o movimento é
aceito pelo GRBL (o alvo é recalculado) — a implementação de jog contínuo do app
(jog longo + cancelamento) está coerente com isso.

### 11.4 O perfil da máquina é o lugar dos valores específicos (RF-MAQ-10)

Nada disso fica chumbado no código: sai do catálogo tipado
`src/shared/machines.ts` (perfil **Sculpfun C1**) e chega à UI pelo
`applyMachineProfile`.

| Valor | Campo do perfil | Efeito |
| :--- | :--- | :--- |
| Curso 150×130 | `area` | `previewProgram.workArea` + aviso MX-3 |
| Homing de fábrica | `homing` | habilita o botão **Home** (era `false` por engano) |
| `S-max` (`$30=1000`) | `sMax` | `#imgSmax` e **referência da conversão % → `S`** (RF-IMG-8) |
| Módulo 3 W | `module` | seleciona o catálogo de materiais do módulo certo |
| Laser de apontar (contorno/centro) | `pointPercent` (0,5 % ≈ `S5`) | `drawFrameOutline`/`moveToFrameCenter` |
| `$20/$21/$22/$32/$130/$131` | `settings` | aplicados **só com a máquina conectada** (RF-MAQ-9) |

> **Correção registrada:** o perfil trazia `homing: false` e `$22: 0`; ao ser
> aplicado com a máquina conectada, **desligava o homing**. Agora reflete a
> máquina (`homing: true`, `$22=1`).

### 11.5 Sessão real do app: um job completo e um `ALARM:1`

Job real (QR Code de 25×25 módulos, `M4 S1000`, `F1000`) enviado pelo app em
18/10/2026, log `session-2026-10-18_21-38-15.log` (9.206 linhas):

| Fato | Evidência |
| :--- | :--- |
| Job inteiro sem um único `error:` | `[job] state=running sent=0 total=4554` → `state=finished sent=4554 total=4554` (21:39:43Z → 21:44:32Z), 0 ocorrências de `error:` |
| Fim normal | `M5` + `G0 X0 Y0` do próprio arquivo, depois `ok` |
| Alarme **depois** do fim | às 21:45:21Z (49 s depois), usuário mandou **Ir para zero** (`G90 G0 X0 Y0` → `ok`): `[MSG:X Limit switch triggered]` + `ALARM:1` → `[job] state=aborted` |
| O controlador **reinicia** | após o alarme: `[MSG:Hard Limit]`, `Reset to continue`, banner `Grbl 1.3a ['$' for help]`, `[MSG:Check limits]`, `[MSG:'$H'|'$X' to unlock]` |
| A porta **cai** | 46 s depois: `[conn] disconnected` + `Conexão encerrada: bad file descriptor` (o CDC USB re-enumerou com o reset; o fd do app morreu) |

Leitura: no C1 o **X0 fica junto da chave de fim de curso de X** (hipótese
principal) — `G0 X0 Y0` parqueia o cabeçote sobre a chave e, com `$21=1`, o
alarme dispara; a alternativa é chave/ruído (a C1 não reporta `Pn`, então o app
não mostra o estado das chaves). Consequências já registradas como
**MX-15** e nas pendências abaixo — o que o app faz hoje está correto
(janela, `error:`/`ALARM` tratados, mensagem de recuperação), mas a **perda da
porta** ainda não é detectada.

### 11.6 Pendências que a coleta deixou explícitas

1. Ler `$30` de verdade ao conectar e comparar com o perfil (**MX-13**), em vez
   de confiar no valor do perfil (P2.5).
2. `sMax` do perfil é a **referência**; o `$30` da máquina é a **verdade**.
3. `[OPT:H]` não informa buffer: até o painel existir, a janela segue no padrão e
   o único indício de saturação seria `Bf` — que este firmware não manda.
4. ~~**Detectar a perda da porta após `ALARM` de hard limit**~~ — **feito**
   (§11.8): vigia de silêncio do status; o app avisa e volta para
   "desconectado" (o botão reconecta) em vez de ficar "conectado" numa porta
   morta.
5. **Park position**: ao terminar o job, não parquear em `X0 Y0` (MX-15); deixar
   o usuário escolher um ponto de repouso dentro do curso, longe das chaves.

### 11.7 A primeira leitura depois de conectar: `$I` → `error:3` (18/10/2026)

Segunda coleta — o relatório copiado do painel em **0.8.0** trouxe
`firmware.options=` **vazio** e **8 × `code 3`** no histórico. Como o histórico é
persistido entre sessões (limite de 100), a pergunta era **de onde** vinham
esses `error:3`. Os logs de sessão do app (`~/.config/grbl-studio/logs/`)
respondem sem margem para dúvida:

| Fato | Evidência (9 sessões) |
| :--- | :--- |
| É sempre a **mesma linha** | `>> $I` logo após `[conn] connected` (7 ms) e `<< error:3` 3 ms depois |
| É sempre a **primeira** | `$G` vem em seguida e responde `ok` |
| O firmware fica **sem ser lido** | nesses logs, `[VER:…]` e `[OPT:…]` aparecem **0 vezes** |
| **Não é o jog** | as 9 ocorrências têm `$I` antes; nenhum `$J=` foi enviado nesses logs |

Leitura: a primeira linha escrita depois de abrir a porta cai no lixo que ficou
no parser do firmware (sessão anterior encerrada no meio de uma linha, `?`
pendente…) e este firmware responde `error:3` (comando de sistema `$` não
reconhecido) ao que não conseguiu interpretar. Como o app **abandonava** a
leitura, o painel saía **sem firmware** e o operador ficava com um `code 3` que
não dizia o que falhou.

O que o app passou a fazer:

1. **Repetir uma vez** a `$I` quando ela volta `error:3` — é leitura idempotente,
   uma vez por conexão, com aviso no console. **Sem** entrada no histórico:
   a RF-STA-7 é para o que o operador pode remediar, não para ruído do enlace.
2. **Registrar a linha recusada** em todo `error:`/`ALARM:` (histórico e
   "copiar diagnóstico", na forma `(cmd: $I)`) — a próxima coleta não precisa de
   arqueologia.
3. Preservar as letras cruas de `[OPT:…]` (`H`), que sumiam do relatório.

Ainda **sem evidência** (defesa implementada, sintoma não observado): firmware
que recuse `$J=`. Na C1 o jog dedicado funciona (§11.3) — o `useDollarJog` era
documentado e ignorado, agora é respeitado, e há degradação automática para
`G91`/`G0`/`G90` se algum firmware recusar.

### 11.8 Porta morta: o app ficava "conectado" 46 s numa porta que não existia

O mesmo job do §11.5 termina assim (log `session-2026-10-18_21-38-15.log`):

```
21:45:21.302  << ALARM:1
21:45:21.303  [job] state=aborted sent=4554 total=4554
21:45:21.308  << Grbl 1.3a ['$' for help]        ← o controlador REINICIOU
              (46 s de silêncio absoluto — sem `disconnected`, sem erro)
21:46:07.406  [conn] disconnected
21:46:07.406  [error] Conexão encerrada: bad file descriptor
```

O reset faz o CDC USB re-enumerar: o fd do app morre, mas no Linux os writes
para o tty continuam **aceitos** por dezenas de segundos. Nesse intervalo o app
seguia "conectado": DRO congelado, polling de `?` batendo no vazio e o operador
sem saber que o enlace tinha ido embora. `bad file descriptor` aparece em **6
logs** de sessão — não é caso isolado.

Correção (vigia de silêncio, §11.6.4):

| Regra | Porquê |
| :--- | :--- |
| Sedo ≥ 5 s sem **nenhum** status (`?`) → **enlace caído** | o GRBL responde **todo** `?`; silêncio em repouso é porta morta |
| Só com job **em curso** (`running`/`paused`) o silêncio é esperado | um stall de job (8 s reais na coleta) é do **job**, e o vigia de `ok` já cobre. Depois de `finished`/`aborted` o silêncio volta a ser anomalia — foi **exatamente** o caso da coleta (o `ALARM:1` abortou o job e a porta morreu em seguida, 46 s mentindo) |
| Avisa no console e volta a `disconnected` | a UI para de mentir; o botão de conexão reconecta (a porta pode voltar como `ttyACM1`) |
| Sem código GRBL → **não** entra no histórico de alarmes | não é alarme da máquina; é o enlace (RF-STA-7 é para o que o operador remedia) |
| `SerialTransport.close()` resolve mesmo sem callback | com o fd morto o `close` pode nunca chamar de volta — travaria a UI em "conectado" |

Os 5 s são folgados de propósito: a máquina responde `?` mesmo em movimento —
inclusive durante o homing (`<Home\|MPos:-100.088,…\|Pn:XY>`, dos 7 `$H` reais
nos logs). Silêncio assim só se explica por enlace caído.

Testes: `tests/grbl-client.test.ts` (avisa/desconecta/para o polling; **não**
dispara com job em curso; e vale depois de `finished`/`aborted`) e
`tests/serial-transport.test.ts` (callback ausente e escrita em voo no
fechamento).

Dois desfechos de job que a caça revelou de lambuja: `stopJob()` checava só
`state === 'idle'` (com um job terminado ainda mandaria **soft reset** e
derrubaria a origem) e um `ALARM` depois do fim reemitia `aborted`. Ambos agora
usam a mesma noção de "job em curso" (`running`/`paused`).

*Spec criada em 18/10/2026 para a v0.6 (P0.7/P0.8). Primeira revisão com dados de
máquina real feita na mesma data (§11) — Sculpfun C1.*
