/**
 * **Catálogo de materiais com ficha de segurança** — RF-IMG-15.
 *
 * Cada ficha reúne o que o operador precisa saber **antes** de gravar:
 * a família, a espessura típica, a recomendação do manual (potência,
 * velocidade e passadas — quando existe, via `MATERIAL_PROFILES`) e, o mais
 * importante, o **risco**: PVC, policarbonato, ABS, vinil, fibra de vidro e
 * espuma de poliuretano liberam gases que atacam os pulmões e a máquina.
 *
 * O catálogo é **dado puro**: não aplica nada sozinho. O renderer mostra a
 * ficha, aplica a recomendação (mesmo caminho do perfil de material) e pode
 * salvar o resultado como preset. Material marcado como `danger` **não** é
 * aplicável — a ficha é só o aviso.
 */

import {
  type LaserModule,
  type MaterialProfile,
  type ProfileAction,
  findProfile,
} from './materials';

/** Famílias usadas para agrupar/filtrar a lista. */
export type MaterialFamily =
  | 'wood'
  | 'paper'
  | 'plastic'
  | 'leather'
  | 'fabric'
  | 'metal'
  | 'glass'
  | 'stone'
  | 'other';

/** Risco do material: `danger` bloqueia a aplicação. */
export type HazardLevel = 'ok' | 'caution' | 'danger';

export interface CatalogMaterial {
  /** Identificador estável (vai para a UI, não para o disco). */
  id: string;
  /** Chave i18n do nome (pt-BR é a fonte da verdade). */
  nameKey: string;
  family: MaterialFamily;
  /**
   * Nomes no manual (`MATERIAL_PROFILES.material`) por ação — o manual usa
   * nomes diferentes para gravar e cortar ("Compensado" × "Tábua 3 mm"). É o
   * que liga a ficha ao perfil de material e aos presets.
   */
  profileMaterials?: { engrave?: string[]; cut?: string[] };
  /** Espessura típica mostrada na ficha (mm); ausente = não se aplica. */
  thicknessMm?: number;
  hazard: HazardLevel;
  /** Chave i18n do aviso de segurança (sempre presente). */
  hazardKey: string;
  /** Chave i18n do preparo/dica (opcional). */
  noteKey?: string;
}

/** Ordem de exibição das famílias. */
export const MATERIAL_FAMILIES: readonly MaterialFamily[] = [
  'wood',
  'paper',
  'plastic',
  'leather',
  'fabric',
  'metal',
  'glass',
  'stone',
  'other',
];

