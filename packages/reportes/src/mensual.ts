/**
 * Monthly director/UGEL report: the data model behind the PDF (FUNCIONES_EXTRA 1.4.3).
 * Composed from synced AGGREGATES only. Schools are identified by modular code. Cells under 5 are
 * suppressed, nothing is ranked, and no student, alias, quote or Guardián datum can enter: the input is an
 * allow-list and the builder reads only the fields it names.
 */
import { esquemaReporteVigente, hashFuente, type RangoFechas } from './competencias.ts';
import { K_MIN, celda, type Celda } from './suprimir.ts';

export interface AulaMes {
  colegioCodigo: string;
  /** Section label, e.g. "2.° A". */
  seccion: string;
  sincronizada: boolean;
  exhibicionesRealizadas: number;
  sesiones: number;
  sesionesConEvidencia: number;
  diasCierre: number;
  diasCierreCubiertos: number;
  paquetesEnviados: number;
  paquetesDevueltos: number;
  entregasPorCanal: { qr: number; whatsapp: number; correo: number };
  sesionesSinRed: number;
  minutosAudioQuechua: number;
  gruposActivos: number;
  cobertura: { competencia: number; capacidad: string; gruposConEvidencia: number; gruposTotal: number }[];
  conceptos: { conceptoId: string; etiqueta: string; gruposQueCostaron: number; exhibicionSugerida?: string }[];
  ayuda: { pedidos: number; cierres: number; gruposInvolucrados: number };
  nudosQuipu: number;
}

export interface EntradaMensual {
  destinatario: 'director' | 'ugel';
  periodo: { mes: string } & RangoFechas;
  colegioCodigo?: string;
  ugelCodigo?: string;
  aulas: AulaMes[];
  ultimaSincronizacion: string;
  versionCneb: string;
  /** Prototype data: the PDF shows a visible "Datos de ejemplo" chip. */
  ejemplo?: boolean;
}

const CLAVES_AULA: (keyof AulaMes)[] = [
  'colegioCodigo', 'seccion', 'sincronizada', 'exhibicionesRealizadas', 'sesiones', 'sesionesConEvidencia', 'diasCierre',
  'diasCierreCubiertos', 'paquetesEnviados', 'paquetesDevueltos', 'entregasPorCanal', 'sesionesSinRed', 'minutosAudioQuechua',
  'gruposActivos', 'cobertura', 'conceptos', 'ayuda', 'nudosQuipu',
];
const CLAVES_ENTRADA: (keyof EntradaMensual)[] = ['destinatario', 'periodo', 'colegioCodigo', 'ugelCodigo', 'aulas', 'ultimaSincronizacion', 'versionCneb', 'ejemplo'];

/** Allow-list validation of the input: any field that is not named here is a violation. */
export function validarEntradaMensual(e: EntradaMensual): string[] {
  const problemas: string[] = [];
  for (const k of Object.keys(e)) if (!(CLAVES_ENTRADA as string[]).includes(k)) problemas.push(`entrada.${k}: field not allowed`);
  e.aulas.forEach((a, i) => {
    for (const k of Object.keys(a)) if (!(CLAVES_AULA as string[]).includes(k)) problemas.push(`aulas[${i}].${k}: field not allowed`);
  });
  return problemas;
}

