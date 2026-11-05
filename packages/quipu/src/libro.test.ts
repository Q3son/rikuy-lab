import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { AsientoQuipu } from '@rikuy/contracts';
import { ids } from '@rikuy/contracts/fixtures';
import {
  agregarAsiento,
  auditarLibro,
  crearLibro,
  idDeterminista,
  ingerir,
  nudosPorMotivo,
  saldoAula,
  saldoGrupo,
} from './index.ts';

const asiento = (n: number, extra: Partial<AsientoQuipu> = {}): AsientoQuipu => ({
  id: idDeterminista('t', String(n)),
  aulaId: ids.aula,
  beneficiario: { tipo: 'aula' },
  nudos: 1,
  motivo: 'todos_predijeron',
  emitidoPor: 'reglas',
  ...extra,
});

describe('idDeterminista', () => {
  it('returns a valid ULID shape and is stable', () => {
    const a = idDeterminista('x', 'y');
    expect(a).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(idDeterminista('x', 'y')).toBe(a);
    expect(idDeterminista('x', 'z')).not.toBe(a);
  });
});

describe('libro append-only', () => {
  it('appends validated entries without mutating the previous ledger', () => {
    const l0 = crearLibro();
    const l1 = agregarAsiento(l0, asiento(1));
    expect(l0.asientos).toHaveLength(0);
    expect(l1.asientos).toHaveLength(1);
  });

  it('is idempotent for an identical duplicate and rejects an edit of the same id', () => {
    const a = asiento(1);
    const l1 = agregarAsiento(crearLibro(), a);
    expect(agregarAsiento(l1, { ...a }).asientos).toHaveLength(1);
    expect(() => agregarAsiento(l1, { ...a, nudos: 5 })).toThrow(/append-only/);
  });

  it('rejects invalid entries (zero knots, negative without teacher correction)', () => {
    expect(() => agregarAsiento(crearLibro(), asiento(1, { nudos: 0 }))).toThrow();
    expect(() => agregarAsiento(crearLibro(), asiento(1, { nudos: -1 }))).toThrow();
  });

  it('a group device can never issue knots to itself', () => {
    expect(ingerir(crearLibro(), asiento(1), { rol: 'grupo' }).ok).toBe(false);
    expect(ingerir(crearLibro(), asiento(1), { rol: 'docente' }).ok).toBe(true);
  });

  it('balance equals the sum of entries in any arrival order (property)', () => {
    const entradas = fc.array(
      fc.record({
        n: fc.integer({ min: 1, max: 40 }),
        nudos: fc.integer({ min: 1, max: 5 }),
        grupo: fc.constantFrom(ids.grupo1, ids.grupo2),
      }),
      { minLength: 1, maxLength: 20 },
    );
    fc.assert(
      fc.property(entradas, fc.infiniteStream(fc.nat()), (es, _) => {
        const lista = es.map((e, i) =>
          asiento(i, { nudos: e.nudos, beneficiario: { tipo: 'grupo', grupoId: e.grupo }, motivo: 'medicion_completa' }),
        );
        const orden1 = lista.reduce(agregarAsiento, crearLibro());
        const orden2 = [...lista].reverse().reduce(agregarAsiento, crearLibro());
        const suma = (g: string) => lista.filter((a) => a.beneficiario.tipo === 'grupo' && a.beneficiario.grupoId === g).reduce((s, a) => s + a.nudos, 0);
        expect(saldoGrupo(orden1, ids.grupo1)).toBe(suma(ids.grupo1));
        expect(saldoGrupo(orden2, ids.grupo2)).toBe(suma(ids.grupo2));
      }),
    );
  });

  it('a correction may arrive before its target and the balance is still the sum', () => {
    const objetivo = asiento(1, { nudos: 3 });
    const correccion = asiento(2, { nudos: -2, motivo: 'correccion_docente', emitidoPor: 'docente', corrigeA: objetivo.id });
    const a = agregarAsiento(agregarAsiento(crearLibro(), correccion), objetivo);
    const b = agregarAsiento(agregarAsiento(crearLibro(), objetivo), correccion);
    expect(saldoAula(a, ids.aula)).toBe(1);
    expect(saldoAula(b, ids.aula)).toBe(1);
  });

  it('never shows a negative balance (no loss states)', () => {
    const objetivo = asiento(1, { nudos: 1 });
    const correccion = asiento(2, { nudos: -5, motivo: 'correccion_docente', emitidoPor: 'docente', corrigeA: objetivo.id });
    const l = agregarAsiento(agregarAsiento(crearLibro(), objetivo), correccion);
    expect(saldoAula(l, ids.aula)).toBe(0);
    expect(auditarLibro(l).map((p) => p.codigo)).toContain('correccion_excede');
  });

  it('audits a correction without a target and groups knots by reason', () => {
    const c = asiento(2, { nudos: -1, motivo: 'correccion_docente', emitidoPor: 'docente', corrigeA: idDeterminista('no', 'existe') });
    const l = agregarAsiento(agregarAsiento(crearLibro(), asiento(1)), c);
    expect(auditarLibro(l).map((p) => p.codigo)).toContain('correccion_sin_objetivo');
    expect(nudosPorMotivo(l, ids.aula).todos_predijeron).toBe(1);
  });

  it('every entry is auditable: it carries reason and optional evidence', () => {
    const l = agregarAsiento(crearLibro(), asiento(1, { evidenciaRef: ids.evidencia }));
    expect(l.asientos[0]).toMatchObject({ motivo: 'todos_predijeron', evidenciaRef: ids.evidencia });
  });
});
