import { ejemplos, ids } from '@rikuy/contracts/fixtures';
import type { Evento } from '@rikuy/contracts';
import { describe, expect, it } from 'vitest';
import { backupFileName, exportBackup, parseBackup } from './respaldo.ts';

const eventos = ejemplos.eventos as Evento[];

describe('.rikuy.json backup', () => {
  it('round-trips the log of a class', () => {
    const text = exportBackup({ claseId: ids.clase, eventos, exportado: '1762300805000-0001-docente1' });
    const back = parseBackup(text);
    expect(back).toEqual({ ok: true, value: { claseId: ids.clase, exportado: '1762300805000-0001-docente1', eventos } });
  });

  it('contains only the envelope and the events (never the padron or other tables)', () => {
    const text = exportBackup({ claseId: ids.clase, eventos, exportado: '1762300805000-0001-docente1' });
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(['claseId', 'eventos', 'exportado', 'formato', 'v']);
  });

  it('refuses events of another class when exporting', () => {
    expect(() => exportBackup({ claseId: ids.aula, eventos, exportado: '1762300805000-0001-docente1' })).toThrow(/another class/);
  });

  it('rejects files that are not Rikuy backups', () => {
    expect(parseBackup('no es json').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ formato: 'otro', v: 1 })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ formato: 'rikuy-respaldo', v: 1, claseId: ids.clase, exportado: 'x', eventos: [{ id: 1 }] })).ok).toBe(false);
  });

  it('names files after the class code', () => {
    expect(backupFileName('PEND42', new Date('2026-11-05T10:00:00Z'))).toBe('PEND42-2026-11-05.rikuy.json');
  });
});
