/**
 * "Llévame": Rikuy walks the group to what it wants to do and draws the path on the floor.
 *
 * Ported from AulaQuipu by paoloose (https://github.com/paoloose/aulaquipu), `apps/web-app/lib/campus/guides.ts`
 * (Killa, the campus guide; hackathon MVP, reuse agreed with its team; credits in docs/ATRIBUCIONES.md).
 * Adapted: the guide is Rikuy (the stone-eye mascot), the topics point at museum destinations (exhibit of
 * the day, curator, hall door, back to the hall) instead of campus furniture, and the target is resolved
 * against the scene generated from Tiled maps, so a topic with no target in this hall just answers.
 */
import type { Destino, Escena } from '@rikuy/campus';
import { RUTAS } from '@rikuy/contracts';

export type TemaGuiaId = 'exhibicion' | 'curador' | 'ayuda' | 'vestibulo' | 'moverse';

export interface TemaGuia {
  id: TemaGuiaId;
  etiqueta: string;
  /** What Rikuy says while it guides (or the answer, when there is nowhere to go). */
  dice: string;
}

export const TEMAS_GUIA: Record<TemaGuiaId, TemaGuia> = {
  exhibicion: { id: 'exhibicion', etiqueta: 'Quiero la exhibición de hoy', dice: 'Sigan el camino dorado: al llegar, se abre la práctica.' },
  curador: { id: 'curador', etiqueta: 'Hablar con el curador', dice: 'El curador cuida la galería del fondo. Respondan su pregunta y abre la reja.' },
  ayuda: {
    id: 'ayuda',
    etiqueta: 'Necesitamos ayuda',
    dice: 'Pidan ayuda en el panel «Ayudante del museo»: otro grupo que ya lo resolvió viene a explicarles. Yo les doy pistas en el chat.',
  },
  vestibulo: { id: 'vestibulo', etiqueta: 'Volver al vestíbulo', dice: 'Vamos a la puerta del vestíbulo.' },
  moverse: {
    id: 'moverse',
    etiqueta: '¿Cómo nos movemos?',
    dice: 'Caminen con las flechas o con un clic en el piso. Cerca de algo con placa, presionen E o Intro para abrirlo.',
  },
};

export const ORDEN_TEMAS: TemaGuiaId[] = ['exhibicion', 'curador', 'ayuda', 'vestibulo', 'moverse'];

const abierto = (d: Destino) => !d.bloqueada && !d.trasReja;

/** Destination the topic walks to in this scene, or null when Rikuy only answers. */
export function destinoDeTema(tema: TemaGuiaId, escena: Escena, hoy: { exhibicionId: string; salaId: string }): string | null {
  const d = escena.destinos;
  switch (tema) {
    case 'exhibicion': {
      const exacta = d.find((x) => x.exhibicionId === hoy.exhibicionId && abierto(x));
      if (exacta) return exacta.id;
      const puerta = d.find((x) => x.tipo === 'puerta' && x.salaId === hoy.salaId);
      if (puerta) return puerta.id;
      return d.find((x) => x.tipo === 'exhibicion' && abierto(x))?.id ?? null;
    }
    case 'curador':
      return d.find((x) => x.tipo === 'curador')?.id ?? null;
    case 'vestibulo':
      return escena.id === 'vestibulo' ? null : (d.find((x) => x.tipo === 'puerta' && x.destino === RUTAS.museo)?.id ?? null);
    default:
      return null;
  }
}

/** Topics that make sense in this scene (the ones that answer are always offered). */
export function temasDeEscena(escena: Escena, hoy: { exhibicionId: string; salaId: string }): TemaGuia[] {
  return ORDEN_TEMAS.filter((t) => t === 'ayuda' || t === 'moverse' || destinoDeTema(t, escena, hoy) !== null).map((t) => TEMAS_GUIA[t]);
}
