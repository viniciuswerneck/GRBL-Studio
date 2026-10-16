---
name: Fluent UI (Windows 11)
description: Criar ou revisar a interface do GRBL Studio seguindo o design system Windows 11 (Fluent) e os orçamentos de performance/precisão.
---

# Skill: Interface Fluent (Windows 11)

Use esta skill ao criar, alterar ou revisar qualquer tela, componente, estilo,
animação ou layout do renderer.

## Fonte da verdade

- `../../../docs/DESIGN.md` — sistema completo (tokens, materiais, animações,
  tabela de performance, checklist visual §8).
- `../../../AGENTS.md` — orçamentos RNF-11/12.
- `../../../docs/ARCHITECTURE.md` — separação de camadas.

## Princípios

1. **Parece Windows 11**: cantos 4 px (botões) / 8 px (cards), sombras de 2
   camadas, cor de acento, tipografia Segoe UI Variable (fallback
   `Inter`/`system-ui`), ícones Fluent SVG.
2. **Rápido e leve**: use **tokens** (`tokens.css`), não valores soltos;
   nada de lib de UI pesada sem checar perf (ADR-11).
3. **Preciso**: DRO em 0,001 mm com `tabular-nums`; canvas com
   `devicePixelRatio`; nítido em DPI 100/125/150/200 %.

## Regras de performance (obrigatórias)

- `backdrop-filter` **só** em overlays pequenos (menus/dropdowns/toasts); nunca
  na janela inteira (Mica ≈ gradiente estático de baixo custo).
- Anime **apenas** `transform`/`opacity`; nunca `width/top/left`.
- Não redesenhe a UI a cada byte serial — *throttle* para ~10–20 Hz.
- Console com **virtual scrolling**; preview em `<canvas>`.
- Pause timers/polling quando desconectado; sem `setInterval` órfão.
- Respeite `prefers-reduced-motion`.

## Motion (Fluent)

| Interação | Duração / easing |
| :--- | :--- |
| Hover de botão | 150 ms `cubic-bezier(.33,0,.67,1)` |
| Clique | 80 ms, `scale(0.98)` |
| Troca de painel | 200 ms, fade + slide 8 px |
| Dropdown/tooltip | 150 ms, fade + Y 4 px |
| Toggle | 200 ms `ease-out` |

## Estados de todo controle

Normal · Hover · Pressed · Focused (anel de 2 px na cor de acento) · Disabled.
Alvo de clique ≥ 32 px (40 px no jog). Contraste AA (4.5:1 texto / 3:1 UI).

## Workflow

1. Verifique se existem tokens para o que você precisa; se não, **adicione em
   `tokens.css`** (fonte única) em vez de hardcode.
2. Construa o componente com os 5 estados e acessível por teclado.
3. Teste nos temas claro/escuro e em DPI 100 % e 150 %.
4. Meça: interação ≤ 100 ms, ≥ 55 fps com job rodando, RAM estável.
5. Rode o **checklist visual §8 do DESIGN.md**.

## Checklist de conclusão

- [ ] Usa tokens; nenhum valor de cor/espaço solto.
- [ ] 5 estados presentes e foco visível.
- [ ] Sem `backdrop-filter` amplo; animação só em transform/opacity.
- [ ] DPI fracionário sem blur; DRO estável em 0,001 mm.
- [ ] Tema claro e escuro corretos; troca sem flash.
- [ ] Orçamentos de `DESIGN.md` §3 preservados.