const CATALOG: CatalogMaterial[] = [
  // ---------------------------------------------------------------- madeira
  {
    id: 'plywood',
    nameKey: 'mat.plywood',
    family: 'wood',
    profileMaterials: {
      engrave: ['Compensado', 'Tábua de madeira'],
      cut: ['Tábua 3 mm'],
    },
    thicknessMm: 3,
    hazard: 'ok',
    hazardKey: 'mat.hazard.ok',
    noteKey: 'mat.note.plywood',
  },
  {
    id: 'mdf',
    nameKey: 'mat.mdf',
    family: 'wood',
    profileMaterials: { engrave: ['Tábua de madeira'], cut: ['Tábua 3 mm'] },
    thicknessMm: 3,
    hazard: 'caution',
    hazardKey: 'mat.hazard.mdf',
    noteKey: 'mat.note.mdf',
  },
  {
    id: 'solid-wood',
    nameKey: 'mat.solidWood',
    family: 'wood',
    profileMaterials: { engrave: ['Madeira maciça', 'Madeira sólida'] },
    hazard: 'ok',
    hazardKey: 'mat.hazard.ok',
    noteKey: 'mat.note.wood',
  },
  {
    id: 'bamboo',
    nameKey: 'mat.bamboo',
    family: 'wood',
    profileMaterials: { engrave: ['Bambu'] },
    hazard: 'ok',
    hazardKey: 'mat.hazard.ok',
    noteKey: 'mat.note.wood',
  },
  {
    id: 'cork',
    nameKey: 'mat.cork',
    family: 'wood',
    profileMaterials: { engrave: ['Cortiça'] },
    hazard: 'caution',
    hazardKey: 'mat.hazard.cork',
  },

  // ------------------------------------------------------------------ papel
  {
    id: 'kraft',
    nameKey: 'mat.kraft',
    family: 'paper',
    profileMaterials: { engrave: ['Papel kraft'] },
    hazard: 'ok',
    hazardKey: 'mat.hazard.paper',
    noteKey: 'mat.note.paper',
  },
  {
    id: 'cardboard',
    nameKey: 'mat.cardboard',
    family: 'paper',
    profileMaterials: { cut: ['Papelão'] },
    thicknessMm: 2,
    hazard: 'ok',
    hazardKey: 'mat.hazard.paper',
    noteKey: 'mat.note.paper',
  },

  // ---------------------------------------------------------------- plástico
  {
    id: 'acrylic',
    nameKey: 'mat.acrylic',
    family: 'plastic',
    profileMaterials: { engrave: ['Acrílico'] },
    thicknessMm: 3,
    hazard: 'caution',
    hazardKey: 'mat.hazard.acrylic',
    noteKey: 'mat.note.acrylic',
  },
  {
    id: 'pvc',
    nameKey: 'mat.pvc',
    family: 'plastic',
    hazard: 'danger',
    hazardKey: 'mat.hazard.pvc',
  },
  {
    id: 'polycarbonate',
    nameKey: 'mat.polycarbonate',
    family: 'plastic',
    hazard: 'danger',
    hazardKey: 'mat.hazard.polycarbonate',
  },
  {
    id: 'abs',
    nameKey: 'mat.abs',
    family: 'plastic',
    hazard: 'danger',
    hazardKey: 'mat.hazard.abs',
  },
  {
    id: 'vinyl',
    nameKey: 'mat.vinyl',
    family: 'plastic',
    hazard: 'danger',
    hazardKey: 'mat.hazard.vinyl',
  },

  // ------------------------------------------------------------------ couro
  {
    id: 'leather',
    nameKey: 'mat.leather',
    family: 'leather',
    profileMaterials: { engrave: ['Couro'], cut: ['Couro'] },
    hazard: 'caution',
    hazardKey: 'mat.hazard.leather',
    noteKey: 'mat.note.leather',
  },
  {
    id: 'chrome-leather',
    nameKey: 'mat.chromeLeather',
    family: 'leather',
    hazard: 'caution',
    hazardKey: 'mat.hazard.chromeLeather',
  },

  // ----------------------------------------------------------------- tecido
  {
    id: 'fabric',
    nameKey: 'mat.fabric',
    family: 'fabric',
    profileMaterials: { engrave: ['Tecido'], cut: ['Tecido'] },
    hazard: 'caution',
    hazardKey: 'mat.hazard.fabric',
    noteKey: 'mat.note.fabric',
  },
  {
    id: 'felt',
    nameKey: 'mat.felt',
    family: 'fabric',
    profileMaterials: { engrave: ['Feltro escuro'] },
    hazard: 'caution',
    hazardKey: 'mat.hazard.fabric',
  },

  // ------------------------------------------------------------------ metal
  {
    id: 'stainless',
    nameKey: 'mat.stainless',
    family: 'metal',
    profileMaterials: { engrave: ['Aço inoxidável'] },
    hazard: 'caution',
    hazardKey: 'mat.hazard.metal',
    noteKey: 'mat.note.stainless',
  },
  {
    id: 'anodized',
    nameKey: 'mat.anodized',
    family: 'metal',
    profileMaterials: { engrave: ['Metal anodizado'] },
    hazard: 'caution',
    hazardKey: 'mat.hazard.metal',
    noteKey: 'mat.note.anodized',
  },
  {
    id: 'tinplate',
    nameKey: 'mat.tinplate',
    family: 'metal',
    profileMaterials: { engrave: ['Lata (tin plate)'] },
    hazard: 'caution',
    hazardKey: 'mat.hazard.metal',
  },
  {
    id: 'foil',
    nameKey: 'mat.foil',
    family: 'metal',
    profileMaterials: { engrave: ['Folha de alumínio'] },
    hazard: 'caution',
    hazardKey: 'mat.hazard.metal',
  },

  // ------------------------------------------------------------------ vidro
  {
    id: 'glass',
    nameKey: 'mat.glass',
    family: 'glass',
    profileMaterials: { engrave: ['Vidro'] },
    hazard: 'caution',
    hazardKey: 'mat.hazard.glass',
    noteKey: 'mat.note.glass',
  },
  {
    id: 'mirror',
    nameKey: 'mat.mirror',
    family: 'glass',
    hazard: 'caution',
    hazardKey: 'mat.hazard.mirror',
  },

  // ------------------------------------------------------------------ pedra
  {
    id: 'ceramic',
    nameKey: 'mat.ceramic',
    family: 'stone',
    profileMaterials: { engrave: ['Cerâmica'] },
    hazard: 'caution',
    hazardKey: 'mat.hazard.ceramic',
    noteKey: 'mat.note.glass',
  },

  // ------------------------------------------------------------------ outros
  {
    id: 'silica-gel',
    nameKey: 'mat.silicaGel',
    family: 'other',
    profileMaterials: { engrave: ['Silicagel'] },
    hazard: 'caution',
    hazardKey: 'mat.hazard.ok',
  },
  {
    id: 'fiberglass',
    nameKey: 'mat.fiberglass',
    family: 'other',
    hazard: 'danger',
    hazardKey: 'mat.hazard.fiberglass',
  },
  {
    id: 'pu-foam',
    nameKey: 'mat.puFoam',
    family: 'other',
    hazard: 'danger',
    hazardKey: 'mat.hazard.puFoam',
  },
];

