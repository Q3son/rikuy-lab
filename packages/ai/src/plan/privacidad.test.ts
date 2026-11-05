import { describe, expect, it } from 'vitest';
import { PlanExtraido } from './esquemas.ts';
import { planSimulado } from './muestra.ts';
import { limpiarPlan, quitarNombresEstudiantes } from './privacidad.ts';

describe('quitarNombresEstudiantes', () => {
  it('removes a name after a student label', () => {
    expect(quitarNombresEstudiantes('Como comentó la estudiante Rosa Quispe, la olla tarda').texto).toBe('Como comentó la estudiante [nombre], la olla tarda');
    expect(quitarNombresEstudiantes('Responsable: alumno Julio Mamani').texto).toBe('Responsable: alumno [nombre]');
    expect(quitarNombresEstudiantes('Alumna: Ana').cambios).toBe(1);
  });

  it('removes roster lines written as SURNAMES, Name', () => {
    expect(quitarNombresEstudiantes('1. QUISPE MAMANI, Rosa Elena').texto).toBe('1. [nombre]');
  });

  it('removes emails, phones and national ids', () => {
    const r = quitarNombresEstudiantes('Apoderado: correo papa@mail.com, cel 987 654 321, DNI 71234567');
    expect(r.texto).not.toMatch(/papa@mail|987|71234567/);
    expect(r.cambios).toBe(3);
  });

  it('keeps science words that are also first names (luz, rosa de los vientos)', () => {
    const t = 'Describe cómo se refleja la luz. La rosa de los vientos indica la dirección.';
    expect(quitarNombresEstudiantes(t)).toEqual({ texto: t, cambios: 0 });
  });
});

describe('limpiarPlan', () => {
  it('cleans every text of the plan, including the source snippets, and counts the removals', () => {
    const { plan, retirados } = limpiarPlan(planSimulado());
    const json = JSON.stringify(plan);
    expect(json).not.toContain('Rosa Quispe');
    expect(json).not.toContain('Julio Mamani');
    expect(retirados).toBe(3); // situación + item text + its snippet
    expect(PlanExtraido.safeParse(plan).success).toBe(true);
  });
});
