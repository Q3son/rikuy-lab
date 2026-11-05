/**
 * Quipu de logros (3.11): an entry of an append-only cooperative ledger.
 * No purchases, no individual ranking, no losses. A negative entry is only a
 * teacher correction of a previous entry.
 */
import { z } from 'zod';
import { Ulid } from './comun.ts';

export const MotivoQuipu = z.enum([
  'todos_predijeron',
  'medicion_completa',
  'ayudo_a_otro_grupo',
  'conclusion_con_dato',
  'reto_cooperativo',
  'correccion_docente',
]);
export type MotivoQuipu = z.infer<typeof MotivoQuipu>;

export const BeneficiarioQuipu = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('aula') }),
  z.object({ tipo: z.literal('grupo'), grupoId: Ulid }),
]);

export const AsientoQuipu = z
  .object({
    id: Ulid,
    aulaId: Ulid,
    claseId: Ulid.optional(),
    beneficiario: BeneficiarioQuipu,
    nudos: z
      .number()
      .int()
      .min(-50)
      .max(50)
      .refine((n) => n !== 0, { message: 'nudos cannot be 0' }),
    motivo: MotivoQuipu,
    evidenciaRef: Ulid.optional(),
    emitidoPor: z.enum(['reglas', 'docente']),
    corrigeA: Ulid.optional(),
  })
  .superRefine((a, ctx) => {
    if (a.nudos < 0 && !(a.motivo === 'correccion_docente' && a.emitidoPor === 'docente' && a.corrigeA)) {
      ctx.addIssue({
        code: 'custom',
        path: ['nudos'],
        message: 'negative knots are only allowed as a teacher correction (corrigeA) of a previous entry',
      });
    }
  });
export type AsientoQuipu = z.infer<typeof AsientoQuipu>;
