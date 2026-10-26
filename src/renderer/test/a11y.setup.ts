/**
 * Setup axe-core para testes de acessibilidade (P1-4).
 * Configura regras WCAG 2.1 AA e ignora `color-contrast` em temas
 * alto contraste (testado separadamente via snapshot visual).
 */
import { configureAxe } from 'vitest-axe';

configureAxe({
  rules: {
    // Regras WCAG 2.1 AA obrigatórias
    'color-contrast': { enabled: false }, // Testado separadamente em temas HC
    'image-alt': { enabled: true },
    label: { enabled: true },
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'role-img-alt': { enabled: true },
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'document-title': { enabled: true },
    'landmark-one-main': { enabled: true },
    region: { enabled: true },
    'heading-order': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'focus-visible': { enabled: true },
    keyboard: { enabled: true },
    tabindex: { enabled: true },
    'aria-focus': { enabled: true },
    'aria-toggle-field-name': { enabled: true },
    'aria-meter-name': { enabled: true },
    'aria-progressbar-name': { enabled: true },
    'scrollable-region-focusable': { enabled: true },
  },
  // Tags para filtrar apenas regras WCAG 2.1 AA
  tags: ['wcag2aa', 'wcag21aa', 'best-practice'],
});

/**
 * Helper para rodar axe num componente Svelte montado.
 * Uso:
 *   import { render } from '@testing-library/svelte';
 *   import { axe } from 'vitest-axe';
 *   import Component from './Component.svelte';
 *
 *   test('acessível', async () => {
 *     const { container } = render(Component);
 *     const results = await axe(container);
 *     expect(results.violations).toHaveLength(0);
 *   });
 */
export { configureAxe };