export interface ReporteMensual {
  esquemaReporte: typeof esquemaReporteVigente;
  tipo: 'director_mensual' | 'ugel_mensual';
  periodo: EntradaMensual['periodo'];
  colegioCodigo?: string;
  ugelCodigo?: string;
  versionCneb: string;
  hashFuente: string;
  ejemplo: boolean;
  supresionMinima: typeof K_MIN;
  cifras: {
    exhibicionesRealizadas: number;
    seccionesActivas: number;
    sesiones: { conEvidencia: number; total: number };
    diasCierre: { cubiertos: number; total: number };
    cobertura: { sincronizadas: number; total: number; leyenda: string };
  };
  coberturaPorSeccion: { seccion: string; capacidades: { competencia: number; capacidad: string; grupos: Celda }[] }[];
  conceptosQueCostaron: { conceptoId: string; etiqueta: string; grupos: Celda; exhibicionSugerida?: string }[];
  continuidad: { diasCierre: number; diasCierreCubiertos: number; paquetesEnviados: number; paquetesDevueltos: number; entregasPorCanal: { qr: number; whatsapp: number; correo: number } };
  brechas: { sesionesSinRed: number; horasAudioQuechua: number };
  ayudaEntrePares: { seccion: string; pedidos: Celda; cierres: Celda }[];
  metodo: { leyenda: string; supresionMinima: number; ultimaSincronizacion: string };
  /** UGEL only: ordered by modular code. Never by result, no colors. */
  tablaTerritorial?: {
    totalColegios: number;
    filasEnPdf: number;
    filas: { colegioCodigo: string; seccionesActivas: number; sesiones: { conEvidencia: number; total: number }; aulasSincronizadas: { sincronizadas: number; total: number }; gruposConEvidencia: Celda }[];
  };
}

