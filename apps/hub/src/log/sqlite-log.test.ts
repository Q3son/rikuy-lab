import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EventoValidado } from '@rikuy/contracts';
import { ids } from '@rikuy/contracts/fixtures';
import { CLASE, device, evento, eventos } from '../testing/eventos.ts';
import { SqliteEventLog } from './sqlite-log.ts';

const OTRA_CLASE = '01JC0000000000000000000C02';

describe('SqliteEventLog', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  it('builds valid contract events in the test helper', () => {
    expect(EventoValidado.safeParse(evento(1, 1)).success).toBe(true);
  });

  it('appends idempotently by id', () => {
    const log = new SqliteEventLog(':memory:');
    expect(log.append(eventos(1, 1, 3)).accepted).toHaveLength(3);
    const again = log.append(eventos(1, 1, 4));
    expect(again.accepted.map((e) => e.seq)).toEqual([4]);
    expect(again.duplicates).toBe(3);
    expect(log.count(CLASE)).toBe(4);
  });

  it('advances the version vector only up to the first gap', () => {
    const log = new SqliteEventLog(':memory:');
    log.append([evento(1, 1), evento(1, 2), evento(1, 4), evento(2, 1)]);
    expect(log.versionVector(CLASE)).toEqual({ [device(1)]: 2, [device(2)]: 1 });
    log.append([evento(1, 3)]);
    expect(log.versionVector(CLASE)).toEqual({ [device(1)]: 4, [device(2)]: 1 });
  });

  it('rejects a different event claiming an existing (dispositivo, seq)', () => {
    const log = new SqliteEventLog(':memory:');
    log.append([evento(1, 1)]);
    const r = log.append([evento(1, 1, { id: '01JC9900000000000000000001' })]);
    expect(r.accepted).toEqual([]);
    expect(r.conflicts).toBe(1);
  });

  it('returns what a peer lacks according to its version vector, per class', () => {
    const log = new SqliteEventLog(':memory:');
    log.append([...eventos(1, 1, 3), ...eventos(2, 1, 2), evento(3, 1, { claseId: OTRA_CLASE })]);
    const missing = log.missingFor(CLASE, { [device(1)]: 2 });
    expect(missing.map((e) => `${e.dispositivo}:${e.seq}`)).toEqual([`${device(1)}:3`, `${device(2)}:1`, `${device(2)}:2`]);
  });

  it('round-trips the full event, including datos and optional fields', () => {
    const log = new SqliteEventLog(':memory:');
    const e = evento(1, 1, { mac: 'abcdefgh' });
    log.append([e]);
    expect(log.missingFor(CLASE, {})).toEqual([e]);
  });

  it('survives a restart without losing events', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rikuy-hub-'));
    dirs.push(dir);
    const file = join(dir, 'hub.sqlite');
    const a = new SqliteEventLog(file);
    a.append(eventos(1, 1, 50));
    a.close();
    const b = new SqliteEventLog(file);
    expect(b.count(CLASE)).toBe(50);
    expect(b.versionVector(CLASE)).toEqual({ [device(1)]: 50 });
    b.close();
  });

  it('lists events in causal (hlc) order for export', () => {
    const log = new SqliteEventLog(':memory:');
    log.append([evento(2, 2), evento(1, 1), evento(2, 1)]);
    expect([...log.inOrder(CLASE)].map((e) => e.id)).toEqual([evento(1, 1).id, evento(2, 1).id, evento(2, 2).id]);
  });

  it('projects a per-group summary for the live panel', () => {
    const log = new SqliteEventLog(':memory:');
    log.append([
      evento(1, 1, { tipo: 'grupo.unido', autor: {}, datos: { id: ids.grupo1, claseId: CLASE, apodo: 'Vizcacha', dispositivo: device(1), integrantes: [] } }),
      evento(1, 2),
      evento(1, 3),
      evento(2, 1, { autor: { grupoId: ids.grupo2 }, datos: { grupoId: ids.grupo2, practicaId: ids.practica, nivel: 2 } }),
    ]);
    const groups = log.groups(CLASE);
    expect(groups).toEqual([
      { grupoId: ids.grupo1, apodo: 'Vizcacha', eventos: 3, porTipo: { 'grupo.unido': 1, 'pista.mostrada': 2 }, ultimoHlc: evento(1, 3).hlc },
      { grupoId: ids.grupo2, apodo: null, eventos: 1, porTipo: { 'pista.mostrada': 1 }, ultimoHlc: evento(2, 1).hlc },
    ]);
  });

  it('lists the classes it holds', () => {
    const log = new SqliteEventLog(':memory:');
    log.append([evento(1, 1), evento(1, 2), evento(3, 1, { claseId: OTRA_CLASE })]);
    expect(log.classes()).toEqual([
      { claseId: CLASE, eventos: 2 },
      { claseId: OTRA_CLASE, eventos: 1 },
    ]);
  });
});
