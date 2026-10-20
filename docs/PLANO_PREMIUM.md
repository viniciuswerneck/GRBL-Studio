# GRBL Studio — Plano para ser o melhor controlador laser do mercado

> **Atualizado em 18/10/2026 (v0.8.0)** — refeito depois do comparativo de
> mercado (`ANALISE_COMPETITIVA.md` §7), que revelou um rival novo: o
> **Rayforge** (MIT, multiplataforma, muito completo e ativo). *Status
> reconciliado com o código em 19/10/2026.*
>
> Complementa `PLANO_DE_ACAO.md` (fases 0–8), `PRODUCT_SPEC.md` (RF/RNF),
> `ANALISE_COMPETITIVA.md` (§7 = mercado) e `PLANO_QR_BARCODE.md` (detalhe S1–S3).
> A **execução por versão** (v0.6 → v1.0, com checklist) está em
> [`ROADMAP.md`](ROADMAP.md).
>
> Os IDs (**P2.7**, **P3.1**, …) são **estáveis** — outros documentos os citam.
> A **ordem** das fases segue a prioridade de hoje e é refletida no `ROADMAP.md`.

---

## 1. O que significa "melhor de todos" (definição honesta)

"Não perder para ninguém em nada" é impossível: o LightBurn domina galvo/fibra
(marcadoras industriais) e o Rayforge tem um CAD paramétrico completo. Perseguir
tudo de uma vez dilui o produto e quebra os orçamentos de performance.

**Definição em três arenas:**

| Arena | Meta | Justificativa |
| :-- | :-- | :-- |
| **A. Gratuito e código aberto** | **#1 sem discussão** | Hoje basta vencer LaserGRBL, MeerK40t (em manutenção), LaserWeb4 (parado), UGS/gSender (são *senders*, não software a laser) — e **superar o Rayforge** naquilo que importa ao usuário de diodo. |
| **B. GRBL / diodo (nosso público)** | **#1 em confiabilidade, velocidade e fluxo de fabricação** | É onde o app já nasceu forte e onde nenhum rival junta: protocolo testado + imagem otimizada + ferramentas prontas. |
| **C. Geral (inclui pago/industrial)** | **Melhor da categoria no fluxo GRBL**; galvo/DSP e nuvem **fora de escopo** | Comprar briga com LightBurn em Ruida/fibra exige outro produto — e não agrega ao público-alvo. |

**A tese (o "fosso"):** *nenhum concorrente junta, no mesmo app grátis,*
**confiabilidade medida** (não travar máquina) **+ leveza premium** (abre rápido,
100 ms, 11 temas, 3 idiomas) **+ fabricação integrada** (teste de material,
**QR/código de barras**, **lote com dados variáveis**) **+ zero amarras** (MIT,
offline, sem conta, sem nuvem, sem limite de arquivo, multiplataforma).

Ganha-se por **combinação**, não por copiar o LightBurn recurso a recurso.

---

## 2. Placar de liderança (onde temos de ser #1 ou empatar no topo)

| Critério | Líder hoje | Nossa meta | Como provar |
| :-- | :-- | :-- | :-- |
| Confiabilidade de protocolo (0 travamentos) | ninguém publica | **#1 absoluto** | 808 testes, E2E de job/protocolo no CI, 0 issues "travou" |
| Startup / RAM / FPS / DPI | ninguém publica | **#1 medido** | benchmark publicado (badge no README) — RNF-11/12 |
| Pipeline de imagem (tempo por peça) | LaserGRBL / LightBurn | **#1** | benchmark por material (mesma máquina, mesmo arquivo) |
| Fluxo "abrir → gravar" | LightBurn | **#1 (≤ 3 cliques)** | teste cronometrado, gravado em vídeo |
| Fabricação integrada (material test, QR, barcode, lote) | LightBurn (*Bar Code*) / xTool | **#1 no segmento aberto**; empatar com o LightBurn | recursos + demo (lote ✅) |
| Camadas / multi-operação | LightBurn / Rayforge | **paridade** | gravar + cortar numa passada |
| Import vetorial (SVG/DXF/PDF) | Rayforge | **paridade** | abrir os mesmos arquivos |
| Simulação de job | Rayforge (3D) | **paridade (2D + tempo)** | play/pause/seek antes de gravar |
| Câmera / rotativa | LightBurn / Rayforge | **paridade em 12 meses** | peça real alinhada / cilindro gravado |
| Catálogo de máquinas | LightBurn | **paridade (30+ e import `.lbdev`)** | conectar 5 modelos da lista |
| Distribuição (instalar em 1 passo em qualquer SO) | LightBurn | **#1** | AppImage/deb/**Flatpak**/winget/brew/AUR |
| Extensibilidade (API/CLI/plugins) | Rayforge / gSender | **paridade** | script headless + addon de exemplo |
| Preço e licença | empate (MIT) | **#1 (MIT, sem travas, sem plano Pro)** | comparativo público |
| Nuvem / AI / biblioteca de arte | xTool / Glowforge | **não competir** (decisão) | — |

