/**
 * Perfis de material (RF-IMG-8) — potência e velocidade recomendadas.
 *
 * Fonte: manual do COMGO Z1 (`docs/comgo_z1_lasergrbl_user_manual.md`, §9
 * "Comprehensive Material Engraving & Cutting Parameters Matrix"), seções 9.1
 * (módulo 5W) e 9.2 (módulo 10W).
 *
 * A coluna "Power (%)" vira `S` através de `powerPercentToS`, tendo como
 * referência `PROFILE_MAX_S` (o `S-max` padrão do app, que equivale a
 * `$30 = 1000`). Os perfis são **sugestões**: o preparo de superfície descrito
 * em `notes` é obrigatório para vidro, cerâmica e acrílico.
 */

/** Módulo de laser do COMGO Z1 coberto pelo manual. */
export type LaserModule = '3W' | '5W' | '10W';

/** Ação executada: gravação (raster) ou corte (contorno). */
export type ProfileAction = 'engrave' | 'cut';

export interface MaterialProfile {
  module: LaserModule;
  action: ProfileAction;
  /** Material, em pt-BR. */
  material: string;
  /** Potência recomendada, em % da potência máxima. */
  powerPercent: number;
  /** Velocidade recomendada, em mm/min. */
  speedMmMin: number;
  /** Observações do manual (preparo de superfície, nº de passadas…). */
  notes: string;
}

/**
 * Referência de "potência máxima" para converter % em `S`. Corresponde ao
 * `S-max` padrão do app (1000), que é o valor usual de `$30` no GRBL 1.1.
 */
export const PROFILE_MAX_S = 1000;

