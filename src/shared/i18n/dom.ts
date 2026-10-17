/**
 * Aplicação de i18n no DOM (apenas renderer; nunca importado pelo main).
 *
 * Atributos suportados:
 *  - `data-i18n="chave"`          → primeiro nó de texto (substitui o texto
 *    mantendo elementos filhos, ex.: `<input>` dentro do `<label>`).
 *  - `data-i18n-title="chave"`    → `title`
 *  - `data-i18n-placeholder="chave"` → `placeholder`
 *  - `data-i18n-aria="chave"`     → `aria-label`
 *
 * O texto original do HTML permanece em pt-BR (fallback antes do primeiro
 * `applyDom`), o que mantém o markup legível e sem flash para pt-BR.
 */
import { t } from './index';

const TEXT_ATTR = 'data-i18n';
const TITLE_ATTR = 'data-i18n-title';
const PLACEHOLDER_ATTR = 'data-i18n-placeholder';
const ARIA_ATTR = 'data-i18n-aria';

/** Troca o primeiro nó de texto significativo, preservando os filhos. */
function setText(node: Element, key: string): void {
  const text = t(key);
  for (const child of node.childNodes) {
    if (child.nodeType === 3 && (child.textContent ?? '').trim() !== '') {
      child.textContent = text;
      return;
    }
  }
  node.textContent = text;
}

/** Traduz todos os marcadores de `root` (padrão: documento inteiro). */
export function applyDom(root: ParentNode = document): void {
  for (const node of root.querySelectorAll(`[${TEXT_ATTR}]`)) {
    const key = node.getAttribute(TEXT_ATTR);
    if (key) setText(node, key);
  }
  for (const node of root.querySelectorAll(`[${TITLE_ATTR}]`)) {
    const key = node.getAttribute(TITLE_ATTR);
    if (key) (node as HTMLElement).title = t(key);
  }
  for (const node of root.querySelectorAll(`[${PLACEHOLDER_ATTR}]`)) {
    const key = node.getAttribute(PLACEHOLDER_ATTR);
    if (key) (node as HTMLInputElement).placeholder = t(key);
  }
  for (const node of root.querySelectorAll(`[${ARIA_ATTR}]`)) {
    const key = node.getAttribute(ARIA_ATTR);
    if (key) node.setAttribute('aria-label', t(key));
  }
}
