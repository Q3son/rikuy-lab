/**
 * Pure extraction of the science and technology (CyT) subset from the official
 * CNEB programmes. No file access here: scripts/extraer-cyt.ts reads the sources
 * and hashes them, this module only reshapes and validates them.
 *
 * Only official text is copied (nombre, capacidades, estandar, desempenos). The
 * `temas` fields in the source are editorial and are dropped on purpose.
 */

export type Nivel = 'primaria' | 'secundaria';

export const AREA_CYT = 'ciencia-y-tecnologia';

/** Shape of the source documents (Hecze/supermentes packages/curriculo/data/*.json). */
export interface DocumentoFuente {
  nivel: Nivel;
  fuente: { titulo: string; institucion: string; url: string };
  grados: Array<{
    id: string;
    nombre: string;
    ciclo: string;
    areas: Array<{
      id: string;
      nombre: string;
      competencias: Array<{
        nombre: string;
        capacidades: string[];
        estandar: string;
        desempenos: string[];
        temas?: string[];
      }>;
    }>;
  }>;
}

export interface EntradaFuente {
  archivo: string;
  sha256: string;
  documento: DocumentoFuente;
}

export interface CompetenciaCyT {
  id: string;
  numero: number;
  nombre: string;
  capacidades: string[];
  estandar: string;
  desempenos: string[];
}

export interface GradoCyT {
  id: string;
  nivel: Nivel;
  grado: number;
  ciclo: string;
  nombre: string;
  competencias: CompetenciaCyT[];
}

export interface SubconjuntoCyT {
  version: 1;
  area: typeof AREA_CYT;
  fuente: { titulo: string; institucion: string; url: string }[];
  archivos: { nombre: string; sha256: string }[];
  verificacion: { estado: 'pendiente'; metodo: string };
  grados: GradoCyT[];
}

const METODO_VERIFICACION =
  'Texto copiado de los programas curriculares de MINEDU mediante extracción de Hecze/supermentes (la edición de secundaria es un PDF escaneado con OCR). Cada cita debe contrastarse con el PDF oficial antes de usarse con alumnos.';

const ORDEN_NIVEL: Record<Nivel, number> = { primaria: 0, secundaria: 1 };

function gradoNumero(id: string, nivel: Nivel): number {
  const match = /^(primaria|secundaria)-(\d+)$/.exec(id);
  if (!match || match[1] !== nivel) {
    throw new Error(`El identificador de grado "${id}" no corresponde al nivel "${nivel}".`);
  }
  return Number(match[2]);
}

export function extraerCyT(entradas: readonly EntradaFuente[]): SubconjuntoCyT {
  const grados: GradoCyT[] = [];
  for (const { documento } of entradas) {
    for (const grado of documento.grados) {
      const numero = gradoNumero(grado.id, documento.nivel);
      const area = grado.areas.find((a) => a.id === AREA_CYT);
      if (!area) {
        throw new Error(`El grado "${grado.id}" no tiene el área "${AREA_CYT}".`);
      }
      grados.push({
        id: grado.id,
        nivel: documento.nivel,
        grado: numero,
        ciclo: grado.ciclo,
        nombre: grado.nombre,
        competencias: area.competencias.map((c, i) => ({
          id: `${grado.id}:cyt:c${i + 1}`,
          numero: i + 1,
          nombre: c.nombre,
          capacidades: [...c.capacidades],
          estandar: c.estandar,
          desempenos: [...c.desempenos],
        })),
      });
    }
  }
  grados.sort((a, b) => ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel] || a.grado - b.grado);

  const ordenadas = [...entradas].sort((a, b) => a.archivo.localeCompare(b.archivo));
  const fuentes = entradas
    .map((e) => e.documento)
    .sort((a, b) => ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel])
    .map((d) => ({ ...d.fuente }));

  return {
    version: 1,
    area: AREA_CYT,
    fuente: fuentes,
    archivos: ordenadas.map((e) => ({ nombre: e.archivo, sha256: e.sha256 })),
    verificacion: { estado: 'pendiente', metodo: METODO_VERIFICACION },
    grados,
  };
}

/** Stable serialization: 2-space JSON and a trailing newline. */
export function serializarSubconjunto(subconjunto: SubconjuntoCyT): string {
  return `${JSON.stringify(subconjunto, null, 2)}\n`;
}
