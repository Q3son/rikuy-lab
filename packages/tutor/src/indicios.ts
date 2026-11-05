/**
 * Reasoning cues in a student sentence: does it name a variable, predict, justify?
 *
 * Replaces `scoreHypothesis` of the legacy packages/core/src/analytics.ts. The legacy regexes
 * (/mas/, /porque|entonces/, ...) matched substrings, so "masa" counted as "más". Here every cue is a
 * WHOLE WORD or phrase (texto.ts), the usual non-prediction uses of "más" are excluded
 * ("nada más", "no más", "más o menos", "por más que") and questions are never predictions.
 * Each match keeps its literal span so the judge can quote the student's own words.
 */
import { buscarFrase, contieneFrase, extraerNumeros, tokenizar, type Token } from './texto.ts';

export interface Span {
  ini: number;
  fin: number;
}

export interface AnalisisRazonamiento {
  variable: boolean;
  prediccion: boolean;
  justificacion: boolean;
  /** Matched cue phrases (normalized), for explaining the decision to the teacher. */
  indicios: { variable: string[]; prediccion: string[]; justificacion: string[] };
  /** Literal spans in the original text. */
  spans: { variable: Span[]; prediccion: Span[]; justificacion: Span[] };
  /** Ids of the practice variables (lexicon keys) that the sentence names. */
  variables: string[];
  /** True if the sentence is a question (never a prediction or a justification). */
  esPregunta: boolean;
}

/** Experimental factors of the catalog practices and the words students use for them. */
export const LEXICO_VARIABLES: Readonly<Record<string, readonly string[]>> = {
  temperatura: ['temperatura', 'grados', 'caliento', 'calentar', 'calentamos', 'calentamiento', 'calor', 'caliente', 'frio', 'fria', 'enfriar', 'hervir', 'hierve'],
  ph: ['ph', 'acidez', 'acido', 'acida', 'basico', 'alcalino'],
  longitud: ['longitud', 'cuerda', 'largo', 'larga', 'corto', 'corta', 'alargo', 'alargar', 'acortar', 'acorto', 'hilo'],
  masa: ['masa', 'peso', 'pesa', 'pesado', 'pesada', 'gramos', 'kilos'],
  gravedad: ['gravedad'],
  altitud: ['altitud', 'altura', 'msnm', 'puna'],
};

const COMPARATIVOS = ['mas', 'menos', 'mayor', 'menor', 'mejor', 'peor'];

const EFECTO = [
  'influye', 'influyen', 'influya', 'influira', 'afecta', 'afectan', 'afecte', 'afectara',
  'depende', 'dependen', 'cambia', 'cambian', 'que cambie', 'cambiara', 'cambiaria', 'varia', 'varian',
  'no hace nada', 'no pasa nada', 'no importa', 'da igual',
];

const RESULTADO = [
  'aumenta', 'aumentan', 'aumentara', 'aumentaran', 'aumentaria',
  'disminuye', 'disminuyen', 'disminuira', 'disminuiran',
  'baja', 'bajan', 'bajara', 'sube', 'suben', 'subira', 'crece', 'crecen', 'decrece',
  'acelera', 'frena', 'se detiene', 'se para',
  'tardara', 'demorara', 'funcionara', 'sera', 'seran', 'seria', 'quedara', 'ocurrira',
  'se rompe', 'se rompen', 'se deforma', 'se deforman', 'se dana', 'se danan', 'se desnaturaliza', 'se desnaturalizan',
  'lento', 'lenta', 'despacio', 'rapido', 'rapida',
  'ya no', 'deja de', 'dejan de', 'dejara de', 'no va a', 'no se va a',
];

/** Interrogatives that open a question even without marks. "como"/"cuando" only count with an accent (cómo, cuándo). */
const INTERROGATIVOS = ['que', 'cual', 'cuales', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'donde', 'quien', 'quienes'];
const INTERROGATIVOS_ACENTUADOS = ['como', 'cuando'];

const NEXO_CAUSAL = ['porque', 'ya que', 'debido a', 'a causa de', 'gracias a', 'por eso', 'xq', 'pq', 'porke', 'porqe', 'xk'];
/** After "porque" these words alone are not a reason ("porque sí"). */
const SIN_RAZON = new Set(['si', 'no', 'asi', 'nomas', 'nada', 'xq', 'pq']);
const NO_MOVIMIENTO = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'su', 'mi', 'tu', 'casa', 'clase']);

function gana(spans: Span[], indicios: string[], t: Token[], desde: number, hasta: number, etiqueta: string): void {
  spans.push({ ini: t[desde]!.ini, fin: t[hasta]!.fin });
  indicios.push(etiqueta);
}

