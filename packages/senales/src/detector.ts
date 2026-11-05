/**
 * Level 1 behaviour rules, Lumilo style: simple, deterministic, explainable, no machine learning.
 * Output is SenalApoyo (behavioural state, never an emotion label, short-lived).
 */
import {
  SENAL_APOYO_TTL_MAX_MS,
  SenalApoyo,
  type AutorreporteMomento,
  type EstadoSenalApoyo,
  type EventoAprendizaje,
} from '@rikuy/contracts';
import { hlcMs } from './consentimiento.ts';
import { idDeterminista } from './ids.ts';

export const UMBRALES = {
  atascadoIntentos: 4, // incorrect attempts in a row on the same skill
  atascadoMinimo: 3, // never below this, even with a low baseline
  pistasSeguidas: 3, // hints in a row without trying
  rapidasEnVentana: 3,
  rapidasIncorrectas: 2,
  ventanaEventos: 10,
  errorAlto: 0.8, // strictly above, over the last 10 attempts
  intentosEvitaAyuda: 10,
  sesionesDiscrepancia: 3,
  ttlMs: 10 * 60 * 1000,
  minPasosLineaBase: 6,
  ventanaLineaBaseMs: 42 * 24 * 3600 * 1000,
} as const;

// ---- baseline ---------------------------------------------------------------

export interface ResumenPaso {
  sujetoId: string;
  tipo: 'estudiante' | 'grupo';
  pasoId: string;
  claseId: string;
  en: number;
  intentos: number;
  incorrectos: number;
  pistas: number;
}

export interface LineaBase {
  sujetoId: string;
  usable: boolean;
  muestras: number;
  medianaIntentos: number;
  medianaPistas: number;
}

const sujetoDe = (e: EventoAprendizaje): { tipo: 'estudiante' | 'grupo'; id: string } =>
  e.estudianteIds?.length === 1 ? { tipo: 'estudiante', id: e.estudianteIds[0] as string } : { tipo: 'grupo', id: e.grupoId };

const ordenar = (evs: EventoAprendizaje[]): EventoAprendizaje[] => [...evs].sort((a, b) => (a.hlc < b.hlc ? -1 : a.hlc > b.hlc ? 1 : 0));

function mediana(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}

/** Derived per-step counts (what survives the weekly purge of raw events, for the baseline window only). */
export function resumirPasos(eventos: EventoAprendizaje[], _ahora: number): ResumenPaso[] {
  const grupos = new Map<string, ResumenPaso>();
  for (const e of ordenar(eventos)) {
    const s = sujetoDe(e);
    const clave = `${s.id}|${e.claseId}|${e.pasoId}`;
    const r = grupos.get(clave) ?? { sujetoId: s.id, tipo: s.tipo, pasoId: e.pasoId, claseId: e.claseId, en: 0, intentos: 0, incorrectos: 0, pistas: 0 };
    r.en = hlcMs(e.hlc);
    if (e.tipo === 'intento') {
      r.intentos++;
      if (e.resultado === 'incorrecto') r.incorrectos++;
    }
    if (e.tipo === 'pista_solicitada') r.pistas++;
    grupos.set(clave, r);
  }
  return [...grupos.values()];
}

export function construirLineaBase(resumenes: ResumenPaso[], sujetoId: string, ahora: number): LineaBase {
  const propios = resumenes.filter((r) => r.sujetoId === sujetoId && ahora - r.en <= UMBRALES.ventanaLineaBaseMs);
  return {
    sujetoId,
    usable: propios.length >= UMBRALES.minPasosLineaBase,
    muestras: propios.length,
    medianaIntentos: mediana(propios.map((r) => r.intentos)),
    medianaPistas: mediana(propios.map((r) => r.pistas)),
  };
}

// ---- detector ---------------------------------------------------------------

export interface OpcionesDetector {
  ahora: number;
  lineasBase?: Map<string, LineaBase>;
  /** Only shared ("mi_docente") check-ins may inform an individual signal. */
  autorreportes?: AutorreporteMomento[];
  ttlMs?: number;
}

const CONFIANZA: Record<EstadoSenalApoyo, number> = {
  atascado_en_habilidad: 0.6,
  abuso_de_pistas: 0.5,
  adivinacion_rapida: 0.5,
  evita_ayuda: 0.5,
  inactivo: 0.3, // least reliable on shared phones
  discrepancia_autorreporte_conducta: 0.4,
};

const POSITIVAS = new Set(['curiosidad', 'alegria', 'orgullo', 'calma']);

