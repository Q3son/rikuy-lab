/**
 * Ollama adapter for the `LocalModel` port (OpenAI-compatible servers are F7's `ai` adapters;
 * this one uses Ollama's native API, which also exposes model listing and embeddings).
 * `fetch` is injected so tests never touch the network.
 */
import type { LocalModel, TutorInput } from './tutor.ts';

export interface OllamaOptions {
  baseUrl: string;
  model: string;
  embedModel?: string;
  fetch?: typeof fetch;
}

const SYSTEM = [
  'Eres Rikuy, tutor de ciencias para estudiantes de secundaria del Perú. Español claro, cálido y breve (máximo 2 oraciones).',
  'Nunca des la respuesta ni la conclusión del experimento: guía con preguntas.',
  'Pide una predicción antes de medir y una justificación después. Si no sabes algo, dilo; no inventes datos.',
].join('\n');

export class OllamaModel implements LocalModel {
  private readonly fetch: typeof fetch;

  constructor(private readonly options: OllamaOptions) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  async ping(signal: AbortSignal): Promise<boolean> {
    const r = await this.get('/api/tags', signal);
    const models = (r as { models?: Array<{ name?: string; model?: string }> }).models ?? [];
    const want = this.options.model;
    return models.some((m) => m.name === want || m.model === want || m.name === `${want}:latest`);
  }

  async reply(input: TutorInput, signal: AbortSignal): Promise<{ texto: string; comandos: unknown[] }> {
    const ctx = input.contexto;
    const r = (await this.post(
      '/api/chat',
      {
        model: this.options.model,
        stream: false,
        options: { temperature: 0.4, num_predict: 120 },
        messages: [
          { role: 'system', content: `${SYSTEM}\nPráctica: ${ctx.practica}. Escena: ${ctx.escena}. Pistas usadas: ${ctx.pistasUsadas}.` },
          { role: 'user', content: input.texto.slice(0, 500) },
        ],
      },
      signal,
    )) as { message?: { content?: string } };
    const texto = r.message?.content?.trim();
    if (!texto) throw new Error('empty reply');
    return { texto, comandos: [] };
  }

  async embed(texts: string[], signal: AbortSignal): Promise<number[][]> {
    const r = (await this.post('/api/embed', { model: this.options.embedModel ?? 'nomic-embed-text', input: texts }, signal)) as { embeddings?: number[][] };
    if (!Array.isArray(r.embeddings)) throw new Error('no embeddings');
    return r.embeddings;
  }

  private async get(path: string, signal: AbortSignal): Promise<unknown> {
    const res = await this.fetch(new URL(path, this.options.baseUrl).href, { signal });
    if (!res.ok) throw new Error(`ollama ${path} ${res.status}`);
    return res.json();
  }

  private async post(path: string, body: unknown, signal: AbortSignal): Promise<unknown> {
    const res = await this.fetch(new URL(path, this.options.baseUrl).href, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw new Error(`ollama ${path} ${res.status}`);
    return res.json();
  }
}
