import { describe, expect, it } from 'vitest';
import {
  MATERIAL_CATALOG,
  MATERIAL_FAMILIES,
  canApplyMaterial,
  catalogFamilies,
  catalogMaterial,
  catalogMaterials,
  hasRecommendation,
  materialRecommendation,
} from '../src/shared/materialCatalog';
import {
  QUEUE_MAX,
  type JobQueueItem,
  queueAdd,
  queueMark,
  queueMove,
  queueNextIndex,
  queuePrepareRun,
  queueProgress,
  queueRemove,
  queueReset,
  sanitizeQueue,
  sanitizeQueueItem,
} from '../src/shared/jobQueue';
import { MATERIAL_PROFILES } from '../src/shared/materials';

const profileNames = new Set(MATERIAL_PROFILES.map((p) => p.material));

describe('catálogo de materiais', () => {
  it('tem ids únicos, nome/aviso por i18n e família válida', () => {
    const ids = new Set<string>();
    for (const item of MATERIAL_CATALOG) {
      expect(item.id).toMatch(/^[a-z0-9-]+$/);
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
      expect(item.nameKey.startsWith('mat.')).toBe(true);
      expect(item.hazardKey.startsWith('mat.hazard.')).toBe(true);
      expect(MATERIAL_FAMILIES).toContain(item.family);
      expect(['ok', 'caution', 'danger']).toContain(item.hazard);
    }
    expect(MATERIAL_CATALOG.length).toBeGreaterThanOrEqual(20);
  });

  it('liga ao manual só por materiais que existem nos perfis', () => {
    for (const item of MATERIAL_CATALOG) {
      for (const name of Object.values(item.profileMaterials ?? {}).flat()) {
        expect(profileNames.has(name)).toBe(true);
      }
    }
  });

  it('bloqueia material perigoso e libera o resto', () => {
    const pvc = catalogMaterial('pvc');
    expect(pvc?.hazard).toBe('danger');
    expect(canApplyMaterial(pvc)).toBe(false);
    expect(canApplyMaterial(catalogMaterial('plywood'))).toBe(true);
    expect(canApplyMaterial(null)).toBe(false);
  });

  it('dá a recomendação do manual quando existe', () => {
    const plywood = catalogMaterial('plywood');
    const cut = materialRecommendation(plywood, '5W', 'cut');
    expect(cut?.material).toBe('Tábua 3 mm');
    expect(cut?.powerPercent).toBeGreaterThan(0);
    expect(materialRecommendation(plywood, '5W', 'engrave')?.material).toBe(
      'Tábua de madeira',
    );
    expect(hasRecommendation(plywood, '5W', 'cut')).toBe(true);
    // Sem receita de corte para metal: a ficha sugere a grade de testes.
    expect(hasRecommendation(catalogMaterial('stainless'), '5W', 'cut')).toBe(
      false,
    );
    expect(hasRecommendation(catalogMaterial('pvc'), '5W', 'cut')).toBe(false);
    expect(materialRecommendation(null, '5W', 'cut')).toBeNull();
  });

  it('filtra por família e lista só as famílias usadas', () => {
    const plastics = catalogMaterials('plastic');
    expect(plastics.length).toBeGreaterThan(3);
    expect(plastics.every((m) => m.family === 'plastic')).toBe(true);
    expect(catalogMaterials('all')).toHaveLength(MATERIAL_CATALOG.length);
    expect(catalogFamilies()).toContain('wood');
    expect(catalogFamilies()).toContain('stone');
    expect(catalogFamilies().every((f) => MATERIAL_FAMILIES.includes(f))).toBe(
      true,
    );
    expect(catalogMaterial('nada')).toBeNull();
  });
});

function item(id: string, path = `/tmp/${id}.gcode`): JobQueueItem {
  return {
    id,
    path,
    name: `${id}.gcode`,
    sizeBytes: 1024,
    status: 'pending',
    addedAt: 1,
  };
}

