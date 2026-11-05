import { describe, expect, it } from 'vitest';
import { AdaptadorEnlaceWame, enlaceWame } from './adaptadores/enlace-wame.ts';
import { AdaptadorPdfLocal } from './adaptadores/pdf-local.ts';
import { AdaptadorEntregaSimulado } from './adaptadores/simulado.ts';
import { calcularClaveIdempotencia, crearCola, dentroDeVentana, fusionarVencidos, RepositorioSalidaMemoria } from './cola.ts';
import { estadoParaDocente } from './estados.ts';
import { MensajeSalienteSchema, DestinoSchema } from './esquemas.ts';
import type { Destino, MensajeSaliente, PuertoEntrega } from './puertos.ts';

const VIERNES_18H = new Date('2026-11-06T23:00:00Z'); // Friday 18:00 in Lima (UTC-5)
const DOMINGO_18H = new Date('2026-11-08T23:00:00Z');
const VIERNES_10H = new Date('2026-11-06T15:00:00Z');

function mensaje(parcial: Partial<MensajeSaliente> = {}): MensajeSaliente {
  return {
    id: '01JC0000000000000000000M01',
    claveIdempotencia: 'k1',
    plantilla: 'familia_semanal_a',
    version: 1,
    lengua: 'es',
    cuerpo: { asunto: 'Resumen de la semana', texto: 'Esta semana su grupo midió un péndulo.', lineas: ['Midió un péndulo'], periodo: { desde: '2026-11-02', hasta: '2026-11-06' } },
    adjuntos: [],
    vigenteHasta: '2026-11-13T23:59:00Z',
    consentimientoRef: 'cons-1',
    ...parcial,
  };
}
const destino = (parcial: Partial<Destino> = {}): Destino => ({ canal: 'whatsapp', direccion: '51987654321', ref: 'apoderado-1', ...parcial });

function montar(opciones: { simulado?: ConstructorParameters<typeof AdaptadorEntregaSimulado>[0]; ahora?: Date; bajas?: string[] } = {}) {
  let ahora = opciones.ahora ?? VIERNES_18H;
  const simulado = new AdaptadorEntregaSimulado(opciones.simulado);
  const repo = new RepositorioSalidaMemoria();
  const cola = crearCola({
    repo,
    adaptadores: { whatsapp: simulado, correo: simulado, enlace_wame: new AdaptadorEnlaceWame(), pdf: new AdaptadorPdfLocal() } as Record<string, PuertoEntrega>,
    reloj: () => ahora,
    esBaja: (ref) => (opciones.bajas ?? []).includes(ref),
    nuevoId: (() => { let n = 0; return () => `01JC0000000000000000000X${String(++n).padStart(2, '0')}`; })(),
  });
  return { cola, repo, simulado, avanzar: (ms: number) => (ahora = new Date(ahora.getTime() + ms)), fijar: (d: Date) => (ahora = d) };
}

describe('schemas', () => {
  it('rejects extra fields in a message (allow-list, strict)', () => {
    expect(MensajeSalienteSchema.safeParse(mensaje()).success).toBe(true);
    expect(MensajeSalienteSchema.safeParse({ ...mensaje(), notas: 'x' }).success).toBe(false);
    expect(MensajeSalienteSchema.safeParse({ ...mensaje(), cuerpo: { texto: 'x', puntaje: 3 } }).success).toBe(false);
    expect(DestinoSchema.safeParse(destino()).success).toBe(true);
  });
});

describe('idempotency key', () => {
  it('is a stable hash of period, recipient and template', async () => {
    const a = await calcularClaveIdempotencia('2026-W45', 'apoderado-1', 'familia_semanal_a');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await calcularClaveIdempotencia('2026-W45', 'apoderado-1', 'familia_semanal_a')).toBe(a);
    expect(await calcularClaveIdempotencia('2026-W46', 'apoderado-1', 'familia_semanal_a')).not.toBe(a);
  });
});

