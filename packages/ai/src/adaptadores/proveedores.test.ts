import { describe, expect, it } from 'vitest';
import { SolicitudPractica } from '../esquemas.ts';
import { borradorValido, refDesempeno } from '../pruebas-util.ts';
import { ErrorHttp } from '../reintentos.ts';
import type { UsoLlamada } from '../puertos.ts';
import { crearAdaptadorGemini, esquemaJsonDe, type ClienteGemini } from './gemini.ts';
import { crearAdaptadorMeta } from './meta.ts';
import { crearAdaptadorOpenAICompat } from './openai-compat.ts';
import { crearAdaptadorWebLLM, detectarWebLLM } from './webllm.ts';

const solicitud = SolicitudPractica.parse({ desempeno: refDesempeno });
const usos: UsoLlamada[] = [];
const ctx = { colegioId: 'colA', registrarUso: (u: UsoLlamada) => void usos.push(u) };
const sinEspera = async () => {};

describe('Gemini adapter', () => {
  const respuesta = (texto: string) => ({ texto, uso: { tokensEntrada: 1000, tokensSalida: 500 } });

  it('asks for JSON-schema output built from the Zod schema', async () => {
    let pedido: Parameters<ClienteGemini['generar']>[0] | undefined;
    const cliente: ClienteGemini = { generar: async (p) => ((pedido = p), respuesta(JSON.stringify(borradorValido()))) };
    const a = crearAdaptadorGemini({ cliente, modelo: 'gemini-2.5-flash', dormir: sinEspera });
    const r = await a.capacidades.generarPractica!.generar(solicitud, ctx);
    expect(r.ok).toBe(true);
    expect(pedido?.esquemaJson).toMatchObject({ type: 'object' });
    expect(Object.keys((pedido?.esquemaJson as { properties: object }).properties)).toContain('citaDesempeno');
    expect(pedido?.esquemaJson).not.toHaveProperty('$schema');
    expect(pedido?.instrucciones).toMatch(/JSON/);
    expect(JSON.stringify(pedido?.contenido)).toContain(refDesempeno.cita);
    expect(usos.at(-1)).toMatchObject({ proposito: 'generarPractica', tokensEntrada: 1000, tokensSalida: 500 });
    expect(usos.at(-1)!.costoUsd).toBeGreaterThan(0);
  });

  it('retries once with the validation error when the output does not match the schema', async () => {
    const pedidos: string[] = [];
    const cliente: ClienteGemini = {
      generar: async (p) => {
        pedidos.push(JSON.stringify(p.contenido));
        return respuesta(pedidos.length === 1 ? '{"titulo": 1}' : JSON.stringify(borradorValido()));
      },
    };
    const a = crearAdaptadorGemini({ cliente, modelo: 'm', dormir: sinEspera });
    const r = await a.capacidades.generarPractica!.generar(solicitud, ctx);
    expect(r.ok).toBe(true);
    expect(pedidos).toHaveLength(2);
    expect(pedidos[1]).toMatch(/no cumple el esquema/i);
  });

  it('returns an esquema failure when the retry is also invalid', async () => {
    const cliente: ClienteGemini = { generar: async () => respuesta('no es json') };
    const r = await crearAdaptadorGemini({ cliente, modelo: 'm', dormir: sinEspera }).capacidades.generarPractica!.generar(solicitud, ctx);
    expect(r).toEqual({ ok: false, error: expect.objectContaining({ tipo: 'esquema' }) });
  });

  it('retries 503 twice then maps 429 to cuota and network errors to sin_red', async () => {
    let n = 0;
    const cliente503: ClienteGemini = { generar: async () => { n++; if (n < 3) throw new ErrorHttp(503, 'x'); return respuesta(JSON.stringify(borradorValido())); } };
    expect((await crearAdaptadorGemini({ cliente: cliente503, modelo: 'm', dormir: sinEspera }).capacidades.generarPractica!.generar(solicitud, ctx)).ok).toBe(true);

    const c429: ClienteGemini = { generar: async () => { throw new ErrorHttp(429, 'quota'); } };
    expect(await crearAdaptadorGemini({ cliente: c429, modelo: 'm', dormir: sinEspera }).capacidades.generarPractica!.generar(solicitud, ctx)).toEqual({ ok: false, error: expect.objectContaining({ tipo: 'cuota' }) });

    const cRed: ClienteGemini = { generar: async () => { throw new TypeError('fetch failed'); } };
    expect(await crearAdaptadorGemini({ cliente: cRed, modelo: 'm', dormir: sinEspera }).capacidades.generarPractica!.generar(solicitud, ctx)).toEqual({ ok: false, error: expect.objectContaining({ tipo: 'sin_red' }) });
  });

  it('reads a table photo as rows and translates into an unreviewed draft', async () => {
    const cliente: ClienteGemini = {
      generar: async (p) => respuesta(p.proposito === 'visionTabla' ? '{"filas":[{"etiqueta":"0,3 m","valor":1.1,"unidad":"s"}]}' : '{"texto":"Imamantaq"}'),
    };
    const a = crearAdaptadorGemini({ cliente, modelo: 'm', dormir: sinEspera });
    const filas = await a.capacidades.visionTabla!.leer(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), ctx);
    expect(filas).toEqual({ ok: true, valor: [{ etiqueta: '0,3 m', valor: 1.1, unidad: 's' }] });
    const t = await a.capacidades.traducir!.traducir('¿Cómo?', 'quy', ctx);
    expect(t).toEqual({ ok: true, valor: { texto: 'Imamantaq', lengua: 'quy', revisado: false } });
  });

  it('builds a JSON schema from a Zod schema', () => {
    expect(esquemaJsonDe(SolicitudPractica)).toMatchObject({ type: 'object' });
  });
});

