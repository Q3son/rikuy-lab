/**
 * Almacén de eventos de aprendizaje.
 *
 * Implementación por defecto: un archivo JSONL por sala (sin base de datos,
 * funciona en cualquier laptop del aula). La interfaz permite cambiarlo por
 * PostgreSQL u otro motor sin tocar las rutas.
 */
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { LearningEvent } from '@rikuy/core';

export interface EventStore {
  append(room: string, events: LearningEvent[]): Promise<void>;
  list(room: string): Promise<LearningEvent[]>;
}

export class JsonlEventStore implements EventStore {
  constructor(private readonly dir: string) {}

  private file(room: string) {
    return join(this.dir, `${room.replace(/[^a-z0-9-]/gi, '')}.jsonl`);
  }

  async append(room: string, events: LearningEvent[]): Promise<void> {
    if (!events.length) return;
    await mkdir(this.dir, { recursive: true });
    const lines = events.map((e) => JSON.stringify(stripPersonal(e))).join('\n') + '\n';
    await appendFile(this.file(room), lines, 'utf8');
  }

  async list(room: string): Promise<LearningEvent[]> {
    const f = this.file(room);
    if (!existsSync(f)) return [];
    const text = await readFile(f, 'utf8');
    const seen = new Set<string>();
    const out: LearningEvent[] = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line) as LearningEvent;
        if (seen.has(e.id)) continue; // los clientes reintentan; deduplicar
        seen.add(e.id);
        out.push(e);
      } catch {
        /* línea corrupta: se ignora */
      }
    }
    return out;
  }
}

/** Datos mínimos: el grupo siempre es un seudónimo corto. */
function stripPersonal(e: LearningEvent): LearningEvent {
  return { ...e, grupo: String(e.grupo).slice(0, 12) };
}
