import { Paquete, PaqueteValidado, Practica } from '@rikuy/contracts';
import { describe, expect, it } from 'vitest';
import { crearAdaptadoresSimulados, borradorSimulado } from './adaptadores/simulado.ts';
import { crearCatalogoCneb, crearCatalogoPracticas } from './catalogo.ts';
import { aprobarPropuesta, ejecutarCadena, type DepsCreador } from './creador.ts';
import { crearEnrutador, type Adaptador, type Politica } from './enrutador.ts';
import { firmarPaquete, generarParClaves, paquetePractica, exportarClavePublica, verificarPaquete } from './firma.ts';
import { Presupuesto, RegistroUsoMemoria } from './presupuesto.ts';
import { err, ok } from './result.ts';
import { CITA, refDesempeno } from './pruebas-util.ts';
import { SolicitudPractica } from './esquemas.ts';
import { ejemplos } from '@rikuy/contracts/fixtures';

const catalogo = crearCatalogoCneb();
const solicitud = SolicitudPractica.parse({ desempeno: refDesempeno, recursos: { quiz: true, diagrama: true, guionVideo: true, pictogramas: true } });
const politica: Politica = { orden: ['gemini', 'meta'], timeoutMs: 200, privacidad: 'solo-docente' };
const politicaMeta: Politica = { orden: ['meta'], timeoutMs: 200, privacidad: 'solo-docente' };

function montar(adaptadores: Adaptador[], tope = 10) {
  const registro = new RegistroUsoMemoria();
  const presupuesto = new Presupuesto({ registro, topeMensualUsd: tope });
  const enrutador = crearEnrutador({
    adaptadores,
    politicas: { generarPractica: politica, revisarPractica: politicaMeta, pictogramas: politicaMeta, visionTabla: politica, traducir: politica },
    presupuesto,
    registro,
  });
  let n = 0;
  const deps: DepsCreador = {
    enrutador,
    catalogo,
    practicas: crearCatalogoPracticas([ejemplos.practica as Practica]),
    nuevoId: () => `01JC0000000000000000000N${String(++n).padStart(2, '0')}`,
  };
  return { deps, registro };
}
const peticion = { colegioId: 'colA', interruptores: {} };

describe('Creador chain in mock mode', () => {
  it('runs CNEB -> draft -> verifier -> Muse review without keys', async () => {
    const { deps } = montar(crearAdaptadoresSimulados());
    const s = await ejecutarCadena(deps, peticion, solicitud);
    expect(s.estado).toBe('propuesta');
    if (s.estado !== 'propuesta') return;
    const { propuesta } = s;
    expect(Practica.safeParse(propuesta.practica).success).toBe(true);
    expect(propuesta.practica.estado).toBe('borrador');
    expect(propuesta.practica.desempeno.cita).toBe(CITA);
    expect(propuesta.verificacion.ok).toBe(true);
    expect(propuesta.revisiones.map((r) => r.por)).toEqual(['verificador', 'muse']);
    expect(propuesta.fuentes.generador.simulado).toBe(true);
    expect(propuesta.recursos.every((r) => r.revisado === false)).toBe(true);
    expect(propuesta.recursos.map((r) => r.tipo).sort()).toEqual(['diagrama', 'quiz']);
    expect(propuesta.guionVideo?.length).toBeGreaterThan(0);
    expect(propuesta.pictogramas[0]?.imagen?.base64.length).toBeGreaterThan(10);
    expect(propuesta.textoOficial).toContain(CITA);
  });

  it('rejects a draft whose quote was altered by one letter and never reaches the reviewer', async () => {
    let revisiones = 0;
    const malo = () => ({ ...borradorSimulado(CITA), citaDesempeno: CITA.replace('Formula', 'Formulo') });
    const sim = crearAdaptadoresSimulados({ borrador: malo });
    const meta = sim.find((a) => a.nombre === 'meta')!;
    const revisar = meta.capacidades.revisarPractica!;
    meta.capacidades.revisarPractica = { revisar: async (b, c) => (revisiones++, revisar.revisar(b, c)) };
    const { deps } = montar(sim);
    const s = await ejecutarCadena(deps, peticion, solicitud);
    expect(s.estado).toBe('rechazado');
    if (s.estado === 'rechazado') expect(s.hallazgos.map((h) => h.regla)).toContain('cita_literal');
    expect(revisiones).toBe(0);
  });

  it('rejects a request whose own quote is not literal', async () => {
    const { deps } = montar(crearAdaptadoresSimulados());
    const s = await ejecutarCadena(deps, peticion, SolicitudPractica.parse({ desempeno: { ...refDesempeno, cita: CITA.replace('influyen', 'influyan') } }));
    expect(s.estado).toBe('rechazado');
  });

  it('retries once with the verifier findings and accepts the corrected draft', async () => {
    const correcciones: Array<string[] | undefined> = [];
    const sim = crearAdaptadoresSimulados({
      borrador: (s) => {
        correcciones.push(s.correcciones);
        const b = borradorSimulado(CITA);
        if (!s.correcciones) b.pistas[2] = 'El resultado es 1,9 s.';
        return b;
      },
    });
    const { deps } = montar(sim);
    const s = await ejecutarCadena(deps, peticion, solicitud);
    expect(s.estado).toBe('propuesta');
    expect(correcciones[0]).toBeUndefined();
    expect(correcciones[1]?.join(' ')).toMatch(/pista/i);
  });

  it('rejects a hint with the numeric result after the retry too (fail closed)', async () => {
    const sim = crearAdaptadoresSimulados({ borrador: () => ({ ...borradorSimulado(CITA), pistas: ['Piensa en el largo.', 'El resultado es 1,9 s.'] }) });
    const { deps } = montar(sim);
    const s = await ejecutarCadena(deps, peticion, solicitud);
    expect(s.estado).toBe('rechazado');
    if (s.estado === 'rechazado') expect(s.hallazgos.map((h) => h.regla)).toContain('pista_revela');
  });

  it('on quota exhaustion returns cuota and falls back to the catalog', async () => {
    const { deps, registro } = montar(crearAdaptadoresSimulados(), 0.001);
    registro.agregar({ ts: new Date().toISOString(), colegioId: 'colA', adaptador: 'gemini', modelo: 'm', endpoint: '/e', proposito: 'p', costoUsd: 0.5, latenciaMs: 1, estado: 'ok' });
    const s = await ejecutarCadena(deps, peticion, solicitud);
    expect(s.estado).toBe('catalogo');
    if (s.estado === 'catalogo') {
      expect(s.fallo.tipo).toBe('cuota');
      expect(s.catalogo.length).toBeGreaterThan(0);
    }
  });

  it('keeps going with the verifier alone when the second reviewer is down', async () => {
    const sim = crearAdaptadoresSimulados();
    sim.find((a) => a.nombre === 'meta')!.capacidades.revisarPractica = { revisar: async () => err({ tipo: 'sin_red', detalle: 'x' }) };
    const { deps } = montar(sim);
    const s = await ejecutarCadena(deps, peticion, solicitud);
    expect(s.estado).toBe('propuesta');
    if (s.estado === 'propuesta') expect(s.propuesta.revisiones.map((r) => r.por)).toEqual(['verificador']);
  });

  it('keeps Muse observations for the teacher', async () => {
    const sim = crearAdaptadoresSimulados();
    sim.find((a) => a.nombre === 'meta')!.capacidades.revisarPractica = {
      revisar: async () => ok({ veredicto: 'observado', observaciones: ['La pista 2 es muy vaga.'], modelo: 'muse-spark-1.3' }),
    };
    const { deps } = montar(sim);
    const s = await ejecutarCadena(deps, peticion, solicitud);
    if (s.estado !== 'propuesta') throw new Error('expected proposal');
    expect(s.propuesta.revisiones[1]).toMatchObject({ por: 'muse', veredicto: 'observado', notas: ['La pista 2 es muy vaga.'] });
  });
});

