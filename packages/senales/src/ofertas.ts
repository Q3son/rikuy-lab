/** Offers of help to the group (DESIGN 10.4): hint, go slower or a pause. Rikuy never comments on the student. */
import type { AccionApoyo, SenalApoyo } from '@rikuy/contracts';

export type TipoOferta = 'pista' | 'mas_despacio' | 'pausa';

export interface OfertaAyuda {
  grupoId: string;
  tipo: TipoOferta;
  texto: string;
  /** Rendered only on the personal device, never on the shared display phone or projector. */
  soloEnEsteCelular: true;
}

const TEXTO: Record<TipoOferta, string> = {
  pista: 'Esto cuesta un poco. ¿Te doy una pista?',
  mas_despacio: '¿Vamos más despacio?',
  pausa: '¿Una pausa de un minuto?',
};

export function ofertaDeSenal(s: SenalApoyo): OfertaAyuda | undefined {
  let tipo: TipoOferta;
  switch (s.estado) {
    case 'atascado_en_habilidad':
    case 'evita_ayuda':
      tipo = 'pista';
      break;
    case 'abuso_de_pistas':
    case 'adivinacion_rapida':
      tipo = 'mas_despacio';
      break;
    case 'inactivo':
      tipo = 'pausa';
      break;
    default:
      return undefined; // discrepancy: teacher only
  }
  return { grupoId: s.grupoId, tipo, texto: TEXTO[tipo], soloEnEsteCelular: true };
}

export function aAccionApoyo(o: OfertaAyuda): AccionApoyo {
  return o.tipo === 'pista' ? 'ofrecerPista' : o.tipo === 'mas_despacio' ? 'irMasLento' : 'sugerirPausa';
}

export interface LimitadorOfertas {
  puedeOfrecer(grupoId: string, exhibicionId: string, ahora: number): boolean;
  registrarOfrecida(grupoId: string, exhibicionId: string): void;
  registrarRechazo(grupoId: string, ahora: number): void;
}

export const MAX_OFERTAS_POR_EXHIBICION = 2;
export const SNOOZE_MS = 5 * 60_000;

export function crearLimitadorOfertas(): LimitadorOfertas {
  const conteo = new Map<string, number>();
  const hasta = new Map<string, number>();
  return {
    puedeOfrecer: (g, x, ahora) => (conteo.get(`${g}|${x}`) ?? 0) < MAX_OFERTAS_POR_EXHIBICION && ahora > (hasta.get(g) ?? -1),
    registrarOfrecida: (g, x) => void conteo.set(`${g}|${x}`, (conteo.get(`${g}|${x}`) ?? 0) + 1),
    registrarRechazo: (g, ahora) => void hasta.set(g, ahora + SNOOZE_MS),
  };
}
