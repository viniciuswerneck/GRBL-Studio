/**
 * Aplica o tema **antes do primeiro paint** (RF-APP-1 / `DESIGN.md` §8).
 *
 * O app guarda o tema nas preferências (no processo main), que só chegam de
 * forma assíncrona — aplicá-las depois causaria um **flash** do tema padrão.
 * Este script é carregado de forma **síncrona** no `<head>` e aplica o tema
 * que o próprio app deixou no `localStorage` (`applyTheme` grava lá), então a
 * primeira pintura já sai na cor certa.
 *
 * É deliberadamente mínimo e **sem dependências**: a lista de temas vive em
 * `src/shared/themes.ts`; aqui só se confia no valor gravado pelo app (um id
 * desconhecido cai no tema base, que é o escuro — o `:root` do `tokens.css`).
 */
try {
  const id = localStorage.getItem('grbl-theme');
  if (id && /^[a-z0-9-]{1,32}$/.test(id)) {
    document.documentElement.setAttribute('data-theme', id);
  }
} catch {
  /* localStorage bloqueado: segue com o tema base. */
}
