import { describe, expect, it } from 'vitest';
import { ids } from '@rikuy/contracts/fixtures';
import { BANCO_PULSO, MIN_RESPUESTAS, agregarPulso, contieneEtiquetaEmocional, itemsDelPulso, type RespuestaPulso } from './index.ts';

describe('pulso del curso', () => {
  it('uses collective wording with no emotion vocabulary', () => {
    expect(BANCO_PULSO.length).toBeGreaterThanOrEqual(8);
    expect(contieneEtiquetaEmocional(BANCO_PULSO)).toBe(false);
  });

  it('gives each student 3 distinct rotating items per week, deterministically', () => {
    const a = itemsDelPulso(10, ids.estudiante1);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((i) => i.id)).size).toBe(3);
    expect(itemsDelPulso(10, ids.estudiante1)).toEqual(a);
    expect(itemsDelPulso(11, ids.estudiante1)).not.toEqual(a);
  });

  const resp = (n: number, itemId = 'p1'): RespuestaPulso => ({ estudianteId: `E${n}`.padEnd(26, '0'), itemId, semana: 10, valor: ((n % 4) + 1) as 1 | 2 | 3 | 4 });

  it('suppresses an item with fewer than 5 responses', () => {
    expect(MIN_RESPUESTAS).toBe(5);
    const r = agregarPulso([resp(1), resp(2), resp(3), resp(4)]);
    expect(r).toEqual([{ itemId: 'p1', suprimido: true }]);
  });

  it('shows the distribution from 5 responses and counts "prefiero no decir" apart', () => {
    const rs = [resp(1), resp(2), resp(3), resp(4), resp(5), { ...resp(6), valor: 'prefiero_no_decir' as const }];
    const [cel] = agregarPulso(rs);
    expect(cel).toMatchObject({ itemId: 'p1', suprimido: false, n: 5, prefieroNoDecir: 1 });
    expect(Object.keys(cel as object)).not.toContain('estudianteId');
  });

  it('counts each student once per item', () => {
    const rs = [resp(1), resp(1), resp(2), resp(3), resp(4)];
    expect(agregarPulso(rs)[0]).toMatchObject({ suprimido: true });
  });
});