function respuestaJson(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });
}
const textoMeta = (obj: unknown) => ({
  output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(obj) }] }],
  usage: { input_tokens: 2000, output_tokens: 300, input_tokens_details: { cached_tokens: 500 } },
});

describe('Meta Muse adapter', () => {
  it('calls /v1/responses with a json_schema format as second reviewer', async () => {
    const llamadas: Array<{ url: string; init: RequestInit }> = [];
    const fetchFalso = (async (url: string, init: RequestInit) => {
      llamadas.push({ url, init });
      return respuestaJson(textoMeta({ veredicto: 'observado', observaciones: ['Pista 2 vaga'] }));
    }) as unknown as typeof fetch;
    const a = crearAdaptadorMeta({ apiKey: 'sk-meta-secreto', fetch: fetchFalso, dormir: sinEspera });
    const r = await a.capacidades.revisarPractica!.revisar(borradorValido(), ctx);
    expect(r).toEqual({ ok: true, valor: { veredicto: 'observado', observaciones: ['Pista 2 vaga'], modelo: 'muse-spark-1.3' } });
    expect(llamadas[0]!.url).toBe('https://api.meta.ai/v1/responses');
    const cuerpo = JSON.parse(llamadas[0]!.init.body as string);
    expect(cuerpo.model).toBe('muse-spark-1.3');
    expect(cuerpo.text.format).toMatchObject({ type: 'json_schema', strict: false });
    expect((llamadas[0]!.init.headers as Record<string, string>).Authorization).toBe('Bearer sk-meta-secreto');
    expect(usos.at(-1)).toMatchObject({ endpoint: '/responses', tokensEntrada: 2000, tokensSalida: 300, tokensCache: 500 });
  });

  it('retries 429 and 5xx twice (1 s, 2 s) and maps a persistent 429 to cuota', async () => {
    const esperas: number[] = [];
    let n = 0;
    const fetch429 = (async () => (n++, respuestaJson({ error: { message: 'slow' } }, 429))) as unknown as typeof fetch;
    const a = crearAdaptadorMeta({ apiKey: 'k', fetch: fetch429, dormir: async (ms) => void esperas.push(ms) });
    const r = await a.capacidades.revisarPractica!.revisar(borradorValido(), ctx);
    expect(n).toBe(3);
    expect(esperas).toEqual([1000, 2000]);
    expect(r).toEqual({ ok: false, error: expect.objectContaining({ tipo: 'cuota' }) });
  });

  it('never leaks the key in failure details', async () => {
    const f = (async () => respuestaJson({ error: { message: 'bad key sk-meta-secreto' } }, 401)) as unknown as typeof fetch;
    const a = crearAdaptadorMeta({ apiKey: 'sk-meta-secreto', fetch: f, dormir: sinEspera });
    const r = await a.capacidades.revisarPractica!.revisar(borradorValido(), ctx);
    expect(JSON.stringify(r)).not.toContain('sk-meta-secreto');
    expect(r).toEqual({ ok: false, error: expect.objectContaining({ tipo: 'proveedor' }) });
  });

  it('generates a pictogram with /images/generations at US$ 0.01', async () => {
    const llamadas: Array<{ url: string; body: Record<string, unknown> }> = [];
    const f = (async (url: string, init: RequestInit) => {
      llamadas.push({ url, body: JSON.parse(init.body as string) });
      return respuestaJson({ data: [{ b64_json: btoa('PNGDATA') }] });
    }) as unknown as typeof fetch;
    const a = crearAdaptadorMeta({ apiKey: 'k', fetch: f, dormir: sinEspera });
    const r = await a.capacidades.pictogramas!.generar({ id: 'cuerda', descripcion: 'Una cuerda atada a una tuerca' }, ctx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valor.type).toBe('image/png');
      expect(await r.valor.text()).toBe('PNGDATA');
    }
    expect(llamadas[0]!.url).toBe('https://api.meta.ai/v1/images/generations');
    expect(llamadas[0]!.body).toMatchObject({ model: 'muse-image-1.0', n: 1, response_format: 'b64_json' });
    expect(String(llamadas[0]!.body.prompt)).toMatch(/sin texto/i);
    expect(usos.at(-1)).toMatchObject({ endpoint: '/images/generations', imagenes: 1, costoUsd: 0.01 });
  });

  it('rejects a malformed review as esquema', async () => {
    const f = (async () => respuestaJson(textoMeta({ cualquier: 'cosa' }))) as unknown as typeof fetch;
    const a = crearAdaptadorMeta({ apiKey: 'k', fetch: f, dormir: sinEspera });
    expect(await a.capacidades.revisarPractica!.revisar(borradorValido(), ctx)).toEqual({ ok: false, error: expect.objectContaining({ tipo: 'esquema' }) });
  });
});

