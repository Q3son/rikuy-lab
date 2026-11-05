/**
 * Package (3.2): transport unit (practice to take home, event batch, class join, ack, family summary),
 * and the RK1 QR frame format (3.6).
 */
import { z } from 'zod';
import { Hlc, Lengua, Sha256, Ulid } from './comun.ts';
import { Evento } from './evento.ts';
import { Practica } from './practica.ts';
import { VectorVersion } from './vector.ts';

export const TipoPaquete = z.enum(['practica', 'eventos', 'union', 'ack', 'resumen-familia']);
export type TipoPaquete = z.infer<typeof TipoPaquete>;

export const Paquete = z.object({
  v: z.literal(1),
  tipo: TipoPaquete,
  claseId: Ulid.optional(),
  emisor: z.string(),
  creado: Hlc,
  cuerpo: z.unknown(), // validated by tipo in PaqueteValidado
  firma: z.string().optional(), // ECDSA (teacher) or HMAC (group)
});
export type Paquete = z.infer<typeof Paquete>;

export const CuerpoUnion = z.object({
  claseId: Ulid,
  codigo: z.string().regex(/^[A-Z0-9]{6}$/),
  practica: Practica.or(z.object({ id: Ulid, version: z.number().int(), sha256: Sha256 })), // full, or its hash if already present
  claveClaseMac: z.string(),
  claveClasePub: z.string(),
});

export const CuerpoResumenFamilia = z.object({
  practicaId: Ulid,
  lengua: Lengua,
  resumen: z.string().max(500),
  audioClave: z.string().optional(),
});

const sobre = Paquete.omit({ tipo: true, cuerpo: true });
const firmado = { firma: z.string().min(1) };

/** Strict schema: body validated by type; practice and join packages must carry the teacher signature. */
export const PaqueteValidado = z.discriminatedUnion('tipo', [
  sobre.extend({ tipo: z.literal('practica'), cuerpo: Practica, ...firmado }),
  sobre.extend({ tipo: z.literal('eventos'), cuerpo: z.object({ eventos: z.array(Evento) }) }),
  sobre.extend({ tipo: z.literal('union'), cuerpo: CuerpoUnion, ...firmado }),
  sobre.extend({ tipo: z.literal('ack'), cuerpo: z.object({ vv: VectorVersion }) }),
  sobre.extend({ tipo: z.literal('resumen-familia'), cuerpo: CuerpoResumenFamilia }),
]);
export type PaqueteValidado = z.infer<typeof PaqueteValidado>;

/**
 * RK1 QR frame: `RK1:<T>:<msg>:<i>:<n>:<crc>:<fragment>`, all in the Base45 alphabet.
 * T = E events (group->teacher) | P practice | J join | A ack (1 frame) | F family summary.
 */
export const MARCO_QR_REGEX = /^RK1:([EPJAF]):([0-9A-Z]{4}):(\d{1,3}):(\d{1,3}):([0-9A-Z]{1,7}):([0-9A-Z $%*+\-./:]*)$/;
export const MarcoQr = z.string().regex(MARCO_QR_REGEX);
export const TipoMarcoQr = z.enum(['E', 'P', 'J', 'A', 'F']);
export const MAX_CARACTERES_FRAGMENTO = 450;