describe('queue and drain', () => {
  it('queues, waits for the teacher approval and for a real connection, then delivers', async () => {
    const { cola, simulado } = montar();
    await cola.encolar(mensaje(), destino());
    expect((await cola.drenar({ hayRedReal: true })).enviados).toBe(0); // not approved yet
    cola.aprobarLote(['01JC0000000000000000000M01']);
    expect((await cola.drenar({ hayRedReal: false })).enviados).toBe(0); // offline
    expect(cola.listar()[0]!.estado).toBe('en_cola');
    const r = await cola.drenar({ hayRedReal: true });
    expect(r.enviados).toBe(1);
    expect(cola.listar()[0]!.estado).toBe('enviado_proveedor');
    expect(simulado.bandeja()).toHaveLength(1);
    await cola.actualizarEstados();
    expect(cola.listar()[0]!.estado).toBe('entregado');
  });

  it('does not duplicate sends across two consecutive syncs (idempotency)', async () => {
    const { cola, simulado } = montar();
    await cola.encolar(mensaje(), destino());
    await cola.encolar(mensaje({ id: '01JC0000000000000000000M02' }), destino()); // same key
    expect(cola.listar()).toHaveLength(1);
    cola.aprobarLote(['01JC0000000000000000000M01']);
    await cola.drenar({ hayRedReal: true });
    await cola.drenar({ hayRedReal: true });
    expect(simulado.bandeja()).toHaveLength(1);
  });

  it('retries with exponential backoff and fails after 5 attempts', async () => {
    const { cola, avanzar } = montar({ simulado: { sinRed: true } });
    await cola.encolar(mensaje(), destino());
    cola.aprobarLote(['01JC0000000000000000000M01']);
    await cola.drenar({ hayRedReal: true });
    expect(cola.listar()[0]).toMatchObject({ estado: 'en_cola', intentos: 1 });
    await cola.drenar({ hayRedReal: true }); // too early: backoff
    expect(cola.listar()[0]!.intentos).toBe(1);
    for (let i = 0; i < 6; i++) {
      avanzar(3 * 60 * 60 * 1000);
      await cola.drenar({ hayRedReal: true, ignorarVentana: true });
    }
    expect(cola.listar()[0]).toMatchObject({ estado: 'fallido', intentos: 5 });
  });

  it('fails after 48 hours even with attempts left', async () => {
    const { cola, avanzar } = montar({ simulado: { sinRed: true } });
    await cola.encolar(mensaje({ vigenteHasta: '2026-12-31T00:00:00Z' }), destino());
    cola.aprobarLote(['01JC0000000000000000000M01']);
    await cola.drenar({ hayRedReal: true });
    avanzar(49 * 60 * 60 * 1000);
    await cola.drenar({ hayRedReal: true, ignorarVentana: true });
    expect(cola.listar()[0]!.estado).toBe('fallido');
  });

  it('recovers after transient failures', async () => {
    const { cola, avanzar } = montar({ simulado: { fallarNVeces: 2 } });
    await cola.encolar(mensaje(), destino());
    cola.aprobarLote(['01JC0000000000000000000M01']);
    for (let i = 0; i < 4; i++) {
      await cola.drenar({ hayRedReal: true, ignorarVentana: true });
      avanzar(60 * 60 * 1000);
    }
    expect(cola.listar()[0]!.estado).toBe('enviado_proveedor');
  });

  it('marks a bounce as rebotado and offers the manual wa.me link', async () => {
    const { cola } = montar({ simulado: { rebote: true } });
    await cola.encolar(mensaje(), destino());
    cola.aprobarLote(['01JC0000000000000000000M01']);
    await cola.drenar({ hayRedReal: true });
    const e = cola.listar()[0]!;
    expect(e.estado).toBe('rebotado');
    expect(cola.enlaceManual(e.mensaje.id)).toMatch(/^https:\/\/wa\.me\/51987654321\?text=/);
  });

  it('never sends to a guardian who opted out (baja)', async () => {
    const { cola, simulado } = montar({ bajas: ['apoderado-1'] });
    await cola.encolar(mensaje(), destino());
    cola.aprobarLote(['01JC0000000000000000000M01']);
    await cola.drenar({ hayRedReal: true });
    expect(cola.listar()[0]!.estado).toBe('baja');
    expect(simulado.bandeja()).toHaveLength(0);
  });

  it('only sends inside 17:00-20:00 Lima time and never on Sunday', async () => {
    expect(dentroDeVentana(VIERNES_18H)).toBe(true);
    expect(dentroDeVentana(VIERNES_10H)).toBe(false);
    expect(dentroDeVentana(DOMINGO_18H)).toBe(false);
    const { cola, simulado, fijar } = montar({ ahora: VIERNES_10H });
    await cola.encolar(mensaje(), destino());
    cola.aprobarLote(['01JC0000000000000000000M01']);
    await cola.drenar({ hayRedReal: true });
    expect(simulado.bandeja()).toHaveLength(0);
    fijar(VIERNES_18H);
    await cola.drenar({ hayRedReal: true });
    expect(simulado.bandeja()).toHaveLength(1);
  });

  it('hides "leido" from the teacher', async () => {
    expect(estadoParaDocente('leido')).toBe('entregado');
    expect(estadoParaDocente('rebotado')).toBe('rebotado');
    const { cola } = montar({ simulado: { leer: true } });
    await cola.encolar(mensaje(), destino());
    cola.aprobarLote(['01JC0000000000000000000M01']);
    await cola.drenar({ hayRedReal: true });
    await cola.actualizarEstados();
    expect(cola.listar()[0]!.estado).toBe('entregado'); // the queue never stores "leido"
    expect(JSON.stringify(cola.listar())).not.toContain('leido');
  });

  it('keeps manual channels pending until the teacher marks them done', async () => {
    const { cola } = montar();
    await cola.encolar(mensaje({ claveIdempotencia: 'k-manual' }), destino({ canal: 'enlace_wame' }));
    cola.aprobarLote(['01JC0000000000000000000M01']);
    await cola.drenar({ hayRedReal: false, ignorarVentana: true }); // manual channels do not need the network
    const e = cola.listar()[0]!;
    expect(e).toMatchObject({ estado: 'en_cola', manual: true });
    expect(e.enlace).toContain('wa.me');
    cola.marcarEnviadoManual(e.mensaje.id);
    expect(cola.listar()[0]!.estado).toBe('enviado_proveedor');
  });
});

