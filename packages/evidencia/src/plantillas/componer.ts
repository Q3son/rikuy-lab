/**
 * Composers: turn the projections of the class (contract events) into the allow-listed input of
 * each template. They only copy counts and labels; nothing from Guardian or from a single student
 * can reach a template because the composers never read those fields.
 */
import type { AvanceGrupo } from '../avance.ts';
import type { CoberturaCapacidad } from '../cobertura.ts';
import type { VistaEvidencias } from '../evidencias.ts';
import type { ProyeccionClase } from '../proyeccion.ts';
import type { EntradaInforme, EntradaTutora } from './modelos.ts';

const NOMBRE_COMPETENCIA = 'Indaga mediante métodos científicos para construir sus conocimientos';

export interface DatosTutora {
  p: ProyeccionClase;
  vista: VistaEvidencias;
  avance: AvanceGrupo[];
  cobertura: CoberturaCapacidad[];
  fechaIni: string;
  fechaFin: string;
  exhibiciones: number;
  enlaceApp: string;
  sincronizadoHasta: string;
  mensajesPorAprobar?: number;
  fraseLocal?: string;
  proxima?: string;
}

export function componerTutora(d: DatosTutora): EntradaTutora {
  const total = d.vista.grupos.length;
  const entregaron = d.vista.grupos.filter((g) => g.indicadores.some((i) => !i.sinEvidencia)).length;
  const clase = d.p.clase;
  const costo = ['prediccion', 'justificacion', 'uso_del_dato'].flatMap((ind) => {
    const afectados = d.vista.grupos.filter((g) => g.indicadores.some((i) => i.indicador === ind && i.cita !== null && (i.estado === 'dudoso' || i.nivel === 0 || i.nivel === 1))).length;
    return afectados ? [{ concepto: ind === 'prediccion' ? 'Predecir antes de medir' : ind === 'justificacion' ? 'Justificar la idea' : 'Usar el propio dato', gruposAfectados: afectados, gruposTotal: total }] : [];
  });
  return {
    claseEtiqueta: clase ? `${clase.grado}.º ${clase.seccion}` : 'Clase',
    fechaIni: d.fechaIni,
    fechaFin: d.fechaFin,
    exhibiciones: d.exhibiciones,
    gruposEntregaron: entregaron,
    gruposTotal: total,
    competencia: { nombre: NOMBRE_COMPETENCIA, capacidades: d.cobertura.map((c) => ({ nombre: c.nombre, conEvidencia: c.gruposConEvidencia, trabajadas: total })) },
    costaron: costo.slice(0, 3),
    pendientes: {
      gruposSinEntregar: Math.max(0, total - entregaron),
      nudosPorConfirmar: 0,
      vitrinasPorAbrir: 0,
      mensajesPorAprobar: d.mensajesPorAprobar ?? 0,
    },
    ...(d.proxima ? { proxima: { titulo: d.proxima } } : {}),
    ...(d.fraseLocal ? { fraseLocal: d.fraseLocal } : {}),
    enlaceApp: d.enlaceApp,
    sincronizadoHasta: d.sincronizadoHasta,
  };
}

export interface DatosDirector {
  p: ProyeccionClase;
  cobertura: CoberturaCapacidad[];
  institucion: string;
  /** YYYY-MM */
  mes: string;
  seccion: string;
  ultimaSync: string;
  exhibiciones: number;
  datosSimulados?: boolean;
}

/** One classroom of the school. The real monthly report adds the rest of the sections from synced aggregates. */
export function componerDirector(d: DatosDirector): EntradaInforme {
  const total = d.p.grupos.length;
  return {
    alcance: 'director',
    institucion: d.institucion,
    mes: d.mes,
    datosSimulados: d.datosSimulados ?? false,
    sincronizacion: { aulasSincronizadas: 1, aulasTotal: 1, ultima: d.ultimaSync },
    cifras: { exhibicionesRealizadas: d.exhibiciones, seccionesActivas: 1, pctSesionesConEvidencia: total ? Math.round((d.p.evidencias.length ? 1 : 0) * 100) : 0, diasCierreCubiertos: 0, coberturaDatosPct: 100 },
    cobertura: [{ seccion: d.seccion, capacidades: d.cobertura.map((c) => ({ nombre: c.nombre, gruposConEvidencia: c.gruposConEvidencia, gruposTotal: total })) }],
    conceptos: [],
    continuidad: { diasCierre: 0, paquetesEnviados: 0, paquetesDevueltosQr: 0, porCanal: { qr: 0, whatsapp: 0, a4: 0 } },
    brechas: { sesionesSinRed: 0, horasAudioQuechua: 0 },
  };
}