export const MAX_FILAS_TABLA_TERRITORIAL_PDF = 40;
const MAX_CONCEPTOS = 8;
const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function construirReporteMensual(e: EntradaMensual): ReporteMensual {
  const codigos = [e.colegioCodigo, ...e.aulas.map((a) => a.colegioCodigo)].filter((c): c is string => c !== undefined);
  for (const c of codigos) if (!/^\d{7}$/.test(c)) throw new Error(`código modular inválido: el colegio se identifica solo por su código modular de 7 dígitos`);

  const sync = e.aulas.filter((a) => a.sincronizada);
  const activas = sync.filter((a) => a.sesiones > 0);
  const aulasOrdenadas = [...sync].sort((a, b) => a.seccion.localeCompare(b.seccion, 'es'));

  const conceptos = new Map<string, { etiqueta: string; grupos: number; sugerida?: string }>();
  for (const a of sync) {
    for (const c of a.conceptos) {
      const previo = conceptos.get(c.conceptoId);
      conceptos.set(c.conceptoId, {
        etiqueta: c.etiqueta,
        grupos: (previo?.grupos ?? 0) + c.gruposQueCostaron,
        ...(c.exhibicionSugerida ?? previo?.sugerida ? { sugerida: c.exhibicionSugerida ?? previo?.sugerida } : {}),
      });
    }
  }
  const conceptosVisibles = [...conceptos]
    .map(([conceptoId, c]) => ({ conceptoId, etiqueta: c.etiqueta, grupos: celda(c.grupos, c.grupos), sugerida: c.sugerida, n: c.grupos }))
    .filter((c) => !c.grupos.suprimido && c.n > 0)
    .sort((a, b) => b.n - a.n || a.etiqueta.localeCompare(b.etiqueta, 'es'))
    .slice(0, MAX_CONCEPTOS)
    .map(({ conceptoId, etiqueta, grupos, sugerida }) => ({ conceptoId, etiqueta, grupos, ...(sugerida ? { exhibicionSugerida: sugerida } : {}) }));

  const base: ReporteMensual = {
    esquemaReporte: esquemaReporteVigente,
    tipo: e.destinatario === 'director' ? 'director_mensual' : 'ugel_mensual',
    periodo: e.periodo,
    ...(e.colegioCodigo ? { colegioCodigo: e.colegioCodigo } : {}),
    ...(e.ugelCodigo ? { ugelCodigo: e.ugelCodigo } : {}),
    versionCneb: e.versionCneb,
    hashFuente: hashFuente(sync.map((a) => `${a.colegioCodigo}|${a.seccion}|${a.exhibicionesRealizadas}|${a.sesiones}`)),
    ejemplo: e.ejemplo ?? false,
    supresionMinima: K_MIN,
    cifras: {
      exhibicionesRealizadas: suma(sync.map((a) => a.exhibicionesRealizadas)),
      seccionesActivas: activas.length,
      sesiones: { conEvidencia: suma(sync.map((a) => a.sesionesConEvidencia)), total: suma(sync.map((a) => a.sesiones)) },
      diasCierre: { cubiertos: suma(sync.map((a) => a.diasCierreCubiertos)), total: suma(sync.map((a) => a.diasCierre)) },
      cobertura: { sincronizadas: sync.length, total: e.aulas.length, leyenda: `${sync.length} de ${e.aulas.length} aulas sincronizaron` },
    },
    coberturaPorSeccion:
      e.destinatario === 'director'
        ? aulasOrdenadas.map((a) => ({
            seccion: a.seccion,
            capacidades: a.cobertura.map((c) => ({ competencia: c.competencia, capacidad: c.capacidad, grupos: celda(c.gruposConEvidencia, c.gruposConEvidencia) })),
          }))
        : [],
    conceptosQueCostaron: conceptosVisibles,
    continuidad: {
      diasCierre: suma(sync.map((a) => a.diasCierre)),
      diasCierreCubiertos: suma(sync.map((a) => a.diasCierreCubiertos)),
      paquetesEnviados: suma(sync.map((a) => a.paquetesEnviados)),
      paquetesDevueltos: suma(sync.map((a) => a.paquetesDevueltos)),
      entregasPorCanal: {
        qr: suma(sync.map((a) => a.entregasPorCanal.qr)),
        whatsapp: suma(sync.map((a) => a.entregasPorCanal.whatsapp)),
        correo: suma(sync.map((a) => a.entregasPorCanal.correo)),
      },
    },
    brechas: {
      sesionesSinRed: suma(sync.map((a) => a.sesionesSinRed)),
      horasAudioQuechua: Math.round((suma(sync.map((a) => a.minutosAudioQuechua)) / 60) * 10) / 10,
    },
    ayudaEntrePares:
      e.destinatario === 'director'
        ? aulasOrdenadas.map((a) => ({ seccion: a.seccion, pedidos: celda(a.ayuda.pedidos, a.ayuda.gruposInvolucrados), cierres: celda(a.ayuda.cierres, a.ayuda.gruposInvolucrados) }))
        : [],
    metodo: {
      leyenda: 'Este informe orienta, no califica. Se suprimen las celdas con menos de 5 grupos. No incluye nombres de estudiantes, frases ni imágenes. Las aulas que no sincronizaron no entran en las cifras.',
      supresionMinima: K_MIN,
      ultimaSincronizacion: e.ultimaSincronizacion,
    },
  };

  if (e.destinatario === 'director') return base;

  const colegios = [...new Set(e.aulas.map((a) => a.colegioCodigo))].sort();
  const filas = colegios.map((colegioCodigo) => {
    const propias = e.aulas.filter((a) => a.colegioCodigo === colegioCodigo);
    const s = propias.filter((a) => a.sincronizada);
    const conEvidencia = suma(s.flatMap((a) => a.cobertura.map((c) => c.gruposConEvidencia)));
    return {
      colegioCodigo,
      seccionesActivas: s.filter((a) => a.sesiones > 0).length,
      sesiones: { conEvidencia: suma(s.map((a) => a.sesionesConEvidencia)), total: suma(s.map((a) => a.sesiones)) },
      aulasSincronizadas: { sincronizadas: s.length, total: propias.length },
      gruposConEvidencia: celda(conEvidencia, conEvidencia),
    };
  });
  return {
    ...base,
    tablaTerritorial: { totalColegios: filas.length, filasEnPdf: Math.min(filas.length, MAX_FILAS_TABLA_TERRITORIAL_PDF), filas: filas.slice(0, MAX_FILAS_TABLA_TERRITORIAL_PDF) },
  };
}

/** Rough A4 page estimate from row counts: 4 pages for the director, 6 for the UGEL (page budget). */
export function estimarPaginas(r: ReporteMensual): number {
  const filasCobertura = r.coberturaPorSeccion.reduce((s, x) => s + x.capacidades.length + 1, 0);
  const filasOtras = r.conceptosQueCostaron.length + r.ayudaEntrePares.length + 8;
  const filasTerritorial = r.tablaTerritorial?.filas.length ?? 0;
  return 1 + Math.ceil(filasCobertura / 38) + Math.ceil(filasOtras / 38) + Math.ceil(filasTerritorial / 38);
}
