/**
 * What does the student want? Orders to the viewer plus ONE dialogue intent.
 *
 * Ported from the rules agent of packages/core/src/rulesAgent.ts (Rikuy Lab, the team's own code).
 * Differences: every pattern is a whole word or phrase (texto.ts), so "para la masa" is not a pause
 * and "lleve a" is not "ve a"; "no sé" is a help request but "no se va a mover" is not; a sentence
 * with a number is an order only when it has an imperative verb; and the tutor asks for a prediction
 * before running anything.
 */
import { analizarRazonamiento, LEXICO_VARIABLES } from './indicios.ts';
import { contieneFrase, extraerNumeros, tieneAlguna, tokenizar, type Token } from './texto.ts';

export type Accion =
  | { tipo: 'navegar'; escena: string }
  | { tipo: 'rotar'; yaw: number }
  | { tipo: 'zoom'; factor: number }
  | { tipo: 'separar' }
  | { tipo: 'centrar' }
  | { tipo: 'pausar' }
  | { tipo: 'correr' }
  | { tipo: 'fijar_variable'; variable: string; valor: number };

export type Dialogo =
  | 'pedir_pista'
  | 'exige_respuesta'
  | 'identidad'
  | 'compara_modelo'
  | 'conclusion'
  | 'hipotesis'
  | 'pregunta'
  | 'saludo'
  | 'accion'
  | 'no_entendi';

export interface Clasificacion {
  acciones: Accion[];
  dialogo: Dialogo;
}

/** Scene words, in priority order (first match wins, as in the legacy agent). */
export const PALABRAS_ESCENA: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['higado', ['higado']],
  ['lobulillo', ['lobulillo', 'lobulo', 'hepatocito']],
  ['respiratorio', ['pulmon', 'pulmones', 'respiratorio', 'respirar', 'respiracion', 'diafragma']],
  ['lactasa', ['lactasa', 'enzima', 'lactosa']],
  ['enterocito', ['enterocito', 'celula intestinal', 'borde en cepillo']],
  ['vellosidad', ['vellosidad', 'vellosidades']],
  ['intestino', ['intestino']],
  ['digestivo', ['digestivo', 'digestion']],
  ['pendulo', ['pendulo', 'columpio']],
];

const DISPARADORES_NAVEGAR = [
  'quiero ver', 'muestra', 'muestrame', 'ensename', 've a', 'ir a', 'vamos a', 'llevame', 'lleva', 'entra', 'entremos',
  'transforma', 'como es', 'que forma', 'ver el', 'ver la', 'abre', 'quiero ir',
];
const VERBOS_IMPERATIVOS = ['pon', 'poner', 'ponle', 'fija', 'fijar', 'sube', 'subir', 'baja', 'bajar', 'cambia', 'cambiar', 'aumenta', 'reduce', 'coloca', 'configura', 'usa', 'prueba', 'probemos', 'ajusta'];

const PALABRAS_AYUDA = ['pista', 'pistas', 'ayuda', 'ayudame', 'ayudenme', 'ayudita', 'me rindo', 'no entiendo', 'no me sale', 'estoy trabado', 'estoy atascado', 'estoy perdido'];
const EXIGE_RESPUESTA = ['respuesta', 'la solucion', 'dime cuanto', 'dime el resultado', 'dame el resultado'];
const IDENTIDAD = ['eres humano', 'eres un humano', 'eres una persona', 'eres persona', 'eres real', 'eres un robot', 'eres de verdad', 'eres una maquina', 'quien eres'];
const INICIO_CONCLUSION = ['entonces', 'concluyo', 'en conclusion', 'ya entendi', 'o sea que', 'mi conclusion', 'por lo tanto', 'asi que'];
const INICIO_HIPOTESIS = ['creo que', 'pienso que', 'yo digo que', 'seguro que', 'mi hipotesis', 'supongo que', 'apuesto que', 'me parece que'];
const SALUDOS = ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches'];
const SIGUE_NO_SE_AYUDA = ['como', 'que', 'por', 'cual', 'donde', 'nada', 'si', 'cuanto', 'quien', 'hacer'];

function empiezaCon(t: readonly Token[], frases: readonly string[]): boolean {
  return frases.some((f) => {
    const partes = f.split(' ');
    return partes.every((p, i) => t[i]?.t === p);
  });
}

/** "no sé" (or "no se" without accent) as a help request, not "no se va a mover". */
function noSeEsAyuda(texto: string, t: readonly Token[]): boolean {
  for (let i = 0; i + 1 < t.length; i++) {
    if (t[i]!.t === 'no' && t[i + 1]!.t === 'se') {
      const acentuada = /[éÉ]/.test(texto.slice(t[i + 1]!.ini, t[i + 1]!.fin));
      const siguiente = t[i + 2]?.t;
      if (acentuada || siguiente === undefined || SIGUE_NO_SE_AYUDA.includes(siguiente)) return true;
    }
  }
  return false;
}

