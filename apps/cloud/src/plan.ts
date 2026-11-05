/**
 * /ia/plan/*: the teacher uploads her own plan (PDF or photos). The files live only in memory for the request:
 * they are validated (MIME whitelist + magic bytes + limits), sent as inline parts to the reader and dropped.
 * The usage log keeps metadata only (4.5).
 */
import { LIMITES_PLAN, PlanExtraido, PRACTICAS_SUGERIBLES, leerPlan, mapearPlan, proponerMejoras, validarArchivosPlan, type DepsPlan } from '@rikuy/ai';
import type { Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

/** Multipart overhead on top of the file limit. */
export const LIMITE_CUERPO_PLAN = LIMITES_PLAN.maxBytesTotal + 512 * 1024;

const ESTADO_FALLO: Record<string, 400 | 413 | 415> = {
  sin_archivos: 400,
  demasiados: 400,
  mezcla: 400,
  demasiado_grande: 413,
  tipo_no_permitido: 415,
  contenido_no_coincide: 415,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rutasPlan(app: Hono<any>, deps: { plan: DepsPlan }): void {
  app.post(
    '/ia/plan/extraer',
    bodyLimit({ maxSize: LIMITE_CUERPO_PLAN, onError: (c) => c.json({ error: 'demasiado_grande', detalle: 'El envío supera el tamaño permitido.' }, 413) }),
    async (c: Context) => {
      if (!(c.req.header('content-type') ?? '').startsWith('multipart/form-data')) {
        return c.json({ error: 'solicitud_invalida', detalle: 'Envía multipart/form-data con el campo "archivos".' }, 400);
      }
      const form = await c.req.formData().catch(() => undefined);
      if (!form) return c.json({ error: 'solicitud_invalida', detalle: 'No se pudo leer el formulario.' }, 400);
      const archivos = await Promise.all(
        form
          .getAll('archivos')
          .filter((x): x is File => typeof x !== 'string')
          .map(async (f) => ({ mime: f.type, bytes: new Uint8Array(await f.arrayBuffer()) })),
      );
      const v = validarArchivosPlan(archivos);
      if (!v.ok) return c.json({ error: v.error.codigo, detalle: v.error.detalle }, ESTADO_FALLO[v.error.codigo] ?? 400);
      const s = await leerPlan(deps.plan, { colegioId: c.get('colegioId') }, v.valor);
      if (s.estado === 'fallo') return c.json({ fallo: s.fallo }, s.fallo.tipo === 'cuota' ? 429 : 502);
      return c.json(s.lectura);
    },
  );

  // Suggestions are deterministic (no AI cost): the (possibly edited) plan is mapped again and analysed.
  app.post('/ia/plan/mejorar', async (c: Context) => {
    const p = z.object({ plan: PlanExtraido }).safeParse(await c.req.json().catch(() => undefined));
    if (!p.success) return c.json({ error: 'solicitud_invalida' }, 400);
    const mapeado = mapearPlan(p.data.plan, deps.plan.curriculo);
    return c.json({ mejoras: proponerMejoras(mapeado, deps.plan.curriculo, PRACTICAS_SUGERIBLES) });
  });
}
