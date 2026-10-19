# Comparativo público — GRBL Studio × mercado (outubro/2026)

> **Página pública (P0.5).** Levantamento feito em **18/10/2026** a partir de
> sites oficiais, changelogs e fóruns; **reconciliado com o código em
> 19/10/2026 (v0.8.0)**. Versões e preços mudam: confira a fonte
> antes de decidir. A análise completa (13 programas, 24 critérios e as fontes
> linha a linha) está em [`ANALISE_COMPETITIVA.md`](ANALISE_COMPETITIVA.md)
> §7.5 e §8.
>
> **Critério:** a tabela compara **capacidade publicada**, não qualidade de
> implementação. Onde o GRBL Studio é mais raso que o rival, está dito.

## Resumo

| | **GRBL Studio** | LightBurn 2.x | Rayforge 1.13 | LaserGRBL 7.14 | MeerK40t 0.9.9 | xTool Studio 1.9 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Preço** | Grátis | US$ 99 (Core) / 199 (Pro) + US$ 40/ano de updates | Grátis | Grátis | Grátis | Grátis (só xTool) |
| **Licença** | MIT | Fechado | MIT | GPLv3 | MIT | Fechado |
| **Linux nativo** | ✅ | ✅ | ✅ | ❌ (Wine) | ✅ | ❌ |
| **Windows / macOS** | ✅ (builds de CI; sem validação em hardware publicada) | ✅ | ✅ | só Windows | ✅ | ✅ |
| **GRBL 1.1** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (protocolo próprio) |
| **DSP / galvo (Ruida, EZCad)** | ❌ | ✅ (Pro) | Ruida (exp.) | ❌ | ✅ | ✅ (fibra) |
| **Design 2D / CAD** | ✅ básico-médio (prancheta, booleanas, offset, texto, matriz) | ✅ completo | ✅ **paramétrico** | ❌ | 🟡 (SVG) | ✅ |
| **Import vetorial** | 🟡 SVG/DXF | ✅ SVG/DXF/AI/PDF/3D | ✅ SVG/DXF/PDF/AI/EPS/HPGL/`.lbrn2`/`.rd` | 🟡 SVG (exp.) | 🟡 SVG/DXF | 🟡 SVG/DXF |
| **Camadas / multi-operação** | ✅ (parâmetros por camada + ordem de execução) | ✅ | ✅ | ❌ | ✅ | ✅ (16 camadas) |
| **Nesting / matriz** | 🟡 matriz de cópias (sem nesting) | ✅ Quick + True (Pro) | 🟡 padrões | ❌ | ❌ | ✅ Smart Nesting |
| **Câmera / rotativa** | ❌ | ✅ / ✅ | ✅ / ✅ (4 eixos) | ❌ / ❌ | ✅ / ✅ | ✅ / ✅ |
| **Simulação de job** | ✅ (2D: playback + tempo, desde a 0.5.0) | ✅ | ✅ 3D | 🟡 (preview/tempo) | ✅ | ✅ 3D |
| **QR Code / Data Matrix / código de barras** | ✅ (v0.7.0: 9 simbologias 1D + QR + Data Matrix) | ✅ (Bar Code) | ❌ | ❌ | ❌ | ✅ (com lote) |
| **Grade de teste de material** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Preview com intensidade `S`** | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ |
| **Perfis de máquina / materiais** | 22 perfis + Genérico GRBL / catálogo de materiais | ✅ dezenas + `.lbdev` | ✅ 60+ | ✅ dezenas (COM) | ✅ vários | ✅ (só xTool) |
| **i18n** | 3 (pt-BR, en, es) | vários | 7 | vários | vários (inclui pt) | vários |
| **Temas de interface** | 11 (Fluent/Win 11, 2 de alto contraste) | ✅ | ✅ (GTK) | básico | básico | ✅ |
| **Plugins / CLI / API** | ❌ | ✅ REST API | ✅ addons + CLI | ❌ | 🟡 console/CLI | ❌ |
| **Nuvem / IA / biblioteca de artes** | ❌ (tudo local, sem conta) | ❌ (local) | 🟡 IA opcional | ❌ | ❌ | ✅ |
| **Diagnóstico da máquina / pré-voo** | ✅ painel `$I/$$/$#/$G/$N` + pré-voo MX-1…15 antes de gravar | 🟡 console | ❌ | 🟡 console | 🟡 console | 🟡 |
| **Robustez de protocolo testada** | ✅ **689 testes + E2E Playwright** (janela por bytes, tempo real, alarmes) | *n/d* | *n/d* | ❌ | *n/d* | *n/d* |
| **Status do projeto** | Ativo | **Muito ativo** | **Muito ativo** | Lento (só Windows) | Manutenção | **Muito ativo** |

