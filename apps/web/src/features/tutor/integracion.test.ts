import type { Evidencia, EventoTipado } from '@rikuy/contracts';
import { dispositivos, ids } from '@rikuy/contracts/fixtures';
import { MemoriaLocal } from '@rikuy/memoria';
import { contrastarPrediccion, turnoReglas, type ContextoJuez, type DatoMedido } from '@rikuy/tutor';
import { describe, expect, it } from 'vitest';
import { ESCENAS_DEMO, PRACTICA_DEMO } from './demo.ts';

/** Composition root check: the tutor judge feeds the memory projection, the memory feeds the tutor. */
const ctxJuez: ContextoJuez = { variables: [{ id: 'longitud', etiqueta: 'Longitud de la cuerda' }, { id: 'masa' }], variableProbada: 'longitud' };
const datos: DatoMedido[] = [{ x: 0.3, y: 1.1 }, { x: 0.6, y: 1.55 }, { x: 0.9, y: 1.9 }];
const R = '01JC0000000000000000000R01';
const V = '01JC0000000000000000000V01';

const evento = (n: number, tipo: string, d: unknown): EventoTipado =>
  ({
    id: `01JC00000000000000000EV0${n}`, dispositivo: dispositivos.grupo1, seq: n, hlc: `176230080000${n}-0000-grupo001`, claseId: ids.clase, sv: 1, tipo,
    autor: { grupoId: ids.grupo1, estudianteIds: [ids.estudiante1] }, datos: d,
  }) as unknown as EventoTipado;

const respuesta = (texto: string) => ({ id: R, claseId: ids.clase, grupoId: ids.grupo1, momento: 'prediccion', texto, lengua: 'es', entrada: 'teclado', pistasUsadasAntes: 0 });
const evidencia: Evidencia = { id: V, respuestaId: R, grupoId: ids.grupo1, claseId: ids.clase, indicador: 'prediccion', nivel: 2, estado: 'ok', cita: 'tarda más', desempeno: { competencia: 1, desempeno: 1 }, fuente: 'reglas', confirmadaPorDocente: false };

function memoriaDe(texto: string) {
  const m = new MemoriaLocal();
  m.reconstruir([evento(1, 'respuesta.registrada', respuesta(texto)), evento(2, 'evidencia.calculada', evidencia)], {
    aulaId: ids.aula,
    practicaDeClase: () => ({ desempeno: { nivel: 'secundaria', grado: 2, area: 'ciencia-y-tecnologia', competencia: 1, desempeno: 1 }, conceptos: ['longitud'] }),
    contraste: (p) => contrastarPrediccion(p.respuesta?.texto ?? '', ctxJuez, datos),
  });
  return m;
}

describe('judge -> memory -> tutor', () => {
  it('a prediction the data confirm is remembered and the tutor resumes it', async () => {
    const m = memoriaDe('Si alargo la cuerda tarda más');
    const r = await m.recuperar({ estudianteId: ids.estudiante1 });
    expect(r.map((e) => e.tipo)).toEqual(['prediccion_confirmada']);
    const t = turnoReglas('hola', { practica: PRACTICA_DEMO, escenas: ESCENAS_DEMO, escalera: { mostradas: 0 }, recuerdos: r });
    expect(t.tipo === 'respuesta' && t.texto).toMatch(/La clase pasada/);
  });
  it('a prediction the data contradict is refuted (material for the tutor, not a negative label)', async () => {
    const m = memoriaDe('Si alargo la cuerda tarda menos');
    expect((await m.recuperar({ estudianteId: ids.estudiante1 })).map((e) => e.tipo)).toEqual(['prediccion_refutada']);
  });
});