describe('expired weeklies', () => {
  it('merges two expired weeks into a two-week summary with explicit dates', async () => {
    const { cola, repo, fijar } = montar({ ahora: new Date('2026-11-02T20:00:00Z') });
    await cola.encolar(mensaje({ id: 'A1', claveIdempotencia: 'w1', vigenteHasta: '2026-11-09T00:00:00Z', cuerpo: { texto: 'Semana 1: midió un péndulo.', lineas: ['Midió un péndulo'], periodo: { desde: '2026-10-26', hasta: '2026-10-30' } } }), destino());
    await cola.encolar(mensaje({ id: 'A2', claveIdempotencia: 'w2', vigenteHasta: '2026-11-16T00:00:00Z', cuerpo: { texto: 'Semana 2: comparó con el modelo.', lineas: ['Comparó con el modelo'], periodo: { desde: '2026-11-02', hasta: '2026-11-06' } } }), destino());
    fijar(new Date('2026-11-20T23:00:00Z')); // both expired
    const r = await fusionarVencidos({ repo, reloj: () => new Date('2026-11-20T23:00:00Z'), nuevoId: () => 'FUS1' });
    expect(r.fusionados).toBe(1);
    const lista = repo.todos();
    expect(lista).toHaveLength(1);
    const m = lista[0]!.mensaje;
    expect(m.cuerpo.periodo).toEqual({ desde: '2026-10-26', hasta: '2026-11-06' });
    expect(m.cuerpo.texto).toMatch(/dos semanas/i);
    expect(m.cuerpo.texto).toContain('2026-10-26');
    expect(m.cuerpo.texto).toContain('2026-11-06');
    expect(m.cuerpo.lineas).toEqual(['Midió un péndulo', 'Comparó con el modelo']);
    expect(new Date(m.vigenteHasta).getTime()).toBeGreaterThan(new Date('2026-11-20T23:00:00Z').getTime());
    expect(lista[0]!.aprobado).toBe(false); // the teacher approves the merged summary again
  });

  it('does not send an expired weekly as if it were this week', async () => {
    const { cola, simulado, fijar } = montar({ ahora: VIERNES_18H });
    await cola.encolar(mensaje({ vigenteHasta: '2026-11-07T00:00:00Z' }), destino());
    cola.aprobarLote(['01JC0000000000000000000M01']);
    fijar(new Date('2026-11-13T23:00:00Z')); // next Friday 18:00 Lima
    await cola.drenar({ hayRedReal: true });
    expect(simulado.bandeja()).toHaveLength(0);
  });

  it('drops weeks older than the two most recent ones', async () => {
    const { cola, repo } = montar();
    for (const [i, desde] of ['2026-10-12', '2026-10-19', '2026-10-26'].entries()) {
      await cola.encolar(mensaje({ id: `W${i}`, claveIdempotencia: `w${i}`, vigenteHasta: '2026-11-01T00:00:00Z', cuerpo: { texto: `Semana ${i}`, lineas: [`L${i}`], periodo: { desde, hasta: desde } } }), destino());
    }
    const r = await fusionarVencidos({ repo, reloj: () => new Date('2026-11-20T00:00:00Z'), nuevoId: () => 'FUS2' });
    expect(r.descartados).toBe(1);
    expect(repo.todos()[0]!.mensaje.cuerpo.lineas).toEqual(['L1', 'L2']);
  });
});