---

## 3. Gap analysis (v0.12.0 → meta)

✅ = já entregue · ⬜ = a fazer

| Capacidade | Atual (v0.12.0) | Meta | Gap |
| :-- | :-- | :-- | :-- |
| Sistemas | Linux validado; Win/macOS empacotados | 3 SÓ validados em hardware | Médio |
| Ferramentas de desenho / texto / booleanas / offset | ✅ | manter e evoluir | Baixo |
| SVG (P1.6) · material test (P1.7) · Z no jog (P1.5) · auto-update (P1.2) | ✅ | manter | Baixo |
| Builds Win/macOS (P1.1) | ✅ no CI | + validação e assinatura de código | Médio |
| **Camadas / multi-operação (P2.2)** | ✅ (0.8.0) | gravar + cortar numa execução | Baixo |
| **Simulação de job (P2.3)** | ✅ (0.5.0) | playback + tempo | Baixo |
| **DXF/PDF (P2.4)** | ✅ DXF ASCII + PDF vetorial | manter/evoluir (texto em PDF) | Médio |
| **Catálogo de máquinas (P2.5)** | ✅ 22 perfis + Genérico | 30+ + import `.lbdev` + "smart connect" | Baixo |
| **QR Code / código de barras (P2.7/P2.8)** | ✅ (0.6.0/0.7.0) | 2 ferramentas em Ferramentas | Baixo |
| **Lote / dados variáveis (P2.10/RF-SYM-10)** | ✅ (20/10/2026) | CSV → fila de gravação (etiquetas) | Baixo |
| **Modo produção (P2.11/RF-GC-12)** | ✅ (20/10/2026) | repetir o job N vezes com contador e trava de UI | Baixo |
| **Teste de foco (P2.13/RF-IMG-13)** | ✅ (20/10/2026) | escada de Z com 2 potências por passo | Baixo |
| **Biblioteca de jobs (P2.9)** | ✅ (19/10/2026) | histórico com miniatura + re-executar | Baixo |
| Câmera (P3.1) / Rotativa (P3.2) | ⬜ | paridade LightBurn | Alto |
| Nesting | ✅ encaixe por caixa, MaxRects (20/10/2026) | encaixe irregular (peças fora de caixa) | Médio |
| Editor de G-code (P1.10) | ✅ | highlight + numeração + reenvio de trecho | Baixo |
| API REST/CLI/plugins (P3.3) | ⬜ | headless + addons | Alto |
| Flatpak (P1.3) · onboarding (P1.4) | manifesto pronto (**não publicado**) / ✅ | publicados | Baixo |
| Orçamentos RNF-11/12 (P1.8) | ✅ Linux (RNF-11: 269 MB X11 / 290 MB Wayland) | 3 SOs | Baixo |
| E2E de job/protocolo (Fase 8) | 49 casos (job, pausa, alarme, lote, produção, foco, presets, nesting…) | fluxo completo de job | Médio |
| i18n | 3 idiomas | 5+ (fr/de) | Baixo |
| Migração do renderer p/ TS (P3.6) | `renderer.js` vanilla | Svelte/electron-vite | Alto |

---

## 4. Fases de execução (na ordem de prioridade)

