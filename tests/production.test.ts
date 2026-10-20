/**
 * Modo produção (RF-GC-12): repetir o mesmo programa N vezes, com contador,
 * pausa para trocar a peça e retry da cópia interrompida. Módulo puro — nada
 * de DOM nem de máquina.
 */
import { describe, expect, it } from 'vitest';
import {
  IDLE_PRODUCTION,
  PRODUCTION_MAX_COPIES,
  clampProductionCopies,
  productionCopyFinished,
  productionFailed,
  productionNextCopy,
  productionProgress,
  productionStart,
  productionStop,
} from '../src/shared/production';

describe('clampProductionCopies', () => {
  it('aceita inteiros na faixa e limita em 999', () => {
    expect(clampProductionCopies(1)).toBe(1);
    expect(clampProductionCopies(12)).toBe(12);
    expect(clampProductionCopies('7')).toBe(7);
    expect(clampProductionCopies(PRODUCTION_MAX_COPIES + 500)).toBe(
      PRODUCTION_MAX_COPIES,
    );
  });

  it('normaliza lixo para 1 (nunca 0 cópias nem NaN)', () => {
    for (const value of [
      0,
      -3,
      Number.NaN,
      Infinity,
      '',
      'abc',
      null,
      {},
      [],
    ]) {
      expect(clampProductionCopies(value)).toBe(1);
    }
    expect(clampProductionCopies(4.9)).toBe(4);
    expect(clampProductionCopies(' 3 ')).toBe(3);
  });
});

describe('productionStart', () => {
  it('começa na cópia 1, com o total normalizado', () => {
    expect(productionStart(3)).toEqual({
      total: 3,
      copy: 1,
      done: 0,
      phase: 'running',
      failed: false,
    });
    expect(productionStart('50').total).toBe(50);
    expect(productionStart(0).total).toBe(1);
  });
});

describe('productionCopyFinished', () => {
  it('pausa para a troca da peça e conta a cópia concluída', () => {
    const state = productionCopyFinished(productionStart(3));
    expect(state).toMatchObject({ copy: 1, done: 1, phase: 'waiting' });
    expect(state.failed).toBe(false);
  });

  it('fecha a série na última cópia', () => {
    const last = { ...productionStart(2), copy: 2, done: 1 };
    expect(productionCopyFinished(last)).toMatchObject({
      copy: 2,
      done: 2,
      phase: 'done',
    });
  });

  it('ignora o evento fora de `running` (idempotente)', () => {
    const waiting = productionCopyFinished(productionStart(3));
    expect(productionCopyFinished(waiting)).toBe(waiting);
    expect(productionCopyFinished(IDLE_PRODUCTION)).toBe(IDLE_PRODUCTION);
  });

  it('não passa do total mesmo com estado inconsistente', () => {
    const weird = { ...productionStart(2), copy: 9, done: 0 };
    expect(productionCopyFinished(weird)).toMatchObject({
      done: 2,
      phase: 'done',
    });
  });
});

describe('productionFailed + productionNextCopy', () => {
  it('interromper não conta a cópia e "próxima" repete a mesma', () => {
    const failed = productionFailed(productionStart(3));
    expect(failed).toMatchObject({ copy: 1, done: 0, phase: 'waiting' });
    expect(failed.failed).toBe(true);

    const retry = productionNextCopy(failed);
    expect(retry).toMatchObject({ copy: 1, done: 0, phase: 'running' });
    expect(retry.failed).toBe(false);
  });

  it('avança para a próxima cópia depois de uma conclusão', () => {
    const waiting = productionCopyFinished(productionStart(3));
    expect(productionNextCopy(waiting)).toMatchObject({
      copy: 2,
      done: 1,
      phase: 'running',
    });
  });

  it('"próxima" fora de `waiting` ou na última cópia não muda nada', () => {
    const running = productionStart(2);
    expect(productionNextCopy(running)).toBe(running);

    const waitingLast = productionCopyFinished({
      ...productionStart(2),
      copy: 2,
      done: 1,
    });
    // A última já fecha em `done`; `waiting` na última não deveria acontecer.
    expect(waitingLast.phase).toBe('done');
    expect(productionNextCopy({ ...waitingLast, phase: 'waiting' })).toEqual({
      ...waitingLast,
      phase: 'waiting',
    });
  });
});

describe('productionStop', () => {
  it('volta ao repouso mantendo o total escolhido', () => {
    const state = productionStop(productionStart(7));
    expect(state).toEqual({
      total: 7,
      copy: 0,
      done: 0,
      phase: 'idle',
      failed: false,
    });
  });
});

describe('productionProgress', () => {
  it('conta concluídas, faltantes e a última cópia', () => {
    expect(productionProgress(productionStart(3))).toEqual({
      done: 0,
      left: 3,
      isLast: false,
    });
    const waiting = productionCopyFinished(productionStart(3));
    expect(productionProgress(waiting)).toEqual({
      done: 1,
      left: 2,
      isLast: false,
    });
    expect(
      productionProgress({ ...productionStart(2), copy: 2, done: 1 }),
    ).toEqual({ done: 1, left: 1, isLast: true });
    expect(productionProgress(IDLE_PRODUCTION)).toEqual({
      done: 0,
      left: 1,
      isLast: false,
    });
  });
});
