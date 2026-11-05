import type { PictoId } from '../pictogramas.ts';

/** What every template returns: the same message in the three shapes the channels need. */
export interface Renderizado {
  /** Email subject (also used as a title in the outbox). Never contains a child's name or a score. */
  asunto: string;
  /** Plain text of the email (multipart/alternative). */
  texto: string;
  /** Short text for WhatsApp (and for a `wa.me` link). */
  whatsapp: string;
  /** Email body: inline styles, table layout, every dynamic value escaped. */
  html: string;
  /** Words in the narrative part (family messages). */
  palabras?: number;
  pictogramas?: PictoId[];
  /** Pre-recorded audio blocks and total duration (family messages). */
  audio?: { bloques: { clave: string; segundos: number }[]; totalSegundos: number } | null;
}