### Fase P0 — "Liderança agora" (1–2 semanas) · barato, alto retorno · **v0.6**

Objetivo: **provar** o que já somos e remover o atrito de entrada.

> **Estado (19/10/2026, v0.8.0):** **P0.2**, **P0.4**, **P0.5**
> (`docs/COMPARATIVO.md`), **P0.6**, **P0.7** (painel "Máquina") e **P0.8**
> (pré-voo MX-1…MX-15 + chip) **entregues**. **P0.1** segue só na **parte
> Linux** e com resultado honesto — CPU ociosa (**0,00 %** aos 10 min, com
> linha do tempo) e latência dentro, **startup e RAM acima do orçamento** nesta
> máquina (`docs/BENCHMARK.md` §6.4), FPS/DPI/`?` manuais e Windows/macOS sem
> medir. Aberto: **P0.3** (Flatpak/winget/brew/AUR).

| # | Entregável | Esforço | DoD |
| :-- | :-- | :-- | :-- |
| P0.1 | **Benchmark público** dos orçamentos (`docs/DEVELOPMENT.md` + badge no README) | S | Startup/RAM/FPS/DPI medidos em 3 SOs, tabela publicada. |
| P0.2 | **E2E de job/protocolo** (PTY/socat) no CI | M | Job completo com pausa/retomada/cancelamento/alarme verde no CI. |
| P0.3 | **Distribuição 1-clique**: Flatpak → Flathub, winget, brew tap, AUR (= P1.3) | M | `flatpak install` + `winget install` documentados. |
| P0.4 | **Onboarding** de primeira execução (P1.4) | S | Tour de 5 passos: conectar → perfil → abrir → preview → gravar. |
| P0.5 | **Comparativo público** (tabela de `ANALISE_COMPETITIVA.md` §7.5 no README/site) | S | Página publicada com data e fontes. |
| P0.6 | Cobertura do parser > 90 % + *fuzz* do protocolo | M | Nenhum crash com entrada corrompida. |
| P0.7 | **Painel "Máquina"** (`$I`/`$$`/`$#`/`$G`/`$N` → fatos + diagnóstico copiável) — M14/RF-MAQ-1…8 | M | Firmware, curso, limites, laser e offsets visíveis (com "não informado" quando faltar); "copiar diagnóstico" sem rede. |
| P0.8 | **Pré-voo MX-1…MX-15** antes de gravar + chip de pinos (`Pn`) | M | Cada regra com teste + fixture real (Sculpfun C1); `block` só no que o GRBL rejeita ou queima errado. |

### Fase P2 — "Paridade de produção" (4–6 semanas) · fecha o que trava o uso · **v0.7**

| # | Entregável | Esforço | DoD |
| :-- | :-- | :-- | :-- |
| ✅ P2.2 | **Camadas / multi-operação** (parâmetros por camada) — entregue na **0.8.0** | M | Gravar + cortar numa execução; reordenar arrastando; G-code com `M5`/troca de potência corretos. |
| ✅ P2.3 | **Simulação de job** (playback + tempo) — entregue na **0.5.0** | M | Play/pause/seek à velocidade real; reusa o preview. |
| ✅ P2.4 | **Importação DXF + PDF** — entregue (DXF ASCII e PDF vetorial) | M | Reusa `svg.ts`/pipeline de contornos; testes com arquivos gerados (blocos, object stream, rotação). Texto de PDF fica fora (fontes → curvas). |
| ✅ P2.5 | **Catálogo 30+ máquinas** + **import `.lbdev`** + **smart connect** — entregue (30 perfis, importação e sugestão na conexão) | S | Ao conectar, ler `$$` e sugerir o perfil; importar perfil do LightBurn. |
| ✅ P1.10 | **Editor de G-code** (realce + numeração + edição + validar + reenviar trecho) — entregue | M | Editar, validar e reenviar trecho. |
| ✅ P2.9 | **Biblioteca de jobs** (miniatura + re-executar + duplicar) — entregue | S | Últimos 50 jobs persistidos com parâmetros. |
| ✅ P2.14 | **Clicar no preview para mover** (pendência da v0.3) — entregue | S | Clique → `G0` para o ponto (com confirmação). |
| — | **Validar Win/macOS** em hardware real (+ assinatura de código) | M | Vídeo/relato por SO; instalador sem aviso de "desenvolvedor desconhecido". |

