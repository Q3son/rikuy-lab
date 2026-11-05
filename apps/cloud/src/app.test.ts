import { ejemplos } from '@rikuy/contracts/fixtures';
import { aprobarPropuesta, ejecutarCadena, exportarClavePublica, firmarPaquete, generarParClaves, paquetePractica, SolicitudPractica, type PropuestaCreador } from '@rikuy/ai';
import { describe, expect, it } from 'vitest';
import { crearApp } from './app.ts';
import { crearDepsSimuladas, type DepsNube } from './deps.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Response {
    json(): Promise<any>;
  }
}

const CITA = 'Formula preguntas acerca de las variables que influyen en un hecho';
const desempeno = { nivel: 'secundaria', grado: 2, area: 'ciencia-y-tecnologia', competencia: 1, desempeno: 1, cita: CITA };
const H = { 'content-type': 'application/json', 'x-rikuy-colegio': 'colegio-demo' };

function montar(parcial: Partial<DepsNube> = {}) {
  const deps = crearDepsSimuladas(parcial);
  return { deps, app: crearApp(deps) };
}
const post = (app: ReturnType<typeof crearApp>, ruta: string, cuerpo: unknown, headers: Record<string, string> = H) =>
  app.request(ruta, { method: 'POST', headers, body: JSON.stringify(cuerpo) });

describe('/ia in mock mode (no keys)', () => {
  it('reports the mode and the adapters', async () => {
    const { app } = montar();
    const r = await app.request('/ia/estado', { headers: H });
    const j = await r.json();
    expect(j.modo).toBe('simulado');
    expect(j.adaptadores.every((a: { simulado: boolean }) => a.simulado)).toBe(true);
    expect(j.restanteUsd).toBeGreaterThan(0);
  });

  it('lists the performances available to the picker', async () => {
    const { app } = montar();
    const j = await (await app.request('/ia/desempenos', { headers: H })).json();
    expect(j.desempenos[0]).toMatchObject({ ref: { grado: 2, competencia: 1 } });
  });

  it('requires a valid school id', async () => {
    const { app } = montar();
    expect((await post(app, '/ia/generar-practica', { solicitud: { desempeno } }, { 'content-type': 'application/json' })).status).toBe(400);
    expect((await post(app, '/ia/generar-practica', { solicitud: { desempeno } }, { ...H, 'x-rikuy-colegio': 'a b' })).status).toBe(400);
  });

  it('runs the Creador chain and returns a verified proposal', async () => {
    const { app } = montar();
    const r = await post(app, '/ia/generar-practica', { solicitud: { desempeno } });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.estado).toBe('propuesta');
    expect(j.propuesta.verificacion.ok).toBe(true);
    expect(j.propuesta.practica.estado).toBe('borrador');
    expect(j.propuesta.fuentes.generador.simulado).toBe(true);
  });

  it('rejects an invalid request body with 400', async () => {
    const { app } = montar();
    expect((await post(app, '/ia/generar-practica', { solicitud: { desempeno: { ...desempeno, cita: 'corta' } } })).status).toBe(400);
    expect((await app.request('/ia/generar-practica', { method: 'POST', headers: H, body: '{no es json' })).status).toBe(400);
  });

  it('rejects a request whose quote was altered by one letter', async () => {
    const { app } = montar();
    const r = await post(app, '/ia/generar-practica', { solicitud: { desempeno: { ...desempeno, cita: CITA.replace('influyen', 'influyan') } } });
    expect(r.status).toBe(422);
    expect((await r.json()).hallazgos.map((h: { regla: string }) => h.regla)).toContain('cita_literal');
  });

  it('returns cuota and falls back to the catalog when the budget is exhausted', async () => {
    const { app, deps } = montar({ topeMensualUsd: 0.001 });
    deps.registro.agregar({ ts: new Date().toISOString(), colegioId: 'colegio-demo', adaptador: 'gemini', modelo: 'm', endpoint: '/e', proposito: 'p', costoUsd: 1, latenciaMs: 1, estado: 'ok' });
    const r = await post(app, '/ia/generar-practica', { solicitud: { desempeno } });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.estado).toBe('catalogo');
    expect(j.fallo.tipo).toBe('cuota');
    expect(j.catalogo.length).toBeGreaterThan(0);
    expect(j.catalogo[0].estado).toBe('aprobada');
  });

  it('logs metadata only, never the content', async () => {
    const { app, deps } = montar();
    await post(app, '/ia/generar-practica', { solicitud: { desempeno, tema: 'péndulo con la tuerca de mi abuelo' } });
    const uso = JSON.stringify(deps.registro.entradas());
    expect(uso).toContain('colegio-demo');
    expect(uso).not.toMatch(/péndulo|abuelo|tuerca|Formula/);
    const j = await (await app.request('/ia/uso', { headers: H })).json();
    expect(JSON.stringify(j)).not.toMatch(/abuelo|Formula/);
    expect(j.entradas.length).toBeGreaterThan(0);
  });

  it('limits requests per IP', async () => {
    const { app } = montar({ limites: { ia: { max: 3, ventanaMs: 60_000 }, escritura: { max: 100, ventanaMs: 60_000 }, envio: { max: 100, ventanaMs: 60_000 } }, confiarProxy: true });
    const con = (ip: string) => ({ ...H, 'x-forwarded-for': ip });
    for (let i = 0; i < 3; i++) expect((await app.request('/ia/estado', { headers: con('1.1.1.1') })).status).toBe(200);
    const bloqueada = await app.request('/ia/estado', { headers: con('1.1.1.1') });
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.headers.get('retry-after')).toBeTruthy();
    expect((await app.request('/ia/estado', { headers: con('2.2.2.2') })).status).toBe(200);
  });

  it('re-verifies edits: approval fails closed when a hint leaks the result', async () => {
    const { app } = montar();
    const gen = await (await post(app, '/ia/generar-practica', { solicitud: { desempeno } })).json();
    const editada = structuredClone(gen.propuesta);
    editada.practica.pistas[2] = 'Debe salir 1,9 s con la cuerda de 0,9 m.';
    const r = await post(app, '/ia/aprobar-practica', { propuesta: editada, docente: 'docente-1' });
    expect(r.status).toBe(422);
    expect((await r.json()).hallazgos.map((h: { regla: string }) => h.regla)).toContain('pista_revela');
    const ok = await post(app, '/ia/aprobar-practica', { propuesta: gen.propuesta, docente: 'docente-1' });
    expect(ok.status).toBe(200);
    expect((await ok.json()).practica.estado).toBe('aprobada');
  });

  it('generates a pictogram in mock mode', async () => {
    const { app } = montar();
    const j = await (await post(app, '/ia/pictogramas', { id: 'cuerda', descripcion: 'Una cuerda atada a una tuerca' })).json();
    expect(j.imagen.base64.length).toBeGreaterThan(10);
    expect(j.simulado).toBe(true);
  });

  it('translates into an unreviewed draft', async () => {
    const { app } = montar();
    const j = await (await post(app, '/ia/traducir', { texto: '¿Cómo?', lengua: 'quy' })).json();
    expect(j.traduccion).toMatchObject({ lengua: 'quy', revisado: false });
  });
});