✅ tem · 🟡 parcial/limitado · ❌ não tem · *n/d* não publicado.

## Onde ganhamos

1. **Aberto, leve e sem amarras** — MIT, sem conta, sem nuvem, sem limite de
   arquivo e sem plano Pro. Roda nativo em Linux, Windows e macOS.
2. **Robustez de protocolo** — janela de envio medida em bytes (nunca estoura o
   buffer), comandos de tempo real corretos, alarmes com ação recomendada e uma
   suíte com 689 testes unitários/integração + E2E Playwright, incluindo job real
   por PTY. Nenhum rival publica esse nível de verificação.
3. **Fabricação de peças integrada** — desenho 2D, booleanas, contorno paralelo,
   grade de teste de material e **QR/Data Matrix/código de barras** no mesmo
   controlador, sem exportar para outro programa.
4. **Pipeline de imagem** — velocidade adaptativa, zigue-zague, fusão de trechos
   e pulo de linhas brancas.
5. **Aparência e idioma** — 11 temas Fluent/Windows 11, pt-BR/en/es com paridade
   garantida por type-check, tour de boas-vindas e Modo Básico.

## Onde perdemos (e está no plano)

1. **Câmera e rotativa** — presentes no LightBurn, Rayforge, MeerK40t e xTool.
2. **Simulação 3D** — Rayforge e LightBurn mostram o resultado em 3D antes de
   gravar; nós já temos o playback 2D com tempo (P2.3).
3. **Importação vetorial** — SVG e DXF ASCII; Rayforge lê também PDF/AI/EPS/HPGL.
4. **Catálogo de máquinas** — 22 perfis contra dezenas; importar `.lbdev` ainda
   não existe.
5. **Nesting, API/CLI e plugins** — ausentes.
6. **Maturidade fora do Linux** — os builds de Windows/macOS passam no CI, mas
   não há validação publicada em hardware.

## Orçamentos de performance (medidos, não prometidos)

| Métrica | Orçamento (RNF-11/12) | Medido (out/2026) | Situação |
| :--- | :--- | :--- | :--- |
| Startup | ≤ 1,5 s | 1,58 s (execução de 10 min); 1,78 s (mediana A/B) | ⚠️ acima |
| RAM (10 min) | ≤ 200 MB | acima (ver `docs/BENCHMARK.md`) | ⚠️ acima |
| CPU ociosa | ≈ 0 % | 0,00 % | ✅ |
| Latência de status | ≤ 200 ms | p95 2,6 ms | ✅ |
| Resposta a interação | ≤ 100 ms | dentro (ver §6 do benchmark) | ✅ |

Números absolutos dependem da máquina e da carga; o método, o ambiente e os
números brutos estão em [`BENCHMARK.md`](BENCHMARK.md). Publicamos também o que
**não** está dentro do orçamento.

## Fontes

As fontes por afirmação (site oficial, changelog, fórum e data da consulta)
estão em [`ANALISE_COMPETITIVA.md`](ANALISE_COMPETITIVA.md) §8. Resumo:

- **LightBurn** — páginas de versões/licença e *What's New in 2.2* (set–out/2026).
- **Rayforge** — documentação e releases 1.13 (out/2026).
- **LaserGRBL** — site e changelog 7.14 (2026).
- **MeerK40t** — wiki e releases 0.9.9.
- **xTool Studio** — páginas de recursos e notas de versão 1.9.
- **GRBL Studio** — este repositório: `docs/PRODUCT_SPEC.md`,
  `docs/FEATURES_COMPARISON.md`, `docs/BENCHMARK.md` e a suíte de testes.

> Correções são bem-vindas: abra uma issue com o link da fonte. Preços em USD,
> sem impostos.
