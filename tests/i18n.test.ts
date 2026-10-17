/**
 * Testes do i18n, temas e identidade do app (RF-APP-1/2/6/7).
 *
 * A paridade de chaves já é garantida em compilação pelos `satisfies` em
 * `en.ts`/`es.ts`; aqui reforçamos em runtime e cobrimos invariantes que o
 * type-system não vê (placeholders, cobertura de materiais/macros, temas e a
 * whitelist de links externos).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { MATERIAL_PROFILES } from '../src/shared/materials';
import { DEFAULT_MACROS, MACRO_GROUPS } from '../src/shared/macros';
import { es } from '../src/shared/i18n/es';
import { en } from '../src/shared/i18n/en';
import {
  DEFAULT_LANG,
  LANGS,
  detectLocale,
  getLocale,
  hasKey,
  isLang,
  setLocale,
  slugify,
  t,
} from '../src/shared/i18n/index';
import { ptBR } from '../src/shared/i18n/pt-BR';
import {
  DEFAULT_THEME,
  THEMES,
  isThemeId,
  themeById,
  themesByVariant,
} from '../src/shared/themes';
import {
  ALLOWED_EXTERNAL_HOSTS,
  isAllowedExternalUrl,
} from '../src/shared/appInfo';
import { MENU_ACTIONS } from '../src/shared/channels';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = `${HERE}..`;

/** Repõe o idioma padrão entre testes (o estado do módulo é global). */
afterEach(() => setLocale(DEFAULT_LANG));

