import { describe, expect, it } from 'vitest';
import { crearColaSalida, dentroDeVentana, type AlmacenSalida } from './cola.ts';
import type { Destino, MensajeSaliente, PuertoEntrega } from './puertos.ts';
import { crearAdaptadorSimulado } from './simulado.ts';

const T0 = Date.UTC(2026, 10, 6, 22, 30); // Friday 17:30 in Lima (UTC-5)
const HORA = 3_600_000;

const msg = (n: number, extra: Partial<MensajeSaliente> = {}): MensajeSaliente => ({
  id: `01JC00000000000000000MSG${String(n).padStart(2, '0')}`,
  claveIdempotencia: `clave-${n}`,
  plantilla: 'familia_semanal_a',
  version: 1,
  lengua: 'es',
  cuerpo: { asunto: 'Rikuy', texto: `mensaje ${n}` },
  adjuntos: [],
  vigenteHasta: new Date(T0 + 5 * 24 * HORA).toISOString(),
  consentimientoRef: 'alta-2026-03',
  ...extra,
});
const wa: Destino = { canal: 'whatsapp', direccion: '+51900000001' };

function montar(opciones: { reloj?: { t: number }; almacen?: AlmacenSalida } = {}) {
  const reloj = opciones.reloj ?? { t: T0 };
  let guardado = '[]';
  const almacen = opciones.almacen ?? { cargar: async () => JSON.parse(guardado), guardar: async (x) => void (guardado = JSON.stringify(x)) };
  const cola = crearColaSalida({ almacen, ahora: () => reloj.t, desfaseMin: -300 });
  return { cola, reloj, almacen, puerto: crearAdaptadorSimulado('whatsapp') };
}
const puertos = (p: PuertoEntrega) => ({ whatsapp: p }) as Record<string, PuertoEntrega>;

describe('outbox: the teacher approves before anything is sent', () => {
  it('nothing leaves without preview and approval', async () => {
    const { cola, puerto } = montar();
    await cola.agregarBorrador(msg(1), wa);
    await cola.drenar({ enLinea: true, puertos: puertos(puerto) });
    expect(puerto.bandeja).toHaveLength(0);

    await expect(cola.aprobar('01JC00000000000000000MSG01', 'docente')).rejects.toThrow(/vista previa/);
    await cola.marcarVista('01JC00000000000000000MSG01');
    await cola.aprobar('01JC00000000000000000MSG01', 'docente');
    await cola.drenar({ enLinea: true, puertos: puertos(puerto) });
    expect(puerto.bandeja).toHaveLength(1);
  });

  it('batch approval works for group messages but never for individual (variant B) ones', async () => {
    const { cola } = montar();
    const b = msg(2, { plantilla: 'familia_semanal_b' });
    await cola.agregarBorrador(msg(1), wa);
    await cola.agregarBorrador(b, wa);
    await cola.marcarVista(msg(1).id);
    await cola.marcarVista(b.id);
    const r = await cola.aprobarLote([msg(1).id, b.id], 'docente');
    expect(r.aprobados).toEqual([msg(1).id]);
    expect(r.rechazados).toEqual([{ id: b.id, motivo: 'individual_uno_por_uno' }]);
    await cola.aprobar(b.id, 'docente'); // one by one is allowed
    expect((await cola.lista()).every((i) => i.estado === 'en_cola')).toBe(true);
  });

  it('keeps a record (acta) with template, version, hash, consent and approver, but not the child text', async () => {
    const { cola } = montar();
    await cola.agregarBorrador(msg(1), wa);
    await cola.marcarVista(msg(1).id);
    await cola.aprobar(msg(1).id, 'docente');
    const item = (await cola.lista())[0];
    expect(item.acta).toMatchObject({ plantilla: 'familia_semanal_a', version: 1, consentimientoRef: 'alta-2026-03', aprobadoPor: 'docente' });
    expect(item.acta?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(item.acta)).not.toContain('mensaje 1');
  });
});