### Fase P2b — "Diferenciais que ninguém junta" (3–4 semanas) · o fosso
> QR (P2.7) e código de barras (P2.8) entram já na **v0.6** (junto com a Fase P0);
> lote/dados variáveis (**P2.10 ✅**) e modo produção (**P2.11 ✅**) — o resto
> fecha na **v0.8**.

| # | Entregável | Esforço | DoD |
| :-- | :-- | :-- | :-- |
| ✅ P2.7 | **Gerador de QR Code** (ISO/IEC 18004) — entregue na **0.6.0** | M | Conteúdo → matriz → G-code; ECC, mm, quiet zone, preview (**S1**). |
| ✅ P2.8 | **Gerador de código de barras** (Code 128/39, EAN-13/8, UPC-A) + HRI — entregue na **0.6.0** (extras na **0.7.0**) | M | Checksum + quiet zone + texto legível (**S2**). |
| ✅ P2.10 | **Lote / dados variáveis**: CSV/planilha → **fila de gravação** — entregue (RF-SYM-10) | M | Cada linha = 1 peça (QR/código de barras com modelo de campos), pausa para trocar a peça, contador e retomada. ⇢ *nenhum concorrente grátis faz isso completo*. |
| ✅ P2.11 | **Modo produção**: repetir job N vezes, contador, trava de UI — entregue (RF-GC-12, 20/10/2026) | S | Ciclo contínuo seguro (pausa/emergência sempre acessíveis). |
| ✅ P2.12 | **Presets de material** — entregue (RF-IMG-14, 20/10/2026) | S | Salvar/aplicar/excluir receitas, dose (J/mm) e **JSON** para compartilhar; o repositório oficial fica para depois (sem rede por enquanto). |
| ✅ P2.13 | **Teste de foco / spot** (2 linhas de potência) — entregue (RF-IMG-13, 20/10/2026) | S | Determinar o melhor foco por material. |

### Fase P3 — "Pro features" (8–12 semanas) · paridade com LightBurn/Rayforge · **v0.9**

| # | Entregável | Esforço | DoD |
| :-- | :-- | :-- | :-- |
| P3.1 | **Câmera** (captura USB + alinhamento visual) | L | Overlay da peça; posicionar arrastando. |
| P3.2 | **Rotativa (eixo A)** | L | Jog e job em cilindro; calibração por diâmetro. |
| ✅ P3.7 | **Nesting** (encaixe por caixa: MaxRects, margem, folga e rotação 90°) — entregue; encaixe irregular em aberto | M | Aproveitamento de chapa demonstrado. |
| P3.4 | **Preview WebGL** (arquivos gigantes) | M | 14 M de linhas sem travar; fallback canvas. |
| P3.5 | **Telemetria opt-in** + crash reporting (Sentry/GlitchTip) | S | Diagnóstico de campo; 0 dados sem consentimento. |
| P3.6 | **Migração do renderer para TS** (Svelte + electron-vite) | XL | ADR-2 concluído; `renderer.js` sai do repo; bundling instantâneo. |

### Fase P4 — "Ecossistema" (contínuo) · **v1.0**

| # | Entregável | Esforço | DoD |
| :-- | :-- | :-- | :-- |
| P4.1 | **API REST/WebSocket + CLI headless** | L | Automatizar lote, Raspberry Pi, integração (paridade LightBurn 2.2 REST / Rayforge CLI). |
| P3.3 | **Sistema de plugins/scripts** (generaliza macros) | L | API documentada + 3 exemplos. |
| P4.2 | **i18n fr/de (+ it/ru)** | M | Paridade garantida por type-check. |
| P4.3 | **Manual do usuário, vídeos e site** com comparativo e benchmarks | M | Publicados e linkados no app. |
| P4.4 | **Integração com Inkscape** (watch/round-trip) | M | Salvar no Inkscape → atualiza no app. |
| P4.5 | Mobile companion (status + pausa) | L | **avaliar**; só se as fases anteriores estiverem verdes. |

