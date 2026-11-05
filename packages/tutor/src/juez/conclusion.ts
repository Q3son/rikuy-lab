/**
 * `conclusion_coherente`: is the conclusion consistent with the GROUP'S OWN data?
 *
 * Replaces `conclusion_correcta` of the legacy analytics (a comparison with a fixed text). Here the
 * relation the students claim (direct, inverse, "no effect") is compared with the relation their own
 * measurements show. A claim about a variable the group did not vary cannot be judged: "NO".
 * Heuristic and transparent: the teacher sees the quote and can correct the level.
 */
import { analizarRazonamiento, comparativoValido } from '../indicios.ts';
import { extraerNumeros, tieneAlguna, tokenizar, type Token } from '../texto.ts';
import { fragmento } from './cita.ts';
import { condicionesQueRespaldan, lexicoDeContexto, noEvaluable, veredicto, veredictoNoObservable } from './comun.ts';
import type { ContextoJuez, DatoMedido, VeredictoJuez } from './tipos.ts';

export type Relacion = 'directa' | 'inversa' | 'ninguna';

const POSITIVOS = ['mas', 'mayor', 'aumenta', 'aumentan', 'aumento', 'aumentamos', 'sube', 'suben', 'subo', 'subimos', 'crece', 'crecen', 'alargo', 'alargamos', 'alargar', 'larga', 'largo'];
const NEGATIVOS = ['menos', 'menor', 'disminuye', 'disminuyen', 'baja', 'bajan', 'bajo', 'decrece', 'acorto', 'acortamos', 'acortar', 'reduce', 'corta', 'corto'];
const SIN_EFECTO = [
  'no cambia', 'no cambian', 'no influye', 'no influyen', 'no afecta', 'no afectan', 'no depende', 'no dependen', 'no varia',
  'no hace nada', 'no importa', 'da igual', 'no tiene efecto', 'lo mismo', 'igual en todos',
];
const CITAN_DATOS = ['mis datos', 'nuestros datos', 'mi tabla', 'lo que medimos', 'lo que medi', 'segun los datos', 'mi dato'];

/** Relation shown by the data: mean of y per x, then direction (or flat). `null` if x never varies. */
export function relacionDeDatos(datos: readonly DatoMedido[]): Relacion | 'mixta' | null {
  const porX = new Map<number, number[]>();
  for (const d of datos) porX.set(d.x, [...(porX.get(d.x) ?? []), d.y]);
  if (porX.size < 2) return null;
  const puntos = [...porX.entries()].map(([x, ys]) => ({ x, y: ys.reduce((a, b) => a + b, 0) / ys.length })).sort((a, b) => a.x - b.x);
  const ys = puntos.map((p) => p.y);
  const media = ys.reduce((a, b) => a + b, 0) / ys.length;
  if ((Math.max(...ys) - Math.min(...ys)) / Math.max(Math.abs(media), 1e-9) < 0.05) return 'ninguna';
  const mx = puntos.reduce((a, p) => a + p.x, 0) / puntos.length;
  const my = media;
  const cov = puntos.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
  const vx = puntos.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  const vy = puntos.reduce((a, p) => a + (p.y - my) ** 2, 0);
  const r = cov / Math.sqrt(vx * vy);
  return r > 0.5 ? 'directa' : r < -0.5 ? 'inversa' : 'mixta';
}

/** Direction signs of a sentence, in order. "más largo": only the comparative counts. */
function signos(t: readonly Token[]): number[] {
  const out: number[] = [];
  t.forEach((tok, i) => {
    const prev = t[i - 1]?.t;
    const descriptor = tok.t === 'largo' || tok.t === 'larga' || tok.t === 'corto' || tok.t === 'corta';
    if (descriptor && (prev === 'mas' || prev === 'menos')) return;
    if ((tok.t === 'mas' || tok.t === 'menos') && !comparativoValido(t, i)) return;
    if (POSITIVOS.includes(tok.t)) out.push(1);
    else if (NEGATIVOS.includes(tok.t)) out.push(-1);
  });
  return out;
}

export interface Afirmacion {
  relacion: Relacion;
  /** Practice variable the sentence is about (the tested one if the sentence names none). */
  variable: string;
  span: { ini: number; fin: number };
}

function oraciones(texto: string): Array<{ ini: number; fin: number }> {
  const out: Array<{ ini: number; fin: number }> = [];
  let ini = 0;
  for (let i = 0; i <= texto.length; i++) {
    if (i === texto.length || /[.;!?\n]/.test(texto[i]!)) {
      if (texto.slice(ini, i).trim()) out.push({ ini, fin: i });
      ini = i + 1;
    }
  }
  return out;
}

/** The first claim about an effect that the text makes, or null. */
export function afirmacionDe(texto: string, ctx: ContextoJuez): Afirmacion | null {
  const lexico = lexicoDeContexto(ctx);
  const propias = new Set(ctx.variables.map((v) => v.id));
  for (const o of oraciones(texto)) {
    const trozo = texto.slice(o.ini, o.fin);
    const t = tokenizar(trozo);
    const variable = analizarRazonamiento(trozo, { lexicoExtra: lexico }).variables.find((v) => propias.has(v)) ?? ctx.variableProbada;
    if (tieneAlguna(t, SIN_EFECTO)) return { relacion: 'ninguna', variable, span: o };
    const s = signos(t);
    if (s.length >= 2) return { relacion: s[0] === s[1] ? 'directa' : 'inversa', variable, span: o };
  }
  return null;
}

/** Judge `conclusion_coherente`. */
export function conclusionCoherente(texto: string, ctx: ContextoJuez, datos: readonly DatoMedido[]): VeredictoJuez {
  if (noEvaluable(texto)) return veredictoNoObservable('conclusion_coherente');
  const dato = relacionDeDatos(datos);
  if (dato === null) return veredictoNoObservable('conclusion_coherente');

  const afirmacion = afirmacionDe(texto, ctx);
  if (!afirmacion) return veredicto('conclusion_coherente', 1, texto.trim());
  if (afirmacion.variable !== ctx.variableProbada) return veredictoNoObservable('conclusion_coherente');

  const cita = fragmento(texto, afirmacion.span, 'oracion');
  if (dato === 'mixta') return { ...veredicto('conclusion_coherente', 1, cita), estado: 'dudoso' };
  if (afirmacion.relacion !== dato) return veredicto('conclusion_coherente', 0, cita);

  const respalda = extraerNumeros(texto).some((n) => condicionesQueRespaldan(n, datos).length > 0) || tieneAlguna(tokenizar(texto), CITAN_DATOS);
  return veredicto('conclusion_coherente', respalda ? 3 : 2, cita);
}

/**
 * Does the group's data confirm or contradict a prediction? Used by the memory projection
 * (`prediccion_confirmada` / `prediccion_refutada`, ARQUITECTURA 3.10). "indeterminado" when it cannot tell.
 */
export function contrastarPrediccion(texto: string, ctx: ContextoJuez, datos: readonly DatoMedido[]): 'confirma' | 'contradice' | 'indeterminado' {
  if (noEvaluable(texto)) return 'indeterminado';
  const dato = relacionDeDatos(datos);
  const afirmacion = afirmacionDe(texto, ctx);
  if (dato === null || dato === 'mixta' || !afirmacion || afirmacion.variable !== ctx.variableProbada) return 'indeterminado';
  return afirmacion.relacion === dato ? 'confirma' : 'contradice';
}
