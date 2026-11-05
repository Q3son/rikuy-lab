/** Consent gating (DESIGN 10.1, ECOSISTEMA 2.14): strict default = guardian consent AND student assent. */
import { NIVEL2_GUARDIAN_POR_DEFECTO, type ConsentimientoGuardian, type NivelGuardian } from '@rikuy/contracts';

/** Level 2 (camera and voice) is not built: only its gate exists, and it is closed by default. */
export const NIVEL2_POR_DEFECTO: boolean = NIVEL2_GUARDIAN_POR_DEFECTO;

/** Consent is renewed every school term (about 120 days). */
export const VIGENCIA_CONSENTIMIENTO_MS = 120 * 24 * 3600 * 1000;

export type PoliticaConsentimiento = 'estricta' | 'por_edad';
export type MotivoDenegado = 'sin_consentimiento' | 'apagado' | 'falta_apoderado' | 'falta_asentimiento' | 'vencido';
export type ResultadoConsentimiento = { permitido: true; nivel: NivelGuardian } | { permitido: false; motivo: MotivoDenegado };

export function hlcMs(hlc: string): number {
  return Number(hlc.slice(0, 13));
}

export function evaluarConsentimiento(
  c: ConsentimientoGuardian | undefined,
  opts: { ahora: number; politica?: PoliticaConsentimiento },
): ResultadoConsentimiento {
  if (!c) return { permitido: false, motivo: 'sin_consentimiento' };
  if (c.nivel === 'apagado') return { permitido: false, motivo: 'apagado' };
  if (opts.ahora - hlcMs(c.hlc) > VIGENCIA_CONSENTIMIENTO_MS) return { permitido: false, motivo: 'vencido' };
  if (!c.asentimientoEstudiante) return { permitido: false, motivo: 'falta_asentimiento' };
  const politica = opts.politica ?? 'estricta';
  const apoderadoRequerido = politica === 'estricta' || c.menorDe14;
  if (apoderadoRequerido && !c.consentimientoApoderado) return { permitido: false, motivo: 'falta_apoderado' };
  return { permitido: true, nivel: c.nivel };
}

export interface CompuertasNivel2 {
  flagCompilacion?: boolean; // (1) build flag, off by default
  claseFirmada?: boolean; // (2) class flag signed by the teacher
  consentimientoTodos?: boolean; // (3) every active user of the device consented
  interruptorDocente?: boolean; // (4) teacher switch
  indicadorVisible?: boolean; // (5) visible indicator with local pause
  regionUE?: boolean; // blocked in the EU, always
}

export function nivel2Disponible(g: CompuertasNivel2): { disponible: boolean; cerradas: string[] } {
  const cerradas: string[] = [];
  if (!(g.flagCompilacion ?? NIVEL2_POR_DEFECTO)) cerradas.push('flagCompilacion');
  if (!g.claseFirmada) cerradas.push('claseFirmada');
  if (!g.consentimientoTodos) cerradas.push('consentimientoTodos');
  if (!g.interruptorDocente) cerradas.push('interruptorDocente');
  if (!g.indicadorVisible) cerradas.push('indicadorVisible');
  if (g.regionUE) cerradas.push('regionUE');
  return { disponible: cerradas.length === 0, cerradas };
}

/** A denied level 2 falls back to level 1 (never to something with more data). */
export function nivelEfectivo(c: ConsentimientoGuardian, g: CompuertasNivel2): NivelGuardian {
  if (c.nivel !== 'nivel2_camara_voz') return c.nivel;
  return nivel2Disponible(g).disponible ? c.nivel : 'nivel1_conducta';
}