/** Catálogo completo, na ordem de exibição. */
export const MATERIAL_CATALOG: readonly CatalogMaterial[] = CATALOG;

export function catalogMaterial(id: unknown): CatalogMaterial | null {
  if (typeof id !== 'string') return null;
  return CATALOG.find((item) => item.id === id) ?? null;
}

/** Materiais (opcionalmente de uma família), na ordem do catálogo. */
export function catalogMaterials(
  family?: MaterialFamily | 'all',
): CatalogMaterial[] {
  if (!family || family === 'all') return [...CATALOG];
  return CATALOG.filter((item) => item.family === family);
}

/** Famílias que têm pelo menos um material (para o filtro da UI). */
export function catalogFamilies(): MaterialFamily[] {
  return MATERIAL_FAMILIES.filter((family) =>
    CATALOG.some((item) => item.family === family),
  );
}

/**
 * Recomendação do manual para a ficha (módulo + ação), ou `null` quando o
 * material não tem receita no manual — a ficha então sugere a grade de testes.
 */
export function materialRecommendation(
  entry: CatalogMaterial | null | undefined,
  module: LaserModule,
  action: ProfileAction,
): MaterialProfile | null {
  const names = entry?.profileMaterials?.[action] ?? [];
  for (const name of names) {
    const found = findProfile(module, action, name);
    if (found) return found;
  }
  return null;
}

/** Material perigoso não pode ser aplicado — só o aviso é mostrado. */
export function canApplyMaterial(
  entry: CatalogMaterial | null | undefined,
): boolean {
  return Boolean(entry) && entry?.hazard !== 'danger';
}

/** `true` quando o material tem receita do manual para módulo + ação. */
export function hasRecommendation(
  entry: CatalogMaterial | null | undefined,
  module: LaserModule,
  action: ProfileAction,
): boolean {
  return Boolean(materialRecommendation(entry, module, action));
}