async function propuestaAprobada(deps: DepsNube) {
  const s = await ejecutarCadena(deps.creador, { colegioId: 'colegio-demo' }, SolicitudPractica.parse({ desempeno }));
  if (s.estado !== 'propuesta') throw new Error('expected proposal');
  const a = await aprobarPropuesta(deps.creador, s.propuesta as PropuestaCreador, { docente: 'docente-1' });
  if (!a.ok) throw new Error('expected approval');
  return a.valor.practica;
}

describe('/paquetes', () => {
  it('registers a signed, approved practice and serves it back', async () => {
    const { app, deps } = montar();
    const practica = await propuestaAprobada(deps);
    const { privada, publica } = await generarParClaves();
    const paquete = await firmarPaquete(paquetePractica(practica, 'DOCENTE001'), privada);
    const clavePublica = await exportarClavePublica(publica);
    const r = await post(app, '/paquetes', { paquete, clavePublica });
    expect(r.status).toBe(201);
    expect((await post(app, '/paquetes', { paquete, clavePublica })).status).toBe(200); // idempotent
    const lista = await (await app.request('/paquetes')).json();
    expect(lista.paquetes[0]).toMatchObject({ id: practica.id, titulo: practica.titulo });
    const uno = await (await app.request(`/paquetes/${practica.id}`)).json();
    expect(uno.paquete.firma).toBe(paquete.firma);
  });

  it('rejects an unsigned, tampered or foreign-signed package', async () => {
    const { app, deps } = montar();
    const practica = await propuestaAprobada(deps);
    const { privada, publica } = await generarParClaves();
    const clavePublica = await exportarClavePublica(publica);
    const firmado = await firmarPaquete(paquetePractica(practica, 'DOCENTE001'), privada);
    const sinFirma = { ...firmado, firma: undefined };
    expect((await post(app, '/paquetes', { paquete: sinFirma, clavePublica })).status).toBe(422);
    const alterado = structuredClone(firmado);
    (alterado.cuerpo as { titulo: string }).titulo = 'Otro';
    expect((await post(app, '/paquetes', { paquete: alterado, clavePublica })).status).toBe(403);
    const otra = await generarParClaves();
    expect((await post(app, '/paquetes', { paquete: firmado, clavePublica: await exportarClavePublica(otra.publica) })).status).toBe(403);
  });

  it('rejects a practice that is still a draft or whose quote is not literal', async () => {
    const { app, deps } = montar();
    const practica = await propuestaAprobada(deps);
    const { privada, publica } = await generarParClaves();
    const clavePublica = await exportarClavePublica(publica);
    const borrador = await firmarPaquete(paquetePractica({ ...practica, estado: 'borrador' }, 'DOCENTE001'), privada);
    expect((await post(app, '/paquetes', { paquete: borrador, clavePublica })).status).toBe(422);
    const mala = { ...practica, desempeno: { ...practica.desempeno, cita: CITA.replace('Formula', 'Formulo') } };
    const firmadoMala = await firmarPaquete(paquetePractica(mala, 'DOCENTE001'), privada);
    const r = await post(app, '/paquetes', { paquete: firmadoMala, clavePublica });
    expect(r.status).toBe(422);
    expect((await r.json()).hallazgos.map((h: { regla: string }) => h.regla)).toContain('cita_literal');
  });

  it('answers 404 for an unknown practice', async () => {
    const { app } = montar();
    expect((await app.request('/paquetes/01JC0000000000000000000ZZZ')).status).toBe(404);
    expect(ejemplos.practica.id).toBeTruthy();
  });
});

