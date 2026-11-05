import { z } from 'zod';
import { Dispositivo } from './comun.ts';

/** Version vector: `{ [dispositivo]: maxContiguousSeq }` (3.5). */
export const VectorVersion = z.record(Dispositivo, z.number().int().min(0));
export type VectorVersion = z.infer<typeof VectorVersion>;
