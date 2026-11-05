import { describe, expect, it } from 'vitest';
import { ErrorHttp, conReintentos } from './reintentos.ts';
import { costoImagen, costoTexto, Presupuesto, RegistroUsoMemoria } from './presupuesto.ts';
import { crearEnrutador, type Adaptador, type Politica } from './enrutador.ts';
import { err, ok } from './result.ts';
import { borradorValido, refDesempeno } from './pruebas-util.ts';
import type { Capacidades } from './puertos.ts';

const solicitud = { desempeno: refDesempeno, lengua: 'es' as const, recursos: { quiz: true, diagrama: true, guionVideo: false, pictogramas: false } };

describe('conReintentos', () => {
  it('retries 429 and 5xx twice with 1 s then 2 s backoff', async () => {
    const esperas: number[] = [];
    let n = 0;
    const r = await conReintentos(
      async () => {
        n++;
        if (n < 3) throw new ErrorHttp(503, 'down');
        return 'ok';
      },
      { dormir: async (ms) => void esperas.push(ms) },
    );
    expect(r).toBe('ok');
    expect(esperas).toEqual([1000, 2000]);
  });

  it('gives up after two retries', async () => {
    let n = 0;
    await expect(
      conReintentos(
        async () => {
          n++;
          throw new ErrorHttp(429, 'slow down');
        },
        { dormir: async () => {} },
      ),
    ).rejects.toMatchObject({ status: 429 });
    expect(n).toBe(3);
  });

  it('does not retry client errors', async () => {
    let n = 0;
    await expect(
      conReintentos(
        async () => {
          n++;
          throw new ErrorHttp(400, 'bad');
        },
        { dormir: async () => {} },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(n).toBe(1);
  });

  it('retries the Meta "referenced response not found" 400', async () => {
    let n = 0;
    const r = await conReintentos(
      async () => {
        n++;
        if (n === 1) throw new ErrorHttp(400, 'Referenced response not found');
        return 1;
      },
      { dormir: async () => {} },
    );
    expect(r).toBe(1);
  });
});

describe('costs and budget', () => {
  it('prices Muse text with the Willay rates and images at US$ 0.01', () => {
    expect(costoTexto('muse-spark-1.3', 1_000_000, 1_000_000)).toBeCloseTo(1.25 + 4.25);
    expect(costoImagen(3)).toBeCloseTo(0.03);
  });

  it('never under-estimates an unknown model', () => {
    expect(costoTexto('modelo-desconocido', 1_000_000, 0)).toBeGreaterThanOrEqual(costoTexto('muse-spark-1.3', 1_000_000, 0));
  });

  it('caps spend per school and month', () => {
    let ahora = new Date('2026-11-05T10:00:00Z');
    const registro = new RegistroUsoMemoria();
    const p = new Presupuesto({ registro, topeMensualUsd: 1, reloj: () => ahora });
    expect(p.asegurar('colA', 0.6)).toBeUndefined();
    registro.agregar({ ts: ahora.toISOString(), colegioId: 'colA', adaptador: 'meta', modelo: 'm', endpoint: '/e', proposito: 'p', costoUsd: 0.6, latenciaMs: 1, estado: 'ok' });
    expect(p.asegurar('colA', 0.6)?.tipo).toBe('cuota');
    expect(p.asegurar('colB', 0.6)).toBeUndefined(); // another school
    ahora = new Date('2026-12-01T00:00:00Z');
    expect(p.asegurar('colA', 0.6)).toBeUndefined(); // new month
  });
});

function adaptadorFalso(nombre: Adaptador['nombre'], fuente: Adaptador['fuente'], capacidades: Partial<Capacidades>, extra: Partial<Adaptador> = {}): Adaptador {
  return { nombre, fuente, modelo: `${nombre}-modelo`, capacidades, disponible: () => true, ...extra };
}

const politicaGen: Politica = { orden: ['gemini', 'ollama'], timeoutMs: 50, privacidad: 'solo-docente' };

function montar(adaptadores: Adaptador[], politica: Politica = politicaGen, tope = 10) {
  const registro = new RegistroUsoMemoria();
  const presupuesto = new Presupuesto({ registro, topeMensualUsd: tope, reloj: () => new Date('2026-11-05T10:00:00Z') });
  const enrutador = crearEnrutador({
    adaptadores,
    politicas: { generarPractica: politica, revisarPractica: politica, pictogramas: politica, visionTabla: politica, traducir: politica },
    presupuesto,
    registro,
  });
  return { enrutador, registro, presupuesto };
}
const llamar = (e: ReturnType<typeof montar>['enrutador'], extra: Partial<Parameters<typeof e.ejecutar>[1]> = {}) =>
  e.ejecutar('generarPractica', { colegioId: 'colA', interruptores: {}, ...extra }, (impl, ctx) => impl.generar(solicitud, ctx));

describe('enrutador', () => {
  it('uses the first adapter and reports source, adapter and model', async () => {
    const { enrutador } = montar([
      adaptadorFalso('gemini', 'ia-nube', { generarPractica: { generar: async () => ok(borradorValido()) } }),
      adaptadorFalso('ollama', 'ia-local', { generarPractica: { generar: async () => err({ tipo: 'proveedor', detalle: 'no debería' }) } }),
    ]);
    const r = await llamar(enrutador);
    expect(r.resultado.ok).toBe(true);
    expect(r).toMatchObject({ adaptador: 'gemini', fuente: 'ia-nube', modelo: 'gemini-modelo' });
  });

  it('falls through to the next adapter on failure', async () => {
    const { enrutador } = montar([
      adaptadorFalso('gemini', 'ia-nube', { generarPractica: { generar: async () => err({ tipo: 'proveedor', detalle: '500' }) } }),
      adaptadorFalso('ollama', 'ia-local', { generarPractica: { generar: async () => ok(borradorValido()) } }),
    ]);
    const r = await llamar(enrutador);
    expect(r).toMatchObject({ adaptador: 'ollama', fuente: 'ia-local' });
    expect(r.intentos.map((i) => [i.adaptador, i.fallo?.tipo])).toEqual([['gemini', 'proveedor'], ['ollama', undefined]]);
  });

  it('returns cuota when the school budget is exhausted and no free adapter can answer', async () => {
    let llamadas = 0;
    const { enrutador, registro } = montar(
      [
        adaptadorFalso('gemini', 'ia-nube', { generarPractica: { generar: async () => (llamadas++, ok(borradorValido())) } }, { costoEstimadoUsd: () => 0.5 }),
      ],
      { orden: ['gemini'], timeoutMs: 50, privacidad: 'solo-docente' },
      1,
    );
    registro.agregar({ ts: '2026-11-05T09:00:00Z', colegioId: 'colA', adaptador: 'gemini', modelo: 'm', endpoint: '/e', proposito: 'p', costoUsd: 0.8, latenciaMs: 1, estado: 'ok' });
    const r = await llamar(enrutador);
    expect(r.resultado).toEqual({ ok: false, error: expect.objectContaining({ tipo: 'cuota' }) });
    expect(llamadas).toBe(0); // rejected before calling the provider
  });

  it('skips paid adapters on cuota but still tries a free local adapter', async () => {
    const { enrutador, registro } = montar(
      [
        adaptadorFalso('gemini', 'ia-nube', { generarPractica: { generar: async () => ok(borradorValido()) } }, { costoEstimadoUsd: () => 0.5 }),
        adaptadorFalso('ollama', 'ia-local', { generarPractica: { generar: async () => ok(borradorValido()) } }),
      ],
      politicaGen,
      1,
    );
    registro.agregar({ ts: '2026-11-05T09:00:00Z', colegioId: 'colA', adaptador: 'gemini', modelo: 'm', endpoint: '/e', proposito: 'p', costoUsd: 0.9, latenciaMs: 1, estado: 'ok' });
    const r = await llamar(enrutador);
    expect(r.adaptador).toBe('ollama');
  });

  it('records metadata-only usage reported by the adapter', async () => {
    const { enrutador, registro } = montar([
      adaptadorFalso('gemini', 'ia-nube', {
        generarPractica: {
          generar: async (_s, ctx) => {
            ctx?.registrarUso({ endpoint: '/generate', proposito: 'generar', tokensEntrada: 100, tokensSalida: 50, costoUsd: 0.002 });
            return ok(borradorValido());
          },
        },
      }),
    ], { orden: ['gemini'], timeoutMs: 50, privacidad: 'solo-docente' });
    await llamar(enrutador);
    const [e] = registro.entradas();
    expect(e).toMatchObject({ colegioId: 'colA', adaptador: 'gemini', modelo: 'gemini-modelo', endpoint: '/generate', tokensEntrada: 100, costoUsd: 0.002, estado: 'ok' });
    expect(JSON.stringify(e)).not.toContain('péndulo');
    expect(typeof e!.latenciaMs).toBe('number');
  });

  it("keeps cloud adapters out when the policy is 'local'", async () => {
    let nube = 0;
    const { enrutador } = montar(
      [
        adaptadorFalso('gemini', 'ia-nube', { generarPractica: { generar: async () => (nube++, ok(borradorValido())) } }),
      ],
      { orden: ['gemini'], timeoutMs: 50, privacidad: 'local' },
    );
    const r = await llamar(enrutador);
    expect(nube).toBe(0);
    expect(r.resultado).toEqual({ ok: false, error: expect.objectContaining({ tipo: 'politica' }) });
  });

  it('requires the teacher switch when the policy asks for it', async () => {
    const { enrutador } = montar(
      [adaptadorFalso('gemini', 'ia-nube', { generarPractica: { generar: async () => ok(borradorValido()) } })],
      { orden: ['gemini'], timeoutMs: 50, privacidad: 'anonimizado', requiereInterruptor: 'iaNube' },
    );
    expect((await llamar(enrutador)).resultado).toEqual({ ok: false, error: expect.objectContaining({ tipo: 'politica' }) });
    expect((await llamar(enrutador, { interruptores: { iaNube: true } })).resultado.ok).toBe(true);
  });

  it('times out a slow adapter and moves on', async () => {
    const { enrutador } = montar([
      adaptadorFalso('gemini', 'ia-nube', { generarPractica: { generar: () => new Promise(() => {}) } }),
      adaptadorFalso('ollama', 'ia-local', { generarPractica: { generar: async () => ok(borradorValido()) } }),
    ]);
    const r = await llamar(enrutador);
    expect(r.intentos[0]!.fallo?.tipo).toBe('timeout');
    expect(r.adaptador).toBe('ollama');
  });

  it('turns a thrown error into a provider failure without leaking its message details', async () => {
    const { enrutador } = montar([adaptadorFalso('gemini', 'ia-nube', { generarPractica: { generar: async () => { throw new Error('boom'); } } })], { orden: ['gemini'], timeoutMs: 50, privacidad: 'solo-docente' });
    expect((await llamar(enrutador)).resultado).toEqual({ ok: false, error: expect.objectContaining({ tipo: 'proveedor' }) });
  });

  it('skips unavailable adapters and adapters without the capability', async () => {
    const { enrutador } = montar([
      adaptadorFalso('gemini', 'ia-nube', { generarPractica: { generar: async () => ok(borradorValido()) } }, { disponible: () => false }),
      adaptadorFalso('ollama', 'ia-local', {}),
    ]);
    const r = await llamar(enrutador);
    expect(r.resultado.ok).toBe(false);
  });

  it('reports cuota when any adapter hit the quota and none answered', async () => {
    const { enrutador } = montar([
      adaptadorFalso('gemini', 'ia-nube', { generarPractica: { generar: async () => err({ tipo: 'cuota', detalle: '429' }) } }),
      adaptadorFalso('ollama', 'ia-local', { generarPractica: { generar: async () => err({ tipo: 'sin_red', detalle: 'x' }) } }),
    ]);
    expect((await llamar(enrutador)).resultado).toEqual({ ok: false, error: expect.objectContaining({ tipo: 'cuota' }) });
  });
});