export function detectar(eventosEntrada: EventoAprendizaje[], opts: OpcionesDetector): SenalApoyo[] {
  const ttl = Math.min(opts.ttlMs ?? UMBRALES.ttlMs, SENAL_APOYO_TTL_MAX_MS);
  const salida: SenalApoyo[] = [];
  const porSujeto = new Map<string, { tipo: 'estudiante' | 'grupo'; evs: EventoAprendizaje[] }>();
  for (const e of ordenar(eventosEntrada)) {
    const s = sujetoDe(e);
    const m = porSujeto.get(s.id) ?? { tipo: s.tipo, evs: [] };
    m.evs.push(e);
    porSujeto.set(s.id, m);
  }

  for (const [sujetoId, { tipo, evs }] of porSujeto) {
    const base = opts.lineasBase?.get(sujetoId);
    const lb = base?.usable ? base : undefined;
    const claseId = evs[0]?.claseId as string;
    const grupoId = evs[0]?.grupoId as string;
    const emitir = (estado: EstadoSenalApoyo, soporte: EventoAprendizaje[], relativo = false) => {
      if (soporte.length === 0) return;
      salida.push(
        SenalApoyo.parse({
          id: idDeterminista('senal', sujetoId, estado, soporte[soporte.length - 1]?.id ?? ''),
          claseId,
          grupoId,
          ...(tipo === 'estudiante' ? { estudianteId: sujetoId } : {}),
          estado,
          relativoALineaBase: relativo,
          confianza: Math.min(1, CONFIANZA[estado] + (relativo ? 0.2 : 0)),
          generadoEn: opts.ahora,
          expiraEn: opts.ahora + ttl,
          eventoIds: soporte.map((x) => x.id),
        }),
      );
    };

    const pasos = [...new Set(evs.map((e) => e.pasoId))];
    const umbralAtascado = lb ? Math.max(UMBRALES.atascadoMinimo, Math.ceil(lb.medianaIntentos * 2)) : UMBRALES.atascadoIntentos;
    const umbralPistas = lb ? Math.max(UMBRALES.pistasSeguidas, Math.ceil(lb.medianaPistas * 2) + 1) : UMBRALES.pistasSeguidas;

    for (const paso of pasos) {
      const delPaso = evs.filter((e) => e.pasoId === paso);
      // stuck on a skill: incorrect attempts in a row, since the last correct one
      const intentos = delPaso.filter((e) => e.tipo === 'intento');
      const racha: EventoAprendizaje[] = [];
      for (let i = intentos.length - 1; i >= 0; i--) {
        const x = intentos[i] as Extract<EventoAprendizaje, { tipo: 'intento' }>;
        if (x.resultado === 'correcto') break;
        if (x.resultado === 'incorrecto') racha.unshift(x);
      }
      if (racha.length >= umbralAtascado) emitir('atascado_en_habilidad', racha, Boolean(lb));

      // hints in a row without trying
      const hp = delPaso.filter((e) => e.tipo === 'pista_solicitada' || e.tipo === 'intento');
      const pistas: EventoAprendizaje[] = [];
      for (let i = hp.length - 1; i >= 0 && (hp[i] as EventoAprendizaje).tipo === 'pista_solicitada'; i--) pistas.unshift(hp[i] as EventoAprendizaje);
      if (pistas.length >= umbralPistas) emitir('abuso_de_pistas', pistas, Boolean(lb));

      // fast guessing
      const ult = delPaso.slice(-UMBRALES.ventanaEventos);
      const rapidas = ult.filter((e) => e.tipo === 'respuesta_rapida');
      const malas = ult.filter((e) => e.tipo === 'intento' && e.resultado === 'incorrecto');
      if (rapidas.length >= UMBRALES.rapidasEnVentana && malas.length >= UMBRALES.rapidasIncorrectas) emitir('adivinacion_rapida', [...rapidas, ...malas]);
    }

    // inactive: two minutes or more and nothing since
    const ultimo = evs[evs.length - 1];
    if (ultimo?.tipo === 'paso_inactivo' && (ultimo.duracion === '2m_5m' || ultimo.duracion === 'gt_5m')) emitir('inactivo', [ultimo]);

    // avoids help: error rate above 80% over the last 10 attempts and no help requested
    const todos = evs.filter((e): e is Extract<EventoAprendizaje, { tipo: 'intento' }> => e.tipo === 'intento' && e.resultado !== 'no_evaluable');
    const diez = todos.slice(-UMBRALES.intentosEvitaAyuda);
    const pidioAyuda = evs.some((e) => e.tipo === 'pista_solicitada' || e.tipo === 'ayuda_solicitada');
    if (diez.length === UMBRALES.intentosEvitaAyuda && !pidioAyuda && diez.filter((e) => e.resultado === 'incorrecto').length / diez.length > UMBRALES.errorAlto) {
      emitir('evita_ayuda', diez);
    }

    // self-report vs behaviour (shared check-ins only)
    if (tipo === 'estudiante') {
      const propio = (opts.autorreportes ?? []).filter((a) => a.estudianteId === sujetoId && a.visibilidad === 'mi_docente');
      const ultimoAr = propio[propio.length - 1];
      if (ultimoAr) {
        const todoBien = ultimoAr.emociones.every((x) => POSITIVAS.has(x.emocion)) && (ultimoAr.ayuda === undefined || ultimoAr.ayuda === 'nada');
        const mal = ultimoAr.emociones.some((x) => !POSITIVAS.has(x.emocion) && x.intensidad >= 4);
        const clasesAtascado = new Set<string>();
        const soporteAtasco: EventoAprendizaje[] = [];
        for (const c of new Set(evs.map((e) => e.claseId))) {
          for (const paso of pasos) {
            const r: EventoAprendizaje[] = [];
            const ints = evs.filter((e) => e.claseId === c && e.pasoId === paso && e.tipo === 'intento');
            for (let i = ints.length - 1; i >= 0; i--) {
              const x = ints[i] as Extract<EventoAprendizaje, { tipo: 'intento' }>;
              if (x.resultado === 'correcto') break;
              if (x.resultado === 'incorrecto') r.unshift(x);
            }
            if (r.length >= UMBRALES.atascadoIntentos) {
              clasesAtascado.add(c);
              soporteAtasco.push(...r);
            }
          }
        }
        if (todoBien && clasesAtascado.size >= UMBRALES.sesionesDiscrepancia) emitir('discrepancia_autorreporte_conducta', soporteAtasco);
        const ultimos = todos.slice(-4);
        if (mal && ultimos.length >= 4 && ultimos.every((e) => e.resultado === 'correcto')) emitir('discrepancia_autorreporte_conducta', ultimos);
      }
    }
  }
  return salida;
}
