/**
 * Tutor endpoint logic for the hub: an optional local model (Ollama, injected adapter) with the
 * rules agent as the always-available fallback (4.1: the classroom never hangs).
 *
 * Latency guarantee with the model down: a short health probe (default 400 ms) runs before
 * generation, and any failure opens a breaker so the following answers skip the model
 * entirely until `breakerMs` passes. Rules answer in a few milliseconds.
 */
import { rulesAgent, type AgentContext } from '@rikuy/core';
import type { FuenteIA } from '@rikuy/contracts';

export interface TutorInput {
  texto: string;
  contexto: AgentContext;
}

export interface TutorAnswer {
  texto: string;
  comandos: unknown[];
  fuente: Extract<FuenteIA, 'reglas' | 'ia-local'>;
}

/** Port implemented by the Ollama adapter (and by fakes in tests). */
export interface LocalModel {
  ping(signal: AbortSignal): Promise<boolean>;
  reply(input: TutorInput, signal: AbortSignal): Promise<{ texto: string; comandos: unknown[] }>;
  embed?(texts: string[], signal: AbortSignal): Promise<number[][]>;
}

export interface TutorOptions {
  probeTimeoutMs?: number;
  replyTimeoutMs?: number;
  breakerMs?: number;
  now?(): number;
}

export class TutorService {
  private openUntil = 0;
  private readonly probeTimeoutMs: number;
  private readonly replyTimeoutMs: number;
  private readonly breakerMs: number;
  private readonly now: () => number;

  constructor(
    private readonly model: LocalModel | null,
    options: TutorOptions = {},
  ) {
    this.probeTimeoutMs = options.probeTimeoutMs ?? 400;
    this.replyTimeoutMs = options.replyTimeoutMs ?? 8000;
    this.breakerMs = options.breakerMs ?? 30_000;
    this.now = options.now ?? Date.now;
  }

  /** True when the local model is configured and its breaker is closed. */
  get modelAvailable(): boolean {
    return this.model !== null && this.now() >= this.openUntil;
  }

  async answer(input: TutorInput): Promise<TutorAnswer> {
    const model = this.model;
    if (model && this.now() >= this.openUntil) {
      try {
        const up = await withTimeout((s) => model.ping(s), this.probeTimeoutMs);
        if (!up) throw new Error('model down');
        const r = await withTimeout((s) => model.reply(input, s), this.replyTimeoutMs);
        return { texto: r.texto, comandos: r.comandos, fuente: 'ia-local' };
      } catch {
        this.openUntil = this.now() + this.breakerMs;
      }
    }
    return byRules(input);
  }

  async embed(texts: string[]): Promise<number[][] | null> {
    const model = this.model;
    if (!model?.embed || this.now() < this.openUntil) return null;
    try {
      return await withTimeout((s) => model.embed!(texts, s), this.replyTimeoutMs);
    } catch {
      this.openUntil = this.now() + this.breakerMs;
      return null;
    }
  }
}

export function byRules(input: TutorInput): TutorAnswer {
  const r = rulesAgent(input.texto.slice(0, 500), input.contexto);
  return { texto: r.reply, comandos: r.commands, fuente: 'reglas' };
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ctrl.abort();
      reject(new Error('timeout'));
    }, ms);
  });
  try {
    return await Promise.race([run(ctrl.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
