/** Shared plumbing of the HTTP adapters: error mapping, structured output chain and prompts. */
import { z } from 'zod';
import type { BorradorPractica, SolicitudPractica } from '../esquemas.ts';
import type { FalloIA } from '../puertos.ts';
import { ErrorHttp, conReintentos, type OpcionesReintento } from '../reintentos.ts';
import { err, ok, type Result } from '../result.ts';

export function mapearError(e: unknown): FalloIA {
  if (e instanceof ErrorHttp) {
    if (e.status === 429) return { tipo: 'cuota', detalle: 'El proveedor devolvió 429 (límite o cuota).' };
    if (e.status === 408) return { tipo: 'timeout', detalle: 'El proveedor tardó demasiado.' };
    return { tipo: 'proveedor', detalle: `El proveedor devolvió HTTP ${e.status}.` };
  }
  if (e instanceof Error && e.name === 'AbortError') return { tipo: 'timeout', detalle: 'La llamada fue cancelada por tiempo.' };
  return { tipo: 'sin_red', detalle: 'No se pudo conectar con el proveedor.' };
}

export interface UsoTokens {
  tokensEntrada?: number;
  tokensSalida?: number;
  tokensCache?: number;
}

/** Removes ```json fences some models add even in JSON mode. */
export function quitarCercas(texto: string): string {
  return texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

export function esquemaJsonDe(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _omitido, ...resto } = z.toJSONSchema(schema, { io: 'input' }) as Record<string, unknown>;
  return resto;
}

function resumenZod(e: z.ZodError): string {
  return e.issues
    .slice(0, 5)
    .map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
    .join('; ');
}

/**
 * Validation chain for any LLM output (4.4): parse JSON -> Zod.safeParse -> (on failure) one retry with the
 * error -> `esquema` failure. Network retries (429/5xx) happen around `llamar`.
 */
export async function salidaEstructurada<T>(o: {
  llamar(correccion: string | undefined): Promise<{ texto: string; uso: UsoTokens }>;
  schema: z.ZodType<T>;
  alUsar(uso: UsoTokens): void;
  reintentos?: OpcionesReintento;
}): Promise<Result<T, FalloIA>> {
  let correccion: string | undefined;
  for (let intento = 0; intento < 2; intento++) {
    let respuesta: { texto: string; uso: UsoTokens };
    try {
      respuesta = await conReintentos(() => o.llamar(correccion), o.reintentos);
    } catch (e) {
      return err(mapearError(e));
    }
    o.alUsar(respuesta.uso);
    let motivo: string;
    try {
      const parsed = o.schema.safeParse(JSON.parse(quitarCercas(respuesta.texto)));
      if (parsed.success) return ok(parsed.data);
      motivo = resumenZod(parsed.error);
    } catch {
      motivo = 'no es JSON válido';
    }
    correccion = `La salida anterior no cumple el esquema (${motivo}). Devuelve solo JSON válido que cumpla el esquema.`;
  }
  return err({ tipo: 'esquema', detalle: 'La salida del modelo no cumplió el esquema tras un reintento.' });
}

export const INSTRUCCIONES_CREADOR = [
  'Eres un asistente que ayuda a docentes de ciencia y tecnología del Perú a preparar prácticas de laboratorio con materiales caseros y seguros.',
  'Responde SOLO con un objeto JSON que cumpla el esquema indicado, sin texto adicional.',
  'La cita del desempeño CNEB debe copiarse EXACTA, letra por letra, del texto que se te da.',
  'Las pistas van de lo general a lo concreto y NUNCA contienen el resultado numérico ni la conclusión esperada.',
  'El quiz nunca repite la opción correcta en el enunciado ni incluye el resultado.',
  'No hables de emociones ni del estado de ánimo de los estudiantes. No incluyas nombres, teléfonos ni correos.',
  'Nada de fuego abierto, ácidos ni electricidad de la red. Oraciones cortas, en castellano claro para el grado.',
  'Incluye siempre las limitaciones del modelo físico y el resultado esperado (solo para la docente).',
].join('\n');

export function contenidoGeneracion(s: SolicitudPractica): string {
  const d = s.desempeno;
  const pedidos =
    Object.entries(s.recursos)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(', ') || 'ninguno';
  return [
    `Cita EXACTA del desempeño CNEB (no la cambies): "${d.cita}"`,
    `Nivel ${d.nivel}, grado ${d.grado}, competencia ${d.competencia}, desempeño ${d.desempeno}. Lengua: ${s.lengua}.`,
    s.tema ? `Tema sugerido por la docente: ${s.tema}` : 'Tema: a elección, con materiales caseros.',
    `Recursos pedidos: ${pedidos}.`,
    ...(s.correcciones?.length ? ['Corrige estos problemas de la versión anterior:', ...s.correcciones.map((c) => `- ${c}`)] : []),
  ].join('\n');
}

export const INSTRUCCIONES_REVISOR = [
  'Eres un segundo revisor pedagógico de una práctica de laboratorio escolar. Responde SOLO con JSON.',
  'Marca "observado" y explica en observaciones breves si: una pista revela el resultado o la conclusión, el quiz delata la respuesta,',
  'hay un riesgo de seguridad, el texto es confuso para el grado o falta honestidad sobre las limitaciones. Si todo está bien, "ok".',
].join(' ');

export function contenidoRevision(b: BorradorPractica): string {
  return JSON.stringify(b);
}