describe('outbox: offline queue and flush when the hub syncs', () => {
  it('stays queued with no network and flushes once, in order', async () => {
    const { cola, puerto } = montar();
    for (const n of [1, 2]) {
      await cola.agregarBorrador(msg(n), wa);
      await cola.marcarVista(msg(n).id);
    }
    await cola.aprobarLote([msg(1).id, msg(2).id], 'docente');

    const sin = await cola.drenar({ enLinea: false, puertos: puertos(puerto) });
    expect(sin.enviados).toBe(0);
    expect(puerto.bandeja).toHaveLength(0);

    const con = await cola.drenar({ enLinea: true, puertos: puertos(puerto) });
    expect(con.enviados).toBe(2);
    expect(puerto.bandeja.map((b) => b.mensaje.id)).toEqual([msg(1).id, msg(2).id]);
  });

  it('is idempotent: two syncs in a row do not send twice, even in parallel', async () => {
    const { cola, puerto } = montar();
    await cola.agregarBorrador(msg(1), wa);
    await cola.marcarVista(msg(1).id);
    await cola.aprobar(msg(1).id, 'docente');
    await Promise.all([cola.drenar({ enLinea: true, puertos: puertos(puerto) }), cola.drenar({ enLinea: true, puertos: puertos(puerto) })]);
    await cola.drenar({ enLinea: true, puertos: puertos(puerto) });
    expect(puerto.bandeja).toHaveLength(1);
  });

  it('does not duplicate a draft with the same idempotency key', async () => {
    const { cola } = montar();
    await cola.agregarBorrador(msg(1), wa);
    await cola.agregarBorrador(msg(3, { claveIdempotencia: 'clave-1' }), wa);
    expect(await cola.lista()).toHaveLength(1);
  });

  it('survives a restart: state is reloaded from the store and nothing is re-sent', async () => {
    const reloj = { t: T0 };
    let guardado = '[]';
    const almacen: AlmacenSalida = { cargar: async () => JSON.parse(guardado), guardar: async (x) => void (guardado = JSON.stringify(x)) };
    const a = montar({ reloj, almacen });
    await a.cola.agregarBorrador(msg(1), wa);
    await a.cola.marcarVista(msg(1).id);
    await a.cola.aprobar(msg(1).id, 'docente');
    await a.cola.drenar({ enLinea: true, puertos: puertos(a.puerto) });
    const b = montar({ reloj, almacen });
    await b.cola.drenar({ enLinea: true, puertos: puertos(b.puerto) });
    expect(b.puerto.bandeja).toHaveLength(0);
    expect((await b.cola.lista())[0].estado).toBe('enviado_proveedor');
  });

  it('drops a weekly message that expired instead of sending it late', async () => {
    const { cola, puerto, reloj } = montar();
    await cola.agregarBorrador(msg(1, { vigenteHasta: new Date(T0 + HORA).toISOString() }), wa);
    await cola.marcarVista(msg(1).id);
    await cola.aprobar(msg(1).id, 'docente');
    reloj.t = T0 + 3 * HORA;
    await cola.drenar({ enLinea: true, puertos: puertos(puerto) });
    expect(puerto.bandeja).toHaveLength(0);
    expect((await cola.lista())[0].estado).toBe('vencido');
  });
});