describe('OpenAI-compatible adapter (Ollama)', () => {
  it('uses chat completions with a json_schema response format and is a local source', async () => {
    let cuerpo: Record<string, unknown> = {};
    let url = '';
    const f = (async (u: string, init: RequestInit) => {
      url = u;
      cuerpo = JSON.parse(init.body as string);
      return respuestaJson({ choices: [{ message: { content: JSON.stringify(borradorValido()) } }], usage: { prompt_tokens: 10, completion_tokens: 20 } });
    }) as unknown as typeof fetch;
    const a = crearAdaptadorOpenAICompat({ baseUrl: 'http://localhost:11434/v1', modelo: 'llama3.2:3b', fetch: f, dormir: sinEspera });
    expect(a.fuente).toBe('ia-local');
    const r = await a.capacidades.generarPractica!.generar(solicitud, ctx);
    expect(r.ok).toBe(true);
    expect(url).toBe('http://localhost:11434/v1/chat/completions');
    expect(cuerpo).toMatchObject({ model: 'llama3.2:3b', response_format: { type: 'json_schema' } });
    expect(usos.at(-1)!.costoUsd).toBe(0);
  });

  it('maps connection errors to sin_red', async () => {
    const f = (async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch;
    const a = crearAdaptadorOpenAICompat({ baseUrl: 'http://x/v1', modelo: 'm', fetch: f, dormir: sinEspera });
    expect(await a.capacidades.generarPractica!.generar(solicitud, ctx)).toEqual({ ok: false, error: expect.objectContaining({ tipo: 'sin_red' }) });
  });
});

describe('WebLLM detection', () => {
  it('needs WebGPU and at least 6 GB of RAM, and does not guess', () => {
    expect(detectarWebLLM({ tieneWebGPU: true, memoriaGb: 8 })).toEqual({ apto: true, motivo: 'ok' });
    expect(detectarWebLLM({ tieneWebGPU: false, memoriaGb: 8 }).motivo).toBe('sin_webgpu');
    expect(detectarWebLLM({ tieneWebGPU: true, memoriaGb: 4 }).motivo).toBe('memoria_insuficiente');
    expect(detectarWebLLM({ tieneWebGPU: true }).motivo).toBe('memoria_desconocida');
    expect(crearAdaptadorWebLLM({ tieneWebGPU: true, memoriaGb: 8 }).disponible()).toBe(true);
    expect(crearAdaptadorWebLLM({ tieneWebGPU: false }).disponible()).toBe(false);
  });
});
