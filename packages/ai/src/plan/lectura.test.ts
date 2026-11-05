import { describe, expect, it } from 'vitest';
import { crearAdaptadoresSimulados } from '../adaptadores/simulado.ts';
import { crearEnrutador, type Adaptador, type Politica } from '../enrutador.ts';
import { Presupuesto, RegistroUsoMemoria } from '../presupuesto.ts';
import { err } from '../result.ts';
import { leerPlan } from './lectura.ts';
import { curriculoCneb } from './mapeo.ts';

const politica: Politica = { orden: ['gemini'], timeoutMs: 500, privacidad: 'solo-docente' };
function montar(adaptadores: Adaptador[]) {
  const registro = new RegistroUsoMemoria();
  const enrutador = crearEnrutador({
    adaptadores,
    politicas: { generarPractica: politica, revisarPractica: politica, pictogramas: politica, visionTabla: politica, traducir: politica, extraerPlan: politica },
    presupuesto: new Presupuesto({ registro, topeMensualUsd: 10 }),
    registro,
  });
  return { enrutador, curriculo: curriculoCneb() };
}
const archivos = [{ mime: 'application/pdf', base64: 'JVBERi0=' }];

describe('leerPlan (mock mode)', () => {
  it('returns the sample plan of 2.º secundaria, mapped to the CNEB and without student names', async () => {
    const s = await leerPlan(montar(crearAdaptadoresSimulados()), { colegioId: 'colA' }, archivos);
    expect(s.estado).toBe('extraido');
    if (s.estado !== 'extraido') return;
    const { plan, privacidad, fuente } = s.lectura;
    expect(fuente.simulado).toBe(true);
    expect(plan.grado).toBe(2);
    expect(plan.region).toBe('Arequipa');
    expect(plan.unidades).toHaveLength(4);
    expect(plan.resumen.exactas).toBeGreaterThan(5);
    expect(plan.resumen.sinCorrespondencia).toBeGreaterThan(0);
    expect(privacidad.retirados).toBeGreaterThan(0);
    expect(JSON.stringify(plan)).not.toContain('Quispe');
    // every item keeps its literal snippet and page
    for (const u of plan.unidades) for (const i of u.items) expect(i.fuente.pagina).toBeGreaterThan(0);
  });

  it('fails closed when the reader fails (no partial plan)', async () => {
    const roto: Adaptador = {
      nombre: 'gemini',
      fuente: 'ia-nube',
      modelo: 'x',
      disponible: () => true,
      capacidades: { extraerPlan: { extraer: async () => err({ tipo: 'esquema', detalle: 'no cumple' }) } },
    };
    const s = await leerPlan(montar([roto]), { colegioId: 'colA' }, archivos);
    expect(s).toEqual({ estado: 'fallo', fallo: { tipo: 'esquema', detalle: 'no cumple' } });
  });
});