/** Positions where `frase` starts, for every occurrence. */
function ocurrencias(tokens: readonly Token[], frase: string): Array<{ i: number; n: number }> {
  const partes = frase.split(' ');
  const out: Array<{ i: number; n: number }> = [];
  for (let i = 0; i + partes.length <= tokens.length; i++) {
    if (partes.every((p, j) => tokens[i + j]!.t === p)) out.push({ i, n: partes.length });
  }
  return out;
}

function comparativoValido(t: readonly Token[], i: number): boolean {
  const palabra = t[i]!.t;
  const prev = t[i - 1]?.t;
  const sig = t[i + 1]?.t;
  if (palabra === 'mas' || palabra === 'menos') {
    if (prev === 'nada' || prev === 'no') return false; // "nada más", "no más" (just / only)
    if (palabra === 'mas' && sig === 'o' && t[i + 2]?.t === 'menos') return false; // "más o menos"
    if (palabra === 'menos' && prev === 'o' && t[i - 2]?.t === 'mas') return false;
    if (palabra === 'mas' && prev === 'por' && sig === 'que') return false; // "por más que"
    if (palabra === 'mas' && (sig === 'bien' || sig === 'tarde')) return false;
  }
  return true;
}

export function analizarRazonamiento(
  texto: string,
  opciones: { lexicoExtra?: Readonly<Record<string, readonly string[]>> } = {},
): AnalisisRazonamiento {
  const t = tokenizar(texto);
  const primera = t[0];
  const acentuada = primera ? /[áéíóúÁÉÍÓÚ]/.test(texto.slice(primera.ini, primera.fin)) : false;
  const esPregunta =
    /[?¿]/.test(texto) ||
    (primera !== undefined && (INTERROGATIVOS.includes(primera.t) || (acentuada && INTERROGATIVOS_ACENTUADOS.includes(primera.t))));

  const ind = { variable: [] as string[], prediccion: [] as string[], justificacion: [] as string[] };
  const spans = { variable: [] as Span[], prediccion: [] as Span[], justificacion: [] as Span[] };
  const variables: string[] = [];

  // Variables
  const lexico = { ...LEXICO_VARIABLES, ...opciones.lexicoExtra };
  for (const [id, formas] of Object.entries(lexico)) {
    for (const forma of formas) {
      const m = ocurrencias(t, forma)[0];
      if (m) {
        gana(spans.variable, ind.variable, t, m.i, m.i + m.n - 1, forma);
        if (!variables.includes(id)) variables.push(id);
      }
    }
  }

  // Prediction
  if (!esPregunta) {
    t.forEach((tok, i) => {
      if (COMPARATIVOS.includes(tok.t) && comparativoValido(t, i)) gana(spans.prediccion, ind.prediccion, t, i, i, tok.t);
    });
    for (const frase of [...EFECTO, ...RESULTADO]) {
      for (const m of ocurrencias(t, frase)) gana(spans.prediccion, ind.prediccion, t, m.i, m.i + m.n - 1, frase);
    }
    for (const frase of ['va a', 'van a']) {
      for (const m of ocurrencias(t, frase)) {
        const sig = t[m.i + 2]?.t;
        if (sig && !NO_MOVIMIENTO.has(sig)) gana(spans.prediccion, ind.prediccion, t, m.i, m.i + 1, frase);
      }
    }
  }

  // Justification
  if (!esPregunta) {
    for (const nexo of NEXO_CAUSAL) {
      for (const m of ocurrencias(t, nexo)) {
        const resto = t.slice(m.i + m.n).filter((x) => !SIN_RAZON.has(x.t));
        if (nexo === 'porque' && resto.length === 0) continue;
        gana(spans.justificacion, ind.justificacion, t, m.i, m.i + m.n - 1, nexo);
      }
    }
    // "por que" written apart: a reason only if not accented (qué) and not at the start of the sentence
    for (const m of ocurrencias(t, 'por que')) {
      const original = texto.slice(t[m.i + 1]!.ini, t[m.i + 1]!.fin);
      if (m.i > 0 && !/[éÉ]/.test(original)) gana(spans.justificacion, ind.justificacion, t, m.i, m.i + 1, 'por que');
    }
  }

  return {
    variable: ind.variable.length > 0,
    prediccion: ind.prediccion.length > 0,
    justificacion: ind.justificacion.length > 0,
    indicios: ind,
    spans,
    variables,
    esPregunta,
  };
}

/** Numbers the sentence mentions (for "uso del dato"). */
export function numerosEnTexto(texto: string): number[] {
  return extraerNumeros(texto);
}

/** Whole-phrase check re-exported for rule files that only have the raw text. */
export function dice(texto: string, ...frases: string[]): boolean {
  const t = tokenizar(texto);
  return frases.some((f) => contieneFrase(t, f));
}

export function citaDe(texto: string, frase: string): string | null {
  const m = buscarFrase(tokenizar(texto), frase);
  return m ? texto.slice(m.ini, m.fin) : null;
}