---

## 5. Os 5 invariantes (o que nunca será negociado)

1. **Nunca travar a máquina** — janela por bytes, comandos de tempo real
   corretos, parada de emergência sempre acessível; coberto por testes + E2E.
2. **Nunca perder precisão** — 0,001 mm, sem arredondar G-code do usuário.
3. **Nunca mais de 3 cliques** para abrir → gerar → gravar; interação ≤ 100 ms.
4. **Nada de amarras** — offline, sem conta, sem nuvem, sem limite de arquivo,
   sem plano Pro, MIT, 3 SOs.
5. **Todo erro com causa + solução** — nunca uma caixa vermelha sem saída.

---

## 6. Métricas de sucesso (KPIs)

| Métrica | Meta | Como medir |
| :-- | :-- | :-- |
| Startup | ≤ 1,5 s | `performance.now()` no bootstrap |
| RAM após 10 min | ≤ 280 MB (X11) / 300 MB (Wayland), PSS | `scripts/bench.mjs` |
| CPU ociosa | ≈ 0 % | DevTools Performance |
| Resposta a clique/tecla | ≤ 100 ms | DevTools interaction |
| Latência de status (`?`) | ≤ 200 ms | parser → paint |
| FPS durante job | ≥ 55 | DevTools FPS meter |
| Preview (50k linhas) | ≤ 2 s (1º) / ≤ 16 ms (job) | `performance.now()` |
| **Tempo até o 1º job** | ≤ 5 min (leigo) | teste com usuário novo |
| **Issues "travou a máquina"** | 0 por release | issue tracker |
| Adoção | +50 % downloads/release | GitHub insights |
| Satisfação | NPS ≥ 50 | pesquisa opt-in in-app |

---

## 7. Riscos e mitigações

| Risco | Prob. | Impacto | Mitigação |
| :-- | :-- | :-- | :-- |
| **Rayforge avança mais rápido** | Alta | Alto | Focar no fosso (§1) e publicar prova (benchmark/comparativo); não correr atrás de tudo. |
| Escopo inflar (*feature creep*) | Alta | Alto | Gate de fases + DoD rígido; priorizar por valor × esforço. |
| Multi-OS sem hardware | Média | Alto | CI matrix + beta testers por plataforma; marcar "beta" até validar. |
| Câmera/rotativa mais complexas que o previsto | Alta | Médio | Protótipo isolado antes de comprometer; *spike* de 1 semana. |
| Migração do renderer quebrar a UI (P3.6) | Média | Alto | Migração incremental; vanilla como *fallback*. |
| Perda de foco no core | Média | **Crítico** | Protocolo é pré-requisito de tudo; invariantes da §5. |
| Manutenção dos bundles gerados | Média | Médio | P3.6 (electron-vite) elimina o atrito. |
| Depender de dongle/assinatura paga | Baixa | Médio | Assinatura de código é opcional; nunca bloquear o uso. |

---

## 8. Ordem de execução (caminho crítico)

```
v0.6 (0–30 dias)  P0.1 benchmark ─┐
                  P0.2 E2E job ───┤
                  P0.3 Flatpak ───┼──► P2.7 QR ──► P2.8 CÓDIGO DE BARRAS   ◄── o fosso já na 1ª entrega
                  P0.4 onboarding ┤    └──► Fase 7/8 restante (polish, cobertura, hardware)
                  P0.5 comparativo┘
                  P0.6 fuzz ──────┼──► P0.7 PAINEL MÁQUINA ──► P0.8 PRÉ-VOO (MX)
v0.7 (30–75 dias) P2.2 CAMADAS ──► P2.3 SIMULAÇÃO ──► P2.4 DXF/PDF ──► P2.5 CATÁLOGO ──► P1.10 ──► P2.9 ──► validação Win/macOS
v0.8              P2.10 LOTE/DADOS VARIÁVEIS ──► P2.11 MODO PRODUÇÃO ──► P2.12 PRESETS ──► P2.13 FOCO
v0.9              P3.1 CÂMERA ──► P3.2 ROTATIVA ──► P3.7 NESTING ──► P3.4 WebGL ──► P3.5 ──► P3.6 TS
v1.0              P4.1 API/CLI ──► P3.3 PLUGINS ──► P4.2 i18n ──► P4.3 DOCS/SITE ──► P4.4 INKSCAPE
```

