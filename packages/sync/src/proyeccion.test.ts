import type { Evento } from '@rikuy/contracts';
import { dispositivos, ejemplos, ids } from '@rikuy/contracts/fixtures';
import { describe, expect, it } from 'vitest';
import { sealEvent } from './firmas.ts';
import { createMemoryRepository } from './memoria.ts';
import { project } from './proyeccion.ts';
import { createEventWriter } from './registro.ts';
import { fakeClassKeys, fakeCripto, manualClock, seededRandom } from './testing/index.ts';

const keys = fakeClassKeys();

function device(dispositivo: string, teacher = false, clock = manualClock()) {
  const repo = createMemoryRepository();
  const w = createEventWriter({
    claseId: ids.clase,
    dispositivo,
    repo,
    cripto: fakeCripto,
    claveMac: keys.claveMac,
    clavePrivada: teacher ? keys.clavePrivada : undefined,
    clock,
    random: seededRandom(dispositivo),
  });
  return { repo, w, clock };
}

const clase = { ...ejemplos.clase, docenteDispositivo: dispositivos.docente, claveClasePub: keys.clavePub };
const medicion = (id: string) => ({ ...ejemplos.medicion, id, grupoId: ids.grupo1 });

async function scenario() {
  const t = device(dispositivos.docente, true);
  const g = device(dispositivos.grupo1);
  const events: Evento[] = [];
  events.push(await t.w.append('clase.creada', clase));
  t.clock.advance(1000);
  events.push(await g.w.append('grupo.unido', { ...ejemplos.grupo, dispositivo: dispositivos.grupo1 }));
  g.clock.advance(1000);
  events.push(await g.w.append('medicion.registrada', medicion(ids.medicion)));
  events.push(await g.w.append('medicion.registrada', medicion(ids.respuesta)));
  events.push(await g.w.append('medicion.anulada', { medicionId: ids.medicion }));
  t.clock.advance(5000);
  events.push(await t.w.append('clase.config', { abierta: false }));
  events.push(await t.w.append('tutor.interruptor', { activo: false, grupoId: ids.grupo1 }));
  return { t, g, events };
}

describe('projection', () => {
  it('builds the class state from the log', async () => {
    const { events } = await scenario();
    const s = project(ids.clase, events);
    expect(s.clase?.codigo).toBe(clase.codigo);
    expect(s.clase?.abierta).toBe(false);
    expect(Object.keys(s.grupos)).toEqual([ids.grupo1]);
    expect(s.mediciones[ids.medicion].anulada).toBe(true);
    expect(s.mediciones[ids.respuesta].anulada).toBe(false);
    expect(s.interruptores.tutor[ids.grupo1]).toBe(false);
    expect(s.eventos).toBe(events.length);
  });

  it('does not depend on the order of the events', async () => {
    const { events } = await scenario();
    expect(project(ids.clase, [...events].reverse())).toEqual(project(ids.clase, events));
  });

  it('LWW per field: the highest HLC wins, ties broken by the highest device id', async () => {
    const { t, events } = await scenario();
    t.clock.advance(1);
    const later = await t.w.append('clase.config', { abierta: true });
    expect(project(ids.clase, [later, ...events]).clase?.abierta).toBe(true);
  });

  it('ignores authority events that do not come from the teacher device (even if they slipped in)', async () => {
    const { events } = await scenario();
    const forged = await sealEvent(
      { ...events[1], id: ids.evento2, seq: 99, tipo: 'clase.config', datos: { abierta: true }, hlc: '9999999999999-0000-zzzzzzzz' },
      { cripto: fakeCripto, claveMac: keys.claveMac, clavePrivada: keys.clavePrivada },
    );
    const { eventos: _a, porTipo: _b, ...withForged } = project(ids.clase, [...events, forged]);
    const { eventos: _c, porTipo: _d, ...without } = project(ids.clase, events);
    expect(withForged).toEqual(without);
  });

  it('a group cannot annul another group measurement', async () => {
    const { events } = await scenario();
    const other = device(dispositivos.grupo2);
    const annul = await other.w.append('medicion.anulada', { medicionId: ids.respuesta });
    expect(project(ids.clase, [...events, annul]).mediciones[ids.respuesta].anulada).toBe(false);
  });

  it('forgotten students disappear with their consents', async () => {
    const t = device(dispositivos.docente, true);
    const evs = [await t.w.append('clase.creada', clase)];
    evs.push(await t.w.append('aula.estudiante_alta', ejemplos.estudiante));
    expect(project(ids.clase, evs).estudiantes[ids.estudiante1]).toBeDefined();
    evs.push(await t.w.append('estudiante.olvidar', { estudianteId: ids.estudiante1 }));
    const s = project(ids.clase, evs);
    expect(s.estudiantes[ids.estudiante1]).toBeUndefined();
    expect(s.olvidados).toEqual([ids.estudiante1]);
  });

  it('skips events of other classes and malformed ones', async () => {
    const { events } = await scenario();
    const s = project(ids.clase, [...events, { ...events[2], claseId: ids.aula }, { basura: 1 } as unknown as Evento]);
    expect(s.eventos).toBe(events.length);
  });
});