describe('/agregados', () => {
  const cuerpo = { envioActivado: true, colegioId: 'colegio-demo', semana: '2026-W45', celdas: [{ competencia: 1, nivel: '2', grupos: 7 }, { competencia: 1, nivel: '3', grupos: 3 }] };

  it('stores only cells with 5 or more groups and reports the suppressed ones', async () => {
    const { app } = montar({ ugelToken: 'secreto-ugel' });
    const r = await post(app, '/agregados', cuerpo);
    expect(r.status).toBe(202);
    expect(await r.json()).toMatchObject({ aceptadas: 1, suprimidas: 1 });
    const lectura = await app.request('/agregados/ugel?semana=2026-W45', { headers: { 'x-rikuy-ugel-token': 'secreto-ugel' } });
    const j = await lectura.json();
    expect(j.colegios).toEqual([{ colegioId: 'colegio-demo', celdas: [{ competencia: 1, nivel: '2', grupos: 7 }] }]);
  });

  it('requires the teacher to have turned sending on and rejects free text or extra fields', async () => {
    const { app } = montar();
    expect((await post(app, '/agregados', { ...cuerpo, envioActivado: false })).status).toBe(400);
    expect((await post(app, '/agregados', { ...cuerpo, comentario: 'Juan no entiende' })).status).toBe(400);
    expect((await post(app, '/agregados', { ...cuerpo, celdas: [{ competencia: 1, nivel: '2', grupos: 7, alumno: 'E07' }] })).status).toBe(400);
  });

  it('protects the UGEL read with a token', async () => {
    const { app } = montar({ ugelToken: 'secreto-ugel' });
    expect((await app.request('/agregados/ugel?semana=2026-W45')).status).toBe(401);
    expect((await app.request('/agregados/ugel?semana=2026-W45', { headers: { 'x-rikuy-ugel-token': 'otro' } })).status).toBe(401);
    const { app: sinToken } = montar();
    expect((await sinToken.request('/agregados/ugel?semana=2026-W45', { headers: { 'x-rikuy-ugel-token': 'x' } })).status).toBe(503);
  });
});