describe('outbox: retries and honest states', () => {
  async function aprobado(puerto = crearAdaptadorSimulado('whatsapp', { fallarNVeces: 2 })) {
    const m = montar();
    await m.cola.agregarBorrador(msg(1), wa);
    await m.cola.marcarVista(msg(1).id);
    await m.cola.aprobar(msg(1).id, 'docente');
    return { ...m, puerto };
  }

  it('retries with exponential backoff and then sends', async () => {
    const { cola, puerto, reloj } = await aprobado();
    await cola.drenar({ enLinea: true, puertos: puertos(puerto) });
    expect((await cola.lista())[0]).toMatchObject({ estado: 'en_cola', intentos: 1 });
    await cola.drenar({ enLinea: true, puertos: puertos(puerto) }); // too early: backoff
    expect((await cola.lista())[0].intentos).toBe(1);
    reloj.t += 6 * 60_000;
    await cola.drenar({ enLinea: true, puertos: puertos(puerto) });
    expect((await cola.lista())[0].intentos).toBe(2);
    reloj.t += 11 * 60_000;
    await cola.drenar({ enLinea: true, puertos: puertos(puerto) });
    expect((await cola.lista())[0].estado).toBe('enviado_proveedor');
  });

  it('gives up after 5 attempts and shows the manual wa.me path', async () => {
    const { cola, puerto, reloj } = await aprobado(crearAdaptadorSimulado('whatsapp', { fallarNVeces: 99 }));
    for (let i = 0; i < 6; i += 1) {
      reloj.t += 3 * HORA;
      await cola.drenar({ enLinea: true, puertos: puertos(puerto) });
    }
    expect((await cola.lista())[0]).toMatchObject({ estado: 'fallido', intentos: 5 });
  });

  it('marks a bounce as rebotado and a withdrawn consent as baja, and never retries them', async () => {
    const { cola, puerto } = await aprobado(crearAdaptadorSimulado('whatsapp', { rebote: true }));
    await cola.drenar({ enLinea: true, puertos: puertos(puerto) });
    expect((await cola.lista())[0].estado).toBe('rebotado');
    const b = montar();
    await b.cola.agregarBorrador(msg(1), wa);
    await b.cola.marcarVista(msg(1).id);
    await b.cola.aprobar(msg(1).id, 'docente');
    const p2 = crearAdaptadorSimulado('whatsapp', { bajas: [wa.direccion] });
    await b.cola.drenar({ enLinea: true, puertos: puertos(p2) });
    expect((await b.cola.lista())[0].estado).toBe('baja');
  });

  it('refreshes sent messages to delivered from the provider state', async () => {
    const { cola, puerto } = await aprobado(crearAdaptadorSimulado('whatsapp'));
    await cola.drenar({ enLinea: true, puertos: puertos(puerto) });
    await cola.refrescarEstados(puertos(puerto));
    expect((await cola.lista())[0].estado).toBe('entregado');
  });

  it('the wa.me adapter is manual: prepared, never claimed as delivered', async () => {
    const m = montar();
    const wame = crearAdaptadorSimulado('enlace_wame', { manual: true });
    await m.cola.agregarBorrador(msg(1), { canal: 'enlace_wame', direccion: '+51900000001' });
    await m.cola.marcarVista(msg(1).id);
    await m.cola.aprobar(msg(1).id, 'docente');
    await m.cola.drenar({ enLinea: true, puertos: { enlace_wame: wame } as Record<string, PuertoEntrega> });
    await m.cola.refrescarEstados({ enlace_wame: wame } as Record<string, PuertoEntrega>);
    const item = (await m.cola.lista())[0];
    expect(item.estado).toBe('enviado_proveedor');
    expect(item.manual).toBe(true);
  });
});

describe('sending window', () => {
  it('allows 17:00-20:00 local time, not on Sundays', () => {
    expect(dentroDeVentana(T0, -300)).toBe(true); // Fri 17:30
    expect(dentroDeVentana(Date.UTC(2026, 10, 6, 21, 59), -300)).toBe(false); // 16:59
    expect(dentroDeVentana(Date.UTC(2026, 10, 7, 1, 1), -300)).toBe(false); // 20:01
    expect(dentroDeVentana(Date.UTC(2026, 10, 8, 22, 30), -300)).toBe(false); // Sunday 17:30
  });

  it('the queue waits for the window when it is requested', async () => {
    const m = montar({ reloj: { t: Date.UTC(2026, 10, 6, 14, 0) } }); // 09:00 Lima
    await m.cola.agregarBorrador(msg(1), wa);
    await m.cola.marcarVista(msg(1).id);
    await m.cola.aprobar(msg(1).id, 'docente');
    await m.cola.drenar({ enLinea: true, puertos: puertos(m.puerto), respetarVentana: true });
    expect(m.puerto.bandeja).toHaveLength(0);
    m.reloj.t = T0;
    await m.cola.drenar({ enLinea: true, puertos: puertos(m.puerto), respetarVentana: true });
    expect(m.puerto.bandeja).toHaveLength(1);
  });
});
