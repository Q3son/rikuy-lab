/**
 * Registro de eventos de aprendizaje con cola sin conexión.
 * Los eventos se guardan en el dispositivo y se sincronizan cuando hay red.
 */
import type { LearningEvent } from '@rikuy/core';
import { localStorageGet, localStorageSet, type Bus } from '../net/bus.ts';

const KEY = 'rikuy.cola';

export class Tracker {
  constructor(private readonly bus: Bus, public grupo: string, public practica = 'lactasa') {
    setInterval(() => void this.flush(), 5000);
    window.addEventListener('online', () => void this.flush());
  }

  log(partial: Omit<LearningEvent, 'id' | 'ts' | 'grupo' | 'practica'>): LearningEvent {
    const event: LearningEvent = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      ts: new Date().toISOString(),
      grupo: this.grupo,
      practica: this.practica,
      ...partial,
    };
    const queue = this.queue();
    queue.push(event);
    localStorageSet(KEY, JSON.stringify(queue.slice(-1000)));
    this.bus.send({ type: 'event', event });
    return event;
  }

  private queue(): LearningEvent[] {
    try {
      return JSON.parse(localStorageGet(KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  async flush() {
    const queue = this.queue();
    if (!queue.length) return;
    try {
      const res = await fetch(`/api/events?room=${encodeURIComponent(this.bus.room)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ events: queue }),
      });
      if (res.ok) localStorageSet(KEY, '[]');
    } catch {
      /* sin red: se reintenta luego */
    }
  }
}
