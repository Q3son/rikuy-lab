import { describe, expect, it } from 'vitest';
import { OllamaModel } from './ollama.ts';

type Call = { url: string; body: unknown };

function fakeFetch(responses: Record<string, unknown>, calls: Call[] = []) {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const path = new URL(url).pathname;
    if (!(path in responses)) return new Response('nope', { status: 404 });
    return Response.json(responses[path]);
  }) as unknown as typeof fetch;
}

const signal = new AbortController().signal;
const input = { texto: 'gira el péndulo', contexto: { practica: 'pendulo', escena: 'pendulo', pistasUsadas: 0, variables: {} } };

describe('OllamaModel', () => {
  it('pings /api/tags and checks the chat model is pulled', async () => {
    const m = new OllamaModel({ baseUrl: 'http://127.0.0.1:11434', model: 'qwen2.5:3b', fetch: fakeFetch({ '/api/tags': { models: [{ name: 'qwen2.5:3b' }] } }) });
    expect(await m.ping(signal)).toBe(true);
    const missing = new OllamaModel({ baseUrl: 'http://127.0.0.1:11434', model: 'llama3', fetch: fakeFetch({ '/api/tags': { models: [] } }) });
    expect(await missing.ping(signal)).toBe(false);
  });

  it('chats without streaming, with a Socratic system prompt, and returns the text', async () => {
    const calls: Call[] = [];
    const m = new OllamaModel({ baseUrl: 'http://127.0.0.1:11434', model: 'qwen2.5:3b', fetch: fakeFetch({ '/api/chat': { message: { content: ' ¿Qué esperas ver? ' } } }, calls) });
    expect(await m.reply(input, signal)).toEqual({ texto: '¿Qué esperas ver?', comandos: [] });
    const body = calls[0]!.body as { model: string; stream: boolean; messages: Array<{ role: string; content: string }> };
    expect(body.model).toBe('qwen2.5:3b');
    expect(body.stream).toBe(false);
    expect(body.messages[0]!.role).toBe('system');
    expect(body.messages[1]).toEqual({ role: 'user', content: 'gira el péndulo' });
  });

  it('embeds with nomic-embed-text by default', async () => {
    const calls: Call[] = [];
    const m = new OllamaModel({ baseUrl: 'http://127.0.0.1:11434', model: 'x', fetch: fakeFetch({ '/api/embed': { embeddings: [[0.1, 0.2]] } }, calls) });
    expect(await m.embed(['hola'], signal)).toEqual([[0.1, 0.2]]);
    expect(calls[0]!.body).toEqual({ model: 'nomic-embed-text', input: ['hola'] });
  });

  it('throws on HTTP errors so the tutor falls back to rules', async () => {
    const m = new OllamaModel({ baseUrl: 'http://127.0.0.1:11434', model: 'x', fetch: fakeFetch({}) });
    await expect(m.reply(input, signal)).rejects.toThrow();
  });
});
