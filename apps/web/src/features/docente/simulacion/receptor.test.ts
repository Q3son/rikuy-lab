import { partirEscenario, construirEscenario } from '@rikuy/evidencia';
import { describe, expect, it } from 'vitest';
import { crearReceptorSimulado, marcosDeGrupo } from './receptor.ts';

const esc = construirEscenario();
const { porGrupo } = partirEscenario(esc);
const condor = porGrupo.Condor;

describe('simulated relay receiver (F2 mock)', () => {
  it('rebuilds a group package from its QR frames and reports progress on the way', () => {
    const marcos = marcosDeGrupo(esc.clase.id, 'GRUPO00001', condor, '1762300800000-0000-grupo001');
    expect(marcos.length).toBeGreaterThan(1);
    const r = crearReceptorSimulado(esc.clase.id);
    const pasos = marcos.map((m) => r.agregarCuadro(m));
    expect(pasos[0]).toMatchObject({ estado: 'parcial', recibidos: 1, total: marcos.length });
    const fin = pasos[pasos.length - 1];
    expect(fin.estado).toBe('completo');
    expect(fin.estado === 'completo' && fin.eventos.map((e) => e.id)).toEqual(condor.map((e) => e.id));
  });

  it('refuses a package from another class', () => {
    const marcos = marcosDeGrupo(esc.clase.id, 'GRUPO00001', condor, '1762300800000-0000-grupo001');
    const r = crearReceptorSimulado('01JC0000000000000000000C99');
    expect(marcos.map((m) => r.agregarCuadro(m)).pop()).toEqual({ estado: 'otra_clase' });
  });

  it('refuses frames that are not RK1', () => {
    expect(crearReceptorSimulado(esc.clase.id).agregarCuadro('https://example.com')).toEqual({ estado: 'invalido' });
  });
});