describe('fila de trabalhos', () => {
  it('saneia item: id/caminho obrigatórios e running volta a pending', () => {
    expect(sanitizeQueueItem(item('abc123'))?.status).toBe('pending');
    expect(
      sanitizeQueueItem({ ...item('abc123'), status: 'running' })?.status,
    ).toBe('pending');
    expect(sanitizeQueueItem({ ...item('abc123'), id: 'x' })).toBeNull();
    expect(sanitizeQueueItem({ ...item('abc123'), path: '' })).toBeNull();
    expect(sanitizeQueueItem(null)).toBeNull();
    expect(
      sanitizeQueueItem({ ...item('abc123'), name: '  \u0001 ' })?.name,
    ).toBe('abc123.gcode');
  });

  it('saneia a lista: sem repetir id nem caminho, com teto', () => {
    const many = Array.from({ length: QUEUE_MAX + 5 }, (_, i) =>
      item(`item${String(i).padStart(3, '0')}`),
    );
    expect(sanitizeQueue(many)).toHaveLength(QUEUE_MAX);
    expect(
      sanitizeQueue([item('abc123'), item('abc124', '/tmp/abc123.gcode')]),
    ).toHaveLength(1);
    expect(sanitizeQueue('nada')).toEqual([]);
  });

  it('enfileira sem duplicar caminho e respeitando o teto', () => {
    const list = queueAdd([], [item('abc123'), item('abc124')]);
    expect(list.map((i) => i.id)).toEqual(['abc123', 'abc124']);
    const again = queueAdd(list, [item('abc125', '/tmp/abc123.gcode')]);
    expect(again).toHaveLength(2);
    const full = Array.from({ length: QUEUE_MAX }, (_, i) =>
      item(`full${String(i).padStart(3, '0')}`),
    );
    expect(queueAdd(full, [item('abc999')])).toHaveLength(QUEUE_MAX);
  });

  it('remove, move e reseta', () => {
    const list = [item('abc123'), item('abc124'), item('abc125')];
    expect(queueRemove(list, 'abc124').map((i) => i.id)).toEqual([
      'abc123',
      'abc125',
    ]);
    expect(queueMove(list, 'abc125', -1).map((i) => i.id)).toEqual([
      'abc123',
      'abc125',
      'abc124',
    ]);
    expect(queueMove(list, 'abc123', -1).map((i) => i.id)).toEqual([
      'abc123',
      'abc124',
      'abc125',
    ]);
    expect(queueMove(list, 'abc124', +9).map((i) => i.id)).toEqual([
      'abc123',
      'abc125',
      'abc124',
    ]);
    expect(queueMove(list, 'nao-existe', 1)).toHaveLength(3);
    const done = queueMark(list, 'abc124', 'done');
    expect(queueReset(done).every((i) => i.status === 'pending')).toBe(true);
  });

  it('prepara a execução: falhas voltam, concluídos ficam, fila cheia reinicia', () => {
    const list = [
      { ...item('abc123'), status: 'done' as const },
      { ...item('abc124'), status: 'failed' as const },
      { ...item('abc125'), status: 'pending' as const },
    ];
    const prepared = queuePrepareRun(list);
    expect(prepared.map((i) => i.status)).toEqual([
      'done',
      'pending',
      'pending',
    ]);
    const finished = [
      { ...item('abc123'), status: 'done' as const },
      { ...item('abc124'), status: 'failed' as const },
    ];
    // Com uma falha, só ela volta — as peças prontas não são regravadas.
    expect(queuePrepareRun(finished).map((i) => i.status)).toEqual([
      'done',
      'pending',
    ]);
    const allDone = [{ ...item('abc123'), status: 'done' as const }];
    expect(queuePrepareRun(allDone).every((i) => i.status === 'pending')).toBe(
      true,
    );
    expect(queuePrepareRun([])).toEqual([]);
  });

  it('acha o próximo pendente e conta o progresso', () => {
    const list = [
      { ...item('abc123'), status: 'done' as const },
      { ...item('abc124'), status: 'failed' as const },
      { ...item('abc125'), status: 'pending' as const },
    ];
    expect(queueNextIndex(list)).toBe(2);
    expect(queueNextIndex([])).toBe(-1);
    const p = queueProgress(list);
    expect(p).toMatchObject({ total: 3, pending: 1, done: 1, failed: 1 });
    expect(p.position).toBe(3);
    expect(queueProgress([]).position).toBe(0);
  });
});
