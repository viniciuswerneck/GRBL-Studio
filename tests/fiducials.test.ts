/**
 * Marcas de registro (Anexo B): fiduciais desenhados em volta da arte.
 */
import { describe, expect, it } from 'vitest';
import {
  FIDUCIAL_OFFSET_MAX_MM,
  FIDUCIAL_SIZE_MAX_MM,
  FIDUCIAL_SIZE_MIN_MM,
  fiducialMarks,
  sanitizeFiducialOffset,
  sanitizeFiducialSize,
} from '../src/shared/fiducials';

const BOUNDS = { minX: 0, minY: 0, maxX: 100, maxY: 50 };

describe('marcas de registro (fiduciais)', () => {
  it('sanitiza distância e tamanho', () => {
    expect(sanitizeFiducialOffset(undefined)).toBe(0);
    expect(sanitizeFiducialOffset(-3)).toBe(0);
    expect(sanitizeFiducialOffset(5)).toBe(5);
    expect(sanitizeFiducialOffset(9999)).toBe(FIDUCIAL_OFFSET_MAX_MM);
    expect(sanitizeFiducialSize(undefined)).toBe(10);
    expect(sanitizeFiducialSize(0)).toBe(10);
    expect(sanitizeFiducialSize(0.2)).toBe(FIDUCIAL_SIZE_MIN_MM);
    expect(sanitizeFiducialSize(9999)).toBe(FIDUCIAL_SIZE_MAX_MM);
  });

  it('desenha quatro L fora dos cantos, com os braços para dentro', () => {
    const marks = fiducialMarks(BOUNDS, {
      kind: 'corners',
      offset: 5,
      size: 10,
    });
    expect(marks).toHaveLength(4);
    for (const mark of marks) expect(mark).toHaveLength(3);
    // Canto inferior esquerdo: vértice em (-5, -5), braços em +x e +y.
    expect(marks[0]).toEqual([
      { x: 5, y: -5 },
      { x: -5, y: -5 },
      { x: -5, y: 5 },
    ]);
    // Canto superior direito: vértice em (105, 55), braços em -x e -y.
    expect(marks[2]).toEqual([
      { x: 95, y: 55 },
      { x: 105, y: 55 },
      { x: 105, y: 45 },
    ]);
  });

  it('desenha cruzes no meio de cada lado', () => {
    const marks = fiducialMarks(BOUNDS, {
      kind: 'crosses',
      offset: 5,
      size: 10,
    });
    // 4 cruzes × 2 traços.
    expect(marks).toHaveLength(8);
    for (const mark of marks) expect(mark).toHaveLength(2);
    // Cruz inferior: centro (50, -5), braço horizontal de 45 a 55.
    expect(marks[0]).toEqual([
      { x: 45, y: -5 },
      { x: 55, y: -5 },
    ]);
    expect(marks[1]).toEqual([
      { x: 50, y: -10 },
      { x: 50, y: 0 },
    ]);
    // Cruz da direita: centro em (105, 25).
    expect(marks[6]).toEqual([
      { x: 100, y: 25 },
      { x: 110, y: 25 },
    ]);
  });

  it('mantém as marcas fora da arte', () => {
    const marks = fiducialMarks(BOUNDS, {
      kind: 'corners',
      offset: 8,
      size: 6,
    });
    for (const mark of marks) {
      for (const p of mark) {
        const inside =
          p.x > BOUNDS.minX &&
          p.x < BOUNDS.maxX &&
          p.y > BOUNDS.minY &&
          p.y < BOUNDS.maxY;
        expect(inside).toBe(false);
      }
    }
  });

  it('devolve vazio para geometria degenerada', () => {
    expect(
      fiducialMarks({ minX: 0, minY: 0, maxX: 0, maxY: 0 }, { offset: 5 }),
    ).toEqual([]);
    expect(
      fiducialMarks({ minX: 0, minY: 0, maxX: 0, maxY: 20 }, { offset: 5 }),
    ).toEqual([]);
  });
});
