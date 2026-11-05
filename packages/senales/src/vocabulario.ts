/**
 * Hard rule (ECOSISTEMA 2.14, DESIGN 10.9): no emotion label is ever attached to a student in any
 * teacher-facing object. This module is both the runtime guard and the oracle used by the tests.
 */
import { EmocionAutorreporte } from '@rikuy/contracts';

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Word stems of emotion vocabulary, accent-free and lowercase. */
const RAICES = [
  'confus', 'confund', 'frustr', 'aburr', 'trist', 'enoj', 'enfad', 'miedo', 'asust', 'temor', 'preocup', 'cansanci',
  'ansio', 'ansied', 'riesgo', 'alegr', 'felic', 'orgull', 'curios', 'calma', 'estres', 'deprim', 'angusti',
  'nervios', 'molest', 'rabia', 'soledad', 'afect', 'emocion', 'sentimient',
  ...EmocionAutorreporte.options.map((e) => normalizar(e).slice(0, 6)),
];

/** The only field that may carry a student's own verbatim words (shared by their choice). */
export const CAMPO_TEXTO_DEL_ESTUDIANTE = 'textoDelEstudiante';

function recorrer(valor: unknown, alVisitar: (s: string) => boolean): boolean {
  if (typeof valor === 'string') return alVisitar(valor);
  if (Array.isArray(valor)) return valor.some((v) => recorrer(v, alVisitar));
  if (valor !== null && typeof valor === 'object') {
    return Object.entries(valor as Record<string, unknown>).some(([k, v]) => {
      if (alVisitar(k)) return true;
      if (k === CAMPO_TEXTO_DEL_ESTUDIANTE) return false;
      return recorrer(v, alVisitar);
    });
  }
  return false;
}

/** True if any key or string value (except the verbatim student field) carries emotion vocabulary. */
export function contieneEtiquetaEmocional(valor: unknown): boolean {
  return recorrer(valor, (s) => {
    const n = normalizar(s);
    return RAICES.some((r) => n.includes(r));
  });
}

export function afirmarSinEtiquetasEmocionales(valor: unknown): void {
  if (contieneEtiquetaEmocional(valor)) {
    throw new Error('Emotion label detected in a teacher-facing object (forbidden by Guardián rules)');
  }
}
