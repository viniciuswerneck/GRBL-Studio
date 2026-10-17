/**
 * Núcleo i18n do GRBL Studio (RF-APP-2): pt-BR, en e es.
 *
 * - **Puro e sem DOM**: importável pelo `main` (mensagens do `GrblClient`,
 *   diálogos, menu) e pelo renderer (via `public/i18n.js`, gerado pelo
 *   esbuild a partir de `entry.ts`).
 * - Paridade de chaves garantida por **type-check** (`satisfies` em en/es)
 *   e reforçada por `tests/i18n.test.ts`.
 * - Sem lib externa (orçamento RNF-11: leveza).
 */
import { en } from './en';
import { ptBR } from './pt-BR';
import { es } from './es';

export type { MessageKey } from './pt-BR';

/** Idiomas suportados. */
export type Lang = 'pt-BR' | 'en' | 'es';

export const LANGS: readonly Lang[] = ['pt-BR', 'en', 'es'];

/** Idioma de fallback do projeto. */
export const DEFAULT_LANG: Lang = 'pt-BR';

type Catalog = Record<string, string>;

const CATALOGS: Record<Lang, Catalog> = {
  'pt-BR': ptBR as unknown as Catalog,
  en: en as unknown as Catalog,
  es: es as unknown as Catalog,
};

let current: Lang = DEFAULT_LANG;
const listeners = new Set<(lang: Lang) => void>();

/** `true` se `value` é um idioma suportado. */
export function isLang(value: unknown): value is Lang {
  return value === 'pt-BR' || value === 'en' || value === 'es';
}

/** Idioma ativo. */
export function getLocale(): Lang {
  return current;
}

/**
 * Troca o idioma. Retorna `false` se o valor não for suportado (a troca
 * inválida é ignorada em vez de deixar a UI sem tradução).
 */
export function setLocale(lang: unknown): boolean {
  if (!isLang(lang) || lang === current) return isLang(lang);
  current = lang;
  for (const listener of listeners) listener(lang);
  return true;
}

/** Observa trocas de idioma. Retorna a função que cancela a inscrição. */
export function onLocaleChange(listener: (lang: Lang) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Mapeia o locale do sistema (`app.getLocale()`) para um idioma suportado.
 * Desconhecido (ex.: `de`, `fr`) cai em `en` — padrão internacional.
 */
export function detectLocale(systemLocale: string | null | undefined): Lang {
  const base = String(systemLocale ?? '').toLowerCase();
  if (base.startsWith('pt')) return 'pt-BR';
  if (base.startsWith('es')) return 'es';
  return 'en';
}

/** `true` se a chave existe no idioma atual (ou no pt-BR de fallback). */
export function hasKey(key: string): boolean {
  return key in CATALOGS[current] || key in (ptBR as unknown as Catalog);
}

/**
 * Traduz `key` no idioma atual, interpolando `{param}` quando houver.
 * Chave desconhecida devolve a própria chave (visível nos testes/DevTools).
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  const catalog = CATALOGS[current];
  let text = catalog[key];
  if (text === undefined) text = (ptBR as unknown as Catalog)[key];
  if (text === undefined) return key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Chave estável a partir de texto (nomes de materiais e notas do manual):
 * `Tábua 2 mm` → `tabua-2-mm`. Usada como sufixo de `mat.`/`mnote.`.
 */
export function slugify(text: string): string {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
