/**
 * Contract suite of the `RepositorioEventos` port (5.6 "contract" level): every adapter (memory,
 * Dexie, SQLite in the hub) runs the same cases against the contract fixtures.
 */
import type { Evento } from '@rikuy/contracts';
import { dispositivos, ids } from '@rikuy/contracts/fixtures';
import { describe, expect, it } from 'vitest';
import type { RepositorioEventos } from '../puertos.ts';

const ev = (seq: number, dispositivo: string = dispositivos.grupo1, claseId: string = ids.clase): Evento => ({
  id: `01JC${claseId === ids.clase ? 'C' : 'A'}${dispositivo.slice(-2)}${String(seq).padStart(4, '0')}`.padEnd(26, '0'),
  dispositivo,
  seq,
  hlc: `17623008${String(seq).padStart(5, '0')}-0000-aaaaaaaa`,
  claseId,
  sv: 1,
  tipo: 'pista.mostrada',
  autor: {},
  datos: { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 1 },
  mac: 'AAAAAAAAAAA',
});

export function repositoryContract(name: string, make: () => Promise<RepositorioEventos>): void {
  describe(`RepositorioEventos contract: ${name}`, () => {
    it('adds new events and is idempotent by id', async () => {
      const repo = await make();
      expect(await repo.add([ev(1), ev(2)])).toBe(2);
      expect(await repo.add([ev(2), ev(3)])).toBe(1);
      expect(await repo.has(ev(1).id)).toBe(true);
      expect((await repo.all(ids.clase)).map((e) => e.seq).sort()).toEqual([1, 2, 3]);
    });

    it('returns events exactly as stored (seals stay verifiable)', async () => {
      const repo = await make();
      await repo.add([ev(1)]);
      expect(await repo.all(ids.clase)).toEqual([ev(1)]);
    });

    it('keeps classes apart', async () => {
      const repo = await make();
      await repo.add([ev(1), ev(1, dispositivos.grupo1, ids.aula)]);
      expect(await repo.all(ids.clase)).toHaveLength(1);
      expect(await repo.vector(ids.aula)).toEqual({ [dispositivos.grupo1]: 1 });
    });

    it('stores gaps but the vector stops at the first one; lastSeq sees the highest', async () => {
      const repo = await make();
      await repo.add([ev(1), ev(3), ev(1, dispositivos.grupo2)]);
      expect(await repo.vector(ids.clase)).toEqual({ [dispositivos.grupo1]: 1, [dispositivos.grupo2]: 1 });
      expect(await repo.lastSeq(ids.clase, dispositivos.grupo1)).toBe(3);
      expect(await repo.lastSeq(ids.clase, dispositivos.docente)).toBe(0);
    });
  });
}
