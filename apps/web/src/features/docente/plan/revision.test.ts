import { describe, expect, it } from 'vitest';
import { aprobar, contar, decidir, desempenosDelPlan, editar, iniciarRevision, lecturaDeEjemplo, mejorar } from './revision.ts';

const inicio = () => iniciarRevision(lecturaDeEjemplo());

describe('plan review', () => {
  it('starts with every item pending and no student names', () => {
    const r = inicio();
    expect(contar(r)).toEqual({
      pendiente: r.resumen.total,
      aceptado: 0,
      rechazado: 0,
    });
    expect(r.privacidad.retirados).toBeGreaterThan(0);
    expect(JSON.stringify(r)).not.toContain('Quispe');
  });

  it('an edit is cleaned, mapped again and accepted', () => {
    const r = editar(inicio(), 'u4-i2', 'Describe cómo se produce la reflexión, la refracción y la dispersión de las ondas.');
    const i = r.unidades[3]!.items[1]!;
    expect(i).toMatchObject({
      editado: true,
      decision: 'aceptado',
      correspondencia: { estado: 'exacta', id: 'secundaria-2:cyt:c2:d3' },
    });
    const conNombre = editar(r, 'u1-i1', 'Indaga con la estudiante Rosa Quispe');
    expect(conNombre.unidades[0]!.items[0]!.texto).toBe('Indaga con la estudiante [nombre]');
  });

  it('approval drops rejected items, accepts pending ones and keeps only chosen practices', () => {
    let r = decidir(inicio(), 'u4-i2', 'rechazado');
    r = decidir(r, 'u1-i1', 'aceptado');
    const sugeridas = mejorar(r).practicas;
    const plan = aprobar(
      r,
      sugeridas.filter((p) => p.slug === 'pendulo'),
      new Date('2026-11-05T15:00:00Z'),
    );
    expect(plan.aprobadoEn).toBe('2026-11-05T15:00:00.000Z');
    expect(plan.unidades[3]!.items.map((i) => i.id)).not.toContain('u4-i2');
    expect(plan.resumen.total).toBe(r.resumen.total - 1);
    expect(plan.practicas.map((p) => p.slug)).toEqual(['pendulo']);
    expect(desempenosDelPlan(plan).length).toBeGreaterThan(3);
  });

  it('suggestions exclude rejected items', () => {
    // Rejecting the nutrition and digestion items of unit 3 lowers the lactase fit for it.
    const lactasa = (r: ReturnType<typeof inicio>) => mejorar(r).practicas.find((p) => p.unidad === 3 && p.slug === 'lactasa')?.puntaje ?? 0;
    let r = inicio();
    const antes = lactasa(r);
    for (const id of ['u3-i3', 'u3-i4', 'u3-i6']) r = decidir(r, id, 'rechazado');
    expect(lactasa(r)).toBeLessThan(antes);
  });
});
