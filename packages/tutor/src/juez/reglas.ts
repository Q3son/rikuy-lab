/**
 * Rule judge for inquiry (the floor of the AI layer: it always works, offline, on the device).
 *
 * Inquiry rubric (variable, prediction, justification, use of the data, coherent conclusion) with a
 * fixed contract: level 0-3 + literal quote + "NO" (not assessable, never a zero).
 * "El juez orienta, la docente confirma": every verdict can be corrected (evidencia.confirmada).
 */
import type { Indicador } from '@rikuy/contracts';
import { analizarRazonamiento, type AnalisisRazonamiento } from '../indicios.ts';
import { extraerNumeros, tieneAlguna, tokenizar } from '../texto.ts';
import { fragmento } from './cita.ts';
import { conclusionCoherente } from './conclusion.ts';
import { condicionesQueRespaldan, lexicoDeContexto, noEvaluable, PALABRAS_VACIAS, veredicto, veredictoNoObservable } from './comun.ts';
import type { ContextoJuez, DatoMedido, SolicitudJuez, VeredictoJuez } from './tipos.ts';

const CONTROL = ['solo', 'una sola', 'unica', 'mismo', 'misma', 'igual', 'fija', 'fijo', 'constante', 'dejo', 'dejamos', 'dejar', 'queda', 'quedan', 'mantengo', 'mantenemos'];
const CONDICIONAL = ['si', 'cuando', 'mientras', 'al'];
const VAGO_DATO = ['medimos', 'medi', 'mido', 'midio', 'mi dato', 'mis datos', 'nuestros datos', 'nuestro dato', 'resultado', 'resultados', 'salio', 'tabla', 'cronometro', 'medicion', 'mediciones', 'segun'];

function analisis(s: Pick<SolicitudJuez, 'respuesta' | 'contexto'>): AnalisisRazonamiento {
  return analizarRazonamiento(s.respuesta, { lexicoExtra: lexicoDeContexto(s.contexto) });
}

function citaDe(a: AnalisisRazonamiento, clave: 'variable' | 'prediccion' | 'justificacion', respuesta: string): string {
  const span = a.spans[clave][0];
  return span ? fragmento(respuesta, span) : respuesta.trim();
}

function juzgarVariable(s: SolicitudJuez): VeredictoJuez {
  const a = analisis(s);
  if (!a.variable) return veredicto('variable', 0, s.respuesta.trim());
  const propias = new Set(s.contexto.variables.map((v) => v.id));
  const cita = citaDe(a, 'variable', s.respuesta);
  if (!a.variables.some((v) => propias.has(v))) return veredicto('variable', 1, cita);
  const t = tokenizar(s.respuesta);
  const controla = tieneAlguna(t, CONTROL) || extraerNumeros(s.respuesta).length > 0;
  return veredicto('variable', controla ? 3 : 2, cita);
}

function juzgarPrediccion(s: SolicitudJuez): VeredictoJuez {
  const a = analisis(s);
  if (!a.prediccion) return veredicto('prediccion', 0, s.respuesta.trim());
  const direccion = a.cues.some((c) => c.clase === 'comparativo' || c.clase === 'resultado' || (c.clase === 'efecto' && c.negado));
  const cue = a.cues.find((c) => (direccion ? c.clase !== 'va_a' && c.clase !== 'efecto' : true)) ?? a.cues[0]!;
  const cita = fragmento(s.respuesta, cue.span);
  if (!direccion) return veredicto('prediccion', 1, cita);
  const propias = new Set(s.contexto.variables.map((v) => v.id));
  const nombraVariable = a.variables.some((v) => propias.has(v));
  const t = tokenizar(s.respuesta);
  const condicion = tieneAlguna(t, CONDICIONAL) || extraerNumeros(s.respuesta).length > 0;
  return veredicto('prediccion', nombraVariable && condicion ? 3 : 2, cita);
}

function juzgarJustificacion(s: SolicitudJuez): VeredictoJuez {
  const a = analisis(s);
  if (!a.justificacion) return veredicto('justificacion', 0, s.respuesta.trim());
  const span = a.spans.justificacion[0]!;
  const cita = fragmento(s.respuesta, span);
  const t = tokenizar(s.respuesta);
  const despues = t.filter((x) => x.ini >= span.fin).map((x) => x.t);
  const contenido = despues.filter((p) => !PALABRAS_VACIAS.has(p));
  const conceptos = new Set((s.contexto.conceptos ?? []).flatMap((c) => tokenizar(c).map((x) => x.t)));
  if (contenido.length < 2) return veredicto('justificacion', 1, cita);
  return veredicto('justificacion', contenido.some((p) => conceptos.has(p)) ? 3 : 2, cita);
}

function juzgarUsoDelDato(s: SolicitudJuez): VeredictoJuez {
  if (s.datos.length === 0) return veredictoNoObservable('uso_del_dato');
  const condiciones = new Set<number>();
  for (const n of extraerNumeros(s.respuesta)) for (const x of condicionesQueRespaldan(n, s.datos)) condiciones.add(x);
  const t = tokenizar(s.respuesta);
  if (condiciones.size >= 2) return veredicto('uso_del_dato', 3, s.respuesta.trim());
  if (condiciones.size === 1) return veredicto('uso_del_dato', 2, s.respuesta.trim());
  if (tieneAlguna(t, VAGO_DATO)) return veredicto('uso_del_dato', 1, s.respuesta.trim());
  return veredicto('uso_del_dato', 0, s.respuesta.trim());
}

/** Judge ONE indicator with the rules. */
export function juzgarConReglas(s: SolicitudJuez): VeredictoJuez {
  if (noEvaluable(s.respuesta)) return veredictoNoObservable(s.indicador);
  switch (s.indicador) {
    case 'variable':
      return juzgarVariable(s);
    case 'prediccion':
      return juzgarPrediccion(s);
    case 'justificacion':
      return juzgarJustificacion(s);
    case 'uso_del_dato':
      return juzgarUsoDelDato(s);
    case 'conclusion_coherente':
      return conclusionCoherente(s.respuesta, s.contexto, s.datos);
  }
}

/** Which indicators can be read from each moment of the flow predecir -> medir -> comparar -> concluir. */
export const INDICADORES_POR_MOMENTO: Readonly<Record<'pregunta' | 'prediccion' | 'justificacion' | 'conclusion' | 'reflexion', readonly Indicador[]>> = {
  pregunta: ['variable'],
  prediccion: ['variable', 'prediccion', 'justificacion'],
  justificacion: ['justificacion'],
  conclusion: ['uso_del_dato', 'conclusion_coherente', 'justificacion'],
  reflexion: ['justificacion'],
};

/**
 * Judge a student answer by its moment. The student's support state (EstadoApoyo) is NOT an input:
 * the signal never touches the evaluation (gate F4).
 */
export function juzgarRespuesta(
  momento: keyof typeof INDICADORES_POR_MOMENTO,
  texto: string,
  contexto: ContextoJuez,
  datos: readonly DatoMedido[],
): VeredictoJuez[] {
  return INDICADORES_POR_MOMENTO[momento].map((indicador) => juzgarConReglas({ indicador, respuesta: texto, contexto, datos }));
}