/** Perfis do manual (5W e 10W), na ordem em que aparecem na matriz. */
export const MATERIAL_PROFILES: readonly MaterialProfile[] = [
  // --- 3W · Gravação (manual Sculpfun C1, §6) ---
  p('3W', 'engrave', 'Papel kraft', 80, 3000, 'Passadas: 1. M4.'),
  p('3W', 'engrave', 'Compensado', 90, 1500, 'Passadas: 1. M4.'),
  p('3W', 'engrave', 'Madeira sólida', 90, 1000, 'Passadas: 1. M4.'),
  p('3W', 'engrave', 'Bambu', 90, 1000, 'Passadas: 1. M4.'),
  p('3W', 'engrave', 'Folha de alumínio', 80, 1500, 'Passadas: 1. M4.'),
  p('3W', 'engrave', 'Cortiça', 90, 1000, 'Passadas: 1. M4.'),
  p('3W', 'engrave', 'Couro', 60, 1500, 'Passadas: 1. M4.'),
  p('3W', 'engrave', 'Silicagel', 80, 1000, 'Passadas: 1. M4.'),
  p('3W', 'engrave', 'Feltro escuro', 60, 1500, 'Passadas: 1. M4.'),
  p('3W', 'engrave', 'Lata (tin plate)', 80, 2500, 'Passadas: 1. M4.'),

  // --- 5W · Gravação (§9.1) ---
  p('5W', 'engrave', 'Tábua de madeira', 100, 2500, 'Ajustes padrão.'),
  p('5W', 'engrave', 'Bambu', 100, 2500, 'Ajustes padrão.'),
  p('5W', 'engrave', 'Madeira maciça', 100, 2500, 'Ajustes padrão.'),
  p(
    '5W',
    'engrave',
    'Couro',
    100,
    2000,
    'Garanta o material bem plano e fixado.',
  ),
  p(
    '5W',
    'engrave',
    'Vidro',
    100,
    700,
    'A superfície DEVE ser pintada de preto ou coberta com papel de transferência térmica.',
  ),
  p(
    '5W',
    'engrave',
    'Cerâmica',
    100,
    700,
    'A superfície DEVE receber papel de transferência térmica.',
  ),
  p(
    '5W',
    'engrave',
    'Acrílico',
    100,
    1500,
    'Acrílico transparente exige pintar de preto a face inferior/superior.',
  ),
  p(
    '5W',
    'engrave',
    'Aço inoxidável',
    100,
    300,
    'Marcação direta sobre a superfície bruta.',
  ),
  p(
    '5W',
    'engrave',
    'Metal anodizado',
    100,
    800,
    'Remoção direta do revestimento anodizado.',
  ),
  p(
    '5W',
    'engrave',
    'Tecido',
    40,
    5000,
    'Potência menor evita queimar e desfiar as bordas.',
  ),

  // --- 5W · Corte (§9.1) ---
  p('5W', 'cut', 'Tábua 2 mm', 100, 180, 'Passadas: 1.'),
  p('5W', 'cut', 'Tábua 3 mm', 100, 120, 'Passadas: 1.'),
  p(
    '5W',
    'cut',
    'Tábua 4 mm',
    100,
    90,
    'Reduza um pouco a distância focal para dentro do material.',
  ),
  p('5W', 'cut', 'Papelão', 100, 1500, 'Passadas: 1.'),
  p('5W', 'cut', 'Couro', 100, 100, 'Passadas: 1.'),
  p('5W', 'cut', 'Tecido', 100, 1500, 'Passadas: 1.'),

  // --- 10W · Gravação (§9.2) ---
  p(
    '10W',
    'engrave',
    'Tábua de madeira',
    100,
    5000,
    'Processamento em alta velocidade.',
  ),
  p('10W', 'engrave', 'Bambu', 100, 5000, 'Processamento em alta velocidade.'),
  p(
    '10W',
    'engrave',
    'Madeira maciça',
    100,
    5000,
    'Processamento em alta velocidade.',
  ),
  p('10W', 'engrave', 'Couro', 100, 4500, 'Processamento em alta velocidade.'),
  p(
    '10W',
    'engrave',
    'Vidro',
    100,
    1200,
    'A superfície DEVE ser pintada de preto ou coberta com papel de transferência térmica.',
  ),
  p(
    '10W',
    'engrave',
    'Cerâmica',
    100,
    1200,
    'A superfície DEVE receber papel de transferência térmica.',
  ),
  p(
    '10W',
    'engrave',
    'Acrílico',
    100,
    2500,
    'Acrílico transparente exige pintar a superfície de preto.',
  ),
  p('10W', 'engrave', 'Aço inoxidável', 100, 600, 'Marcação direta.'),
  p('10W', 'engrave', 'Metal anodizado', 100, 1500, 'Marcação direta.'),
  p(
    '10W',
    'engrave',
    'Tecido',
    20,
    5000,
    'Potência muito baixa para tecidos leves.',
  ),

  // --- 10W · Corte (§9.2) ---
  p('10W', 'cut', 'Tábua 2 mm', 100, 300, 'Passadas: 1.'),
  p('10W', 'cut', 'Tábua 3 mm', 100, 250, 'Passadas: 1.'),
  p('10W', 'cut', 'Tábua 4 mm', 100, 200, 'Passadas: 1.'),
  p(
    '10W',
    'cut',
    'Tábua 7 mm',
    100,
    90,
    'Ajuste a distância focal para dentro do núcleo do material.',
  ),
  p('10W', 'cut', 'Papelão', 100, 2500, 'Passadas: 1.'),
  p('10W', 'cut', 'Couro', 100, 2000, 'Corte limpo em alta velocidade.'),
  p('10W', 'cut', 'Tecido', 100, 2500, 'Corte limpo em alta velocidade.'),
];

/** Açúcar sintático para manter a tabela acima legível. */
function p(
  module: LaserModule,
  action: ProfileAction,
  material: string,
  powerPercent: number,
  speedMmMin: number,
  notes: string,
): MaterialProfile {
  return { module, action, material, powerPercent, speedMmMin, notes };
}

/** Perfis de um módulo e ação, na ordem do manual. */
export function profilesFor(
  module: LaserModule,
  action: ProfileAction,
): MaterialProfile[] {
  return MATERIAL_PROFILES.filter(
    (profile) => profile.module === module && profile.action === action,
  );
}

/** Busca um perfil específico (ou `undefined` se não existir). */
export function findProfile(
  module: LaserModule,
  action: ProfileAction,
  material: string,
): MaterialProfile | undefined {
  return MATERIAL_PROFILES.find(
    (profile) =>
      profile.module === module &&
      profile.action === action &&
      profile.material === material,
  );
}

/**
 * Converte "Power (%)" em potência `S`, arredondando e limitando a `0..maxS`.
 * Entradas inválidas (`NaN`, `maxS <= 0`) devolvem `0` — nunca um `S` absurdo.
 */
export function powerPercentToS(
  percent: number,
  maxS: number = PROFILE_MAX_S,
): number {
  if (!Number.isFinite(percent) || !Number.isFinite(maxS) || maxS <= 0) {
    return 0;
  }
  const s = Math.round((percent / 100) * maxS);
  return Math.max(0, Math.min(maxS, s));
}
