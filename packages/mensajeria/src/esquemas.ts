/** Strict schemas at the boundary (allow-list: an extra field fails). */
import { z } from 'zod';

export const CuerpoRenderizadoSchema = z.strictObject({
  asunto: z.string().max(150).optional(),
  texto: z.string().max(4000),
  html: z.string().max(20000).optional(),
  lineas: z.array(z.string().max(300)).max(30).optional(),
  periodo: z.strictObject({ desde: z.string(), hasta: z.string() }).optional(),
});

export const MensajeSalienteSchema = z.strictObject({
  id: z.string().min(1).max(40),
  claveIdempotencia: z.string().min(1).max(128),
  plantilla: z.enum(['tutora_semanal', 'familia_semanal_a', 'familia_semanal_b', 'director_mensual', 'ugel_mensual']),
  version: z.number().int().min(1),
  lengua: z.enum(['es', 'quy']),
  cuerpo: CuerpoRenderizadoSchema,
  adjuntos: z.array(z.strictObject({ tipo: z.enum(['audio', 'imagen', 'pdf']), hash: z.string().max(128) })).max(5),
  vigenteHasta: z.string(),
  consentimientoRef: z.string().min(1).max(80),
});

export const DestinoSchema = z.strictObject({
  canal: z.enum(['whatsapp', 'correo', 'enlace_wame', 'pdf']),
  direccion: z.string().min(3).max(200),
  ref: z.string().min(1).max(80),
});