/** Extrai os nomes de placeholder `{nome}` de um texto. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe('i18n — catálogos', () => {
  it('os 3 idiomas têm exatamente as mesmas chaves que o pt-BR', () => {
    const keys = Object.keys(ptBR).sort();
    expect(Object.keys(en).sort()).toEqual(keys);
    expect(Object.keys(es).sort()).toEqual(keys);
  });

  it('nenhuma tradução é vazia', () => {
    for (const [key, value] of Object.entries(ptBR)) {
      expect(value, `pt-BR:${key}`).not.toBe('');
      expect(en[key as keyof typeof en], `en:${key}`).not.toBe('');
      expect((es as Record<string, string>)[key], `es:${key}`).not.toBe('');
    }
  });

  it('os placeholders {…} são os mesmos nos 3 idiomas', () => {
    for (const key of Object.keys(ptBR) as (keyof typeof ptBR)[]) {
      const base = placeholders(ptBR[key]).join(',');
      expect(placeholders(en[key]).join(','), `en:${key}`).toBe(base);
      expect(placeholders(es[key]).join(','), `es:${key}`).toBe(base);
    }
  });

  it('lista de idiomas e padrão são consistentes', () => {
    expect(LANGS).toEqual(['pt-BR', 'en', 'es']);
    expect(LANGS).toContain(DEFAULT_LANG);
    for (const lang of LANGS) expect(isLang(lang)).toBe(true);
    expect(isLang('de')).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });
});

describe('i18n — tradução e estado', () => {
  it('t() devolve o texto do idioma ativo', () => {
    setLocale('pt-BR');
    expect(t('nav.next')).toBe('Próximo');
    setLocale('en');
    expect(t('nav.next')).toBe('Next');
    setLocale('es');
    expect(t('nav.next')).toBe('Siguiente');
  });

  it('t() interpola {chave} e mantém placeholder sem valor', () => {
    setLocale('pt-BR');
    expect(t('file.loaded', { name: 'a.gcode', lines: 3 })).toBe(
      'Arquivo carregado: a.gcode (3 linhas)',
    );
    // `lines` ausente: o marcador permanece literal.
    expect(t('file.loaded', { name: 'a.gcode' })).toContain('{lines}');
  });

  it('t() devolve a própria chave quando ela não existe', () => {
    expect(t('chave.que.nao.existe')).toBe('chave.que.nao.existe');
  });

  it('setLocale ignora idioma inválido e avisa via retorno', () => {
    setLocale('en');
    expect(setLocale('fr')).toBe(false);
    expect(getLocale()).toBe('en');
    expect(setLocale('pt-BR')).toBe(true);
    expect(getLocale()).toBe('pt-BR');
  });

  it('hasKey cobre pt-BR e o idioma ativo', () => {
    setLocale('en');
    expect(hasKey('nav.next')).toBe(true);
    expect(hasKey('nao.existe')).toBe(false);
  });

  it('detectLocale mapeia o locale do sistema', () => {
    expect(detectLocale('pt-BR')).toBe('pt-BR');
    expect(detectLocale('pt')).toBe('pt-BR');
    expect(detectLocale('es-ES')).toBe('es');
    expect(detectLocale('en-US')).toBe('en');
    expect(detectLocale('de-DE')).toBe('en');
    expect(detectLocale(null)).toBe('en');
  });

  it('slugify gera chaves estáveis sem acentos', () => {
    expect(slugify('Tábua 2 mm')).toBe('tabua-2-mm');
    expect(slugify('Lata (tin plate)')).toBe('lata-tin-plate');
    expect(slugify('  Cerâmica  ')).toBe('ceramica');
  });
});

describe('i18n — cobertura de dados da UI', () => {
  it('todo material do manual tem chave mat.<slug>', () => {
    for (const profile of MATERIAL_PROFILES) {
      expect(hasKey(`mat.${slugify(profile.material)}`), profile.material).toBe(
        true,
      );
    }
  });

  it('toda nota do manual tem chave mnote.<slug>', () => {
    for (const profile of MATERIAL_PROFILES) {
      expect(hasKey(`mnote.${slugify(profile.notes)}`), profile.notes).toBe(
        true,
      );
    }
  });

  it('toda macro padrão tem chave macro.def.<id>', () => {
    for (const macro of DEFAULT_MACROS) {
      expect(hasKey(`macro.def.${macro.id}`), macro.id).toBe(true);
    }
  });

  it('todo grupo de macro tem chave macrogroup.<slug>', () => {
    for (const group of MACRO_GROUPS) {
      expect(hasKey(`macrogroup.${slugify(group)}`), group).toBe(true);
    }
  });

  it('toda chave data-i18n* do index.html existe no catálogo', () => {
    const html = readFileSync(`${ROOT}/public/index.html`, 'utf8');
    const keys = new Set(
      [
        ...html.matchAll(/data-i18n(?:-title|-placeholder|-aria)?="([^"]+)"/g),
      ].map((m) => m[1]),
    );
    expect(keys.size).toBeGreaterThan(0);
    for (const key of keys) expect(hasKey(key), key).toBe(true);
  });
});

describe('temas (RF-APP-1)', () => {
  it('há 11 temas: 5 claros, 4 escuros e 2 de alto contraste', () => {
    expect(THEMES).toHaveLength(11);
    expect(themesByVariant('light')).toHaveLength(5);
    expect(themesByVariant('dark')).toHaveLength(4);
    expect(themesByVariant('hc')).toHaveLength(2);
  });

  it('os ids são únicos e o padrão é válido', () => {
    const ids = THEMES.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(isThemeId(DEFAULT_THEME)).toBe(true);
    expect(themeById(DEFAULT_THEME)?.id).toBe(DEFAULT_THEME);
    expect(isThemeId('inexistente')).toBe(false);
  });

  it('cada tema tem nome traduzido nos 3 idiomas', () => {
    for (const theme of THEMES) {
      expect(hasKey(theme.labelKey), theme.labelKey).toBe(true);
    }
    for (const group of [
      'theme.group.light',
      'theme.group.dark',
      'theme.group.hc',
    ]) {
      expect(hasKey(group), group).toBe(true);
    }
  });

  it('cada amostra traz bg/fg/accent em hex', () => {
    for (const theme of THEMES) {
      expect(theme.swatch.bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.swatch.fg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.swatch.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('todo tema (exceto o padrão) tem bloco em tokens.css', () => {
    const css = readFileSync(`${ROOT}/public/tokens.css`, 'utf8');
    for (const theme of THEMES) {
      if (theme.id === DEFAULT_THEME) continue; // o padrão vive em `:root`
      expect(
        css.includes(`html[data-theme="${theme.id}"]`),
        `tokens.css:${theme.id}`,
      ).toBe(true);
    }
  });

  it('todo estado GRBL tem rótulo i18n (status.*)', () => {
    const states = [
      'idle',
      'run',
      'jog',
      'hold',
      'alarm',
      'door',
      'check',
      'home',
      'sleep',
    ];
    for (const state of states)
      expect(hasKey(`status.${state}`), state).toBe(true);
  });
});

describe('ações do menu nativo (RF-APP-7)', () => {
  it('o renderer compara todos os valores de MENU_ACTIONS', () => {
    const renderer = readFileSync(`${ROOT}/public/renderer.js`, 'utf8');
    for (const action of Object.values(MENU_ACTIONS)) {
      // Comparação real (`name === 'open-gcode'`), não só o literal solto.
      expect(renderer.includes(`=== '${action}'`), action).toBe(true);
    }
  });
});

describe('links externos (RF-APP-6/7)', () => {
  it('aceita apenas https de hosts liberados', () => {
    expect(isAllowedExternalUrl('https://lab.werneck.dev.br/')).toBe(true);
    expect(isAllowedExternalUrl('https://github.com/foo/bar')).toBe(true);
    expect(isAllowedExternalUrl('https://sub.lab.werneck.dev.br/x')).toBe(true);
  });

  it('recusa esquemas e domínios perigosos', () => {
    expect(isAllowedExternalUrl('http://lab.werneck.dev.br/')).toBe(false);
    expect(isAllowedExternalUrl('file:///etc/passwd')).toBe(false);
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedExternalUrl('https://evil.com')).toBe(false);
    expect(isAllowedExternalUrl('https://github.com.evil.com')).toBe(false);
    expect(isAllowedExternalUrl(42)).toBe(false);
    expect(isAllowedExternalUrl(null)).toBe(false);
  });

  it('a whitelist não inclui curingas', () => {
    expect(ALLOWED_EXTERNAL_HOSTS).toEqual([
      'lab.werneck.dev.br',
      'github.com',
    ]);
  });
});