describe('teacher approval and signature', () => {
  async function propuesta() {
    const { deps } = montar(crearAdaptadoresSimulados());
    const s = await ejecutarCadena(deps, peticion, solicitud);
    if (s.estado !== 'propuesta') throw new Error('expected proposal');
    return { deps, p: s.propuesta };
  }

  it('approves an edited draft only after the verifier passes again', async () => {
    const { deps, p } = await propuesta();
    const editada = structuredClone(p);
    editada.practica.pistas[1] = 'Prueba con tres cuerdas de distinto largo.';
    const r = await aprobarPropuesta(deps, editada, { docente: 'docente-1' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.practica.estado).toBe('aprobada');
    expect(r.valor.practica.procedencia.revisiones.at(-1)).toMatchObject({ por: 'docente-1', veredicto: 'ok' });
    expect(r.valor.recursos.every((x) => x.revisado)).toBe(true);
    expect(Practica.safeParse(r.valor.practica).success).toBe(true);
  });

  it('refuses to approve when the teacher edit leaks the result (fail closed)', async () => {
    const { deps, p } = await propuesta();
    const editada = structuredClone(p);
    editada.practica.pistas[2] = 'Debe salir 1,9 s con la cuerda de 0,9 m.';
    const r = await aprobarPropuesta(deps, editada, { docente: 'docente-1' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.map((h) => h.regla)).toContain('pista_revela');
  });

  it('refuses to approve a quote edited by one letter', async () => {
    const { deps, p } = await propuesta();
    const editada = structuredClone(p);
    editada.practica.desempeno.cita = CITA.replace('Formula', 'Formulo');
    const r = await aprobarPropuesta(deps, editada, { docente: 'docente-1' });
    expect(r.ok).toBe(false);
  });

  it('signs the package with the teacher key and detects tampering', async () => {
    const { deps, p } = await propuesta();
    const r = await aprobarPropuesta(deps, p, { docente: 'docente-1' });
    if (!r.ok) throw new Error('expected approval');
    const { privada, publica } = await generarParClaves();
    const sobre = paquetePractica(r.valor.practica, 'DOCENTE001');
    const paquete = await firmarPaquete(sobre, privada);
    expect(PaqueteValidado.safeParse(paquete).success).toBe(true);
    const clave = await exportarClavePublica(publica);
    expect(await verificarPaquete(paquete, clave)).toBe(true);

    const alterado = structuredClone(paquete);
    (alterado.cuerpo as Practica).titulo = 'Otro título';
    expect(await verificarPaquete(alterado, clave)).toBe(false);
    expect(await verificarPaquete({ ...paquete, firma: undefined }, clave)).toBe(false);
    const otra = await generarParClaves();
    expect(await verificarPaquete(paquete, await exportarClavePublica(otra.publica))).toBe(false);
    expect(Paquete.safeParse(paquete).success).toBe(true);
  });
});
