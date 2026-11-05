/**
 * Student names never get stored from a teacher's plan (4.4). Unlike `anonimizar`, this filter does not
 * replace common first names everywhere: in a science plan "luz" or "rosa" are words, not people.
 * It removes names after a student label, roster lines ("QUISPE MAMANI, Rosa"), emails, phones and ids.
 */
import type { PlanExtraido } from './esquemas.ts';

const NOMBRE = '[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+';
const RE_ETIQUETA = new RegExp(`\\b((?:[Ee]studiantes?|[Aa]lumn[oa]s?|[Aa]pellidos y nombres|[Nn]ombres y apellidos)\\s*:?\\s*)(${NOMBRE}(?:\\s+${NOMBRE}){0,3})`, 'gu');
const RE_PADRON = /\b[A-ZÁÉÍÓÚÑ]{3,}(?:\s+[A-ZÁÉÍÓÚÑ]{3,})*,\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+)?/gu;
const RE_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const RE_TELEFONO = /(?:\+?51[\s-]?)?9\d{2}[\s-]?\d{3}[\s-]?\d{3}/g;
const RE_DNI = /\b\d{8}\b/g;

export function quitarNombresEstudiantes(s: string): { texto: string; cambios: number } {
  let cambios = 0;
  const contar = (r: string) => () => (cambios++, r);
  const texto = s
    .replace(RE_ETIQUETA, (_m, etiqueta: string) => (cambios++, `${etiqueta}[nombre]`))
    .replace(RE_PADRON, contar('[nombre]'))
    .replace(RE_EMAIL, contar('[dato]'))
    .replace(RE_TELEFONO, contar('[dato]'))
    .replace(RE_DNI, contar('[dato]'));
  return { texto, cambios };
}

/** Applies the filter to every free text of the plan, source snippets included. */
export function limpiarPlan(plan: PlanExtraido): { plan: PlanExtraido; retirados: number } {
  let retirados = 0;
  const l = (s: string) => {
    const r = quitarNombresEstudiantes(s);
    retirados += r.cambios;
    return r.texto;
  };
  const lo = (s: string | undefined) => (s === undefined ? undefined : l(s));
  const limpio: PlanExtraido = {
    ...plan,
    unidades: plan.unidades.map((u) => {
      const situacion = lo(u.situacionSignificativa);
      return {
        ...u,
        titulo: l(u.titulo),
        ...(situacion !== undefined ? { situacionSignificativa: situacion } : {}),
        ...(u.fuente ? { fuente: { ...u.fuente, fragmento: l(u.fuente.fragmento) } } : {}),
        items: u.items.map((i) => ({ ...i, texto: l(i.texto), fuente: { ...i.fuente, fragmento: l(i.fuente.fragmento) } })),
      };
    }),
  };
  return { plan: limpio, retirados };
}