function detectarAcciones(
  texto: string,
  t: readonly Token[],
  esPregunta: boolean,
  lexico: Readonly<Record<string, readonly string[]>>,
): Accion[] {
  const out: Accion[] = [];
  // A conditional or a reason is a sentence about the experiment, not an order ("si corre más rápido...").
  if (t[0]?.t === 'si' || tieneAlguna(t, ['porque', 'ya que', 'xq'])) return out;

  if (tieneAlguna(t, DISPARADORES_NAVEGAR)) {
    for (const [escena, palabras] of PALABRAS_ESCENA) {
      if (tieneAlguna(t, palabras)) {
        out.push({ tipo: 'navegar', escena });
        break;
      }
    }
  }

  if (tieneAlguna(t, ['gira', 'girar', 'giralo', 'rota', 'rotar', 'voltea', 'da la vuelta'])) {
    const grados = extraerNumeros(texto)[0] ?? 45;
    out.push({ tipo: 'rotar', yaw: contieneFrase(t, 'izquierda') ? -grados : grados });
  }

  if (tieneAlguna(t, ['acerca', 'acercar', 'zoom', 'amplia', 'ampliar', 'agranda', 'agrandar'])) out.push({ tipo: 'zoom', factor: 1.4 });
  else if (tieneAlguna(t, ['aleja', 'alejar', 'achica', 'achicar'])) out.push({ tipo: 'zoom', factor: 0.7 });

  if (tieneAlguna(t, ['separa', 'separar', 'explota', 'explotar', 'desarma', 'desarmar'])) out.push({ tipo: 'separar' });
  if (tieneAlguna(t, ['centra', 'centrar', 'reinicia la vista', 'vista inicial'])) out.push({ tipo: 'centrar' });

  if (tieneAlguna(t, ['pausa', 'pausar', 'deten', 'detente', 'detener', 'parar', 'para la simulacion'])) out.push({ tipo: 'pausar' });
  else if (tieneAlguna(t, ['corre', 'correr', 'inicia', 'iniciar', 'empieza', 'empezar', 'simula', 'simular', 'dale', 'arranca', 'suelta', 'soltar'])) {
    out.push({ tipo: 'correr' });
  }

  // Setting a variable: imperative verb + variable + number, never a question or an "if" clause.
  const numeros = extraerNumeros(texto);
  if (numeros.length > 0 && !esPregunta && t[0]?.t !== 'si' && tieneAlguna(t, VERBOS_IMPERATIVOS)) {
    for (const [variable, formas] of Object.entries(lexico)) {
      if (tieneAlguna(t, formas)) {
        out.push({ tipo: 'fijar_variable', variable, valor: numeros[numeros.length - 1]! });
        break;
      }
    }
  }
  return out;
}

export function clasificarIntenciones(
  texto: string,
  opciones: { lexicoVariables?: Readonly<Record<string, readonly string[]>> } = {},
): Clasificacion {
  const t = tokenizar(texto);
  if (t.length === 0) return { acciones: [], dialogo: 'no_entendi' };

  const lexico = opciones.lexicoVariables ?? LEXICO_VARIABLES;
  const razonamiento = analizarRazonamiento(texto, { lexicoExtra: lexico });
  const acciones = detectarAcciones(texto, t, razonamiento.esPregunta, lexico);

  const ordenes = acciones.length > 0;
  let dialogo: Dialogo;
  if (tieneAlguna(t, EXIGE_RESPUESTA)) dialogo = 'exige_respuesta';
  else if (tieneAlguna(t, PALABRAS_AYUDA) || noSeEsAyuda(texto, t)) dialogo = 'pedir_pista';
  else if (tieneAlguna(t, IDENTIDAD)) dialogo = 'identidad';
  else if (comparaConModelo(t)) dialogo = 'compara_modelo';
  else if (empiezaCon(t, INICIO_CONCLUSION)) dialogo = 'conclusion';
  else if (ordenes) dialogo = 'accion';
  else if (!razonamiento.esPregunta && (empiezaCon(t, INICIO_HIPOTESIS) || razonamiento.prediccion)) dialogo = 'hipotesis';
  else if (razonamiento.esPregunta) dialogo = 'pregunta';
  else if (empiezaCon(t, SALUDOS)) dialogo = 'saludo';
  else dialogo = 'no_entendi';

  return { acciones, dialogo };
}

function comparaConModelo(t: readonly Token[]): boolean {
  const suyo = tieneAlguna(t, ['mi dato', 'mis datos', 'mi medicion', 'mis mediciones', 'mi resultado', 'mis resultados', 'lo que medi']);
  const modelo = tieneAlguna(t, ['modelo', 'simulacion', 'holograma']);
  const difiere = tieneAlguna(t, ['diferente', 'distinto', 'distintos', 'diferentes', 'coincide', 'coinciden', 'error', 'lejos', 'no salio igual', 'no da igual', 'no es igual']);
  return (suyo || modelo) && difiere;
}