> **Entregue até 19/10/2026:** P0.2, P0.4, P0.5, P0.6, P0.7, P0.8, P2.2
> (0.8.0), P2.3 (0.5.0), **P2.4 (DXF + PDF)**, **P2.5 (catálogo 30+ + `.lbdev`
> + smart connect)**, P2.7 e P2.8 (0.6.0), as simbologias extras S2/S3
> (0.7.0), o **Aztec** (0.10.0), o **editor de G-code (P1.10)** e a
> **biblioteca de jobs (P2.9)**. Do **v0.7** resta a validação Win/macOS (e os
> itens de polish/hardware da Fase 7/8).

**v0.6 (primeiros 30 dias):** P0.1–P0.8 (provar + distribuir + **conhecer a
máquina**) **e** P2.7 QR → P2.8 código de barras — o diferencial que nenhum
concorrente grátis tem, junto com o que falta da Fase 7/8 (polish, cobertura,
teste em hardware).

**v0.7 (30–75 dias):** P2.2 camadas ✅ (0.8.0), P2.3 simulação ✅, P2.4 DXF/PDF ✅,
P2.5 catálogo + `.lbdev` + smart connect ✅, P1.10 editor de G-code ✅, P2.9
biblioteca de jobs ✅ e validação Win/macOS.

**v0.8:** P2.10 lote/dados variáveis ✅, P2.11 modo produção ✅, P2.13 teste de
foco ✅ e P2.12 presets ✅.

**v0.9 / v1.0 (90+ dias):** P3.1 câmera, P3.2 rotativa, P3.7 nesting, P3.4 WebGL,
P3.5 telemetria, P3.6 migração TS, P4.1 API/CLI, P3.3 plugins, P4.2 i18n,
P4.3 docs/site, P4.4 Inkscape.

---

## 9. Definição de "melhor de todos" (critério de aceite)

Consideramos a meta atingida quando, **na mesma máquina e material**, um usuário
novo conseguir (e nós comprovarmos por vídeo/benchmark):

1. Instalar em **< 2 min** em qualquer SO, sem Wine, sem terminal.
2. Gravar uma **imagem** em **≤ 3 cliques** com qualidade/tempo ≥ LightBurn.
3. Gravar uma **etiqueta com QR/código de barras** em ≤ 3 cliques — algo que
   **nenhum concorrente grátis** faz ponta a ponta.
4. **Gerar 20 etiquetas variáveis** de uma planilha, trocando a peça com pausa.
5. Gravar + **cortar** o mesmo desenho numa execução (camadas).
6. **Ver o resultado antes** (simulação) e nunca travar a máquina.
7. Trabalhar em **pt-BR/en/es** com aparência de produto premium.
8. Fazer tudo isso **grátis, offline e sem conta**.

E quando o placar da §2 estiver **#1 em A e B** e **em empate no topo** nos
critérios de paridade — com os números da §6 publicados.

---

## 10. O que NÃO vamos fazer (por decisão)

| Fora de escopo (agora) | Por quê |
| :-- | :-- |
| Galvo / fibra / DSP (Ruida, Trocen, EZCAD, Epilog) | Outro produto e outro público (marcação industrial); exigiria outro core de comunicação. |
| Nuvem, AI generativa, marketplace de artes | Amarras que negam o posicionamento "offline, sem conta"; xTool/Glowforge já dominam. |
| Assinatura / plano Pro | O diferencial é ser MIT sem travas — o comparativo usa isso a nosso favor. |
| Suporte a Marlin/LinuxCNC/Mach4 | Somos GRBL (diodo). Dialetos extras diluem o foco. |
| App mobile próprio | Só depois de P4.1 (API) — o celular vira cliente da API, não um app novo. |

---

*Plano criado em 17/10/2026, reescrito em 18/10/2026 (v0.5.1) com o
comparativo de mercado e **reconciliado em 19/10/2026 (v0.8.0)**; revisar a cada
release.*