describe('wa.me and local PDF adapters', () => {
  it('builds a prefilled wa.me link (digits only, Peru prefix)', () => {
    expect(enlaceWame('987 654 321', 'Hola / ¿qué tal?')).toBe('https://wa.me/51987654321?text=Hola%20%2F%20%C2%BFqu%C3%A9%20tal%3F');
    expect(enlaceWame('+51 987-654-321', 'x')).toContain('wa.me/51987654321');
    expect(enlaceWame('123', 'x')).toBeUndefined();
  });

  it('does not claim delivery: the teacher has to tap send', async () => {
    const a = new AdaptadorEnlaceWame();
    expect(a.capacidades().estadoEntrega).toBe(false);
    const r = await a.enviar(mensaje(), destino({ canal: 'enlace_wame' }));
    expect(r).toMatchObject({ ok: true, valor: { estado: 'en_cola', manual: true } });
  });

  it('renders printable HTML, escaped, with print styles', async () => {
    const r = await new AdaptadorPdfLocal().enviar(mensaje({ cuerpo: { asunto: 'A <b>', texto: '<script>x</script>' } }), destino({ canal: 'pdf' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.html).toContain('@media print');
    expect(r.valor.html).not.toContain('<script>');
    expect(r.valor.html).toContain('&lt;script&gt;');
  });
});

describe('simulated adapter', () => {
  it('labels its tray as simulated data and keeps an HTML preview', async () => {
    const s = new AdaptadorEntregaSimulado();
    await s.enviar(mensaje(), destino());
    expect(s.bandeja()[0]!.vistaPreviaHtml).toContain('Datos simulados');
  });

  it('is idempotent on its own too', async () => {
    const s = new AdaptadorEntregaSimulado();
    const a = await s.enviar(mensaje(), destino());
    const b = await s.enviar(mensaje(), destino());
    expect(a).toEqual(b);
    expect(s.bandeja()).toHaveLength(1);
  });
});
