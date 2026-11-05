/**
 * Catalog ports: the official CNEB text (for the exact-quote check) and the approved practices
 * (the floor of the Creador). F9 owns the real data (`@rikuy/curriculum-cneb`, `content/practicas/`);
 * these are the shapes the AI layer needs from them.
 */
import type { DesempenoRef, Practica } from '@rikuy/contracts';

export type RefDesempeno = Pick<DesempenoRef, 'nivel' | 'grado' | 'competencia' | 'desempeno'>;

export interface CatalogoDesempenos {
  textoOficial(ref: RefDesempeno): string | undefined;
  /** Optional listing for pickers (the UI of the Creador). */
  listar?(): Array<{ ref: RefDesempeno; texto: string }>;
}

export const claveDesempeno = (r: RefDesempeno): string => `${r.nivel}-${r.grado}:c${r.competencia}:d${r.desempeno}`;

export function crearCatalogoDesempenos(entradas: Record<string, string>): CatalogoDesempenos {
  return {
    textoOficial: (ref) => entradas[claveDesempeno(ref)],
    listar: () =>
      Object.entries(entradas).flatMap(([clave, texto]) => {
        const m = /^(primaria|secundaria)-(\d+):c(\d+):d(\d+)$/.exec(clave);
        return m ? [{ ref: { nivel: m[1] as RefDesempeno['nivel'], grado: Number(m[2]), competencia: Number(m[3]), desempeno: Number(m[4]) }, texto }] : [];
      }),
  };
}

/**
 * DEVELOPMENT SAMPLE ONLY, until `@rikuy/curriculum-cneb` (F9) exports the real subset.
 * The text must be checked against the official PDF before it is used for anything else.
 */
export const CATALOGO_DESEMPENOS_MINIMO: Record<string, string> = {
  'secundaria-2:c1:d1': 'Formula preguntas acerca de las variables que influyen en un hecho, fenómeno u objeto natural o tecnológico.',
};

export interface FiltroPracticas {
  nivel?: DesempenoRef['nivel'];
  grado?: number;
  competencia?: number;
}
export interface CatalogoPracticas {
  listar(filtro?: FiltroPracticas): Practica[];
}

/** Approved practices only, closest first (same competency, then same grade). */
export function crearCatalogoPracticas(practicas: Practica[]): CatalogoPracticas {
  return {
    listar(filtro = {}) {
      const aprobadas = practicas.filter((p) => p.estado === 'aprobada');
      const puntaje = (p: Practica) =>
        (filtro.competencia === undefined || p.desempeno.competencia === filtro.competencia ? 2 : 0) +
        (filtro.grado === undefined || p.desempeno.grado === filtro.grado ? 1 : 0) +
        (filtro.nivel === undefined || p.desempeno.nivel === filtro.nivel ? 1 : 0);
      return [...aprobadas].sort((a, b) => puntaje(b) - puntaje(a));
    },
  };
}
