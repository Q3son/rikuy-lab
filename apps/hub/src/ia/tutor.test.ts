import { describe, expect, it } from 'vitest';
import { TutorService, type LocalModel } from './tutor.ts';

const input = { texto: 'quiero ver el pendulo', contexto: { practica: 'pendulo', escena: 'pendulo', pistasUsadas: 0, variables: {} } };

function model(over: Partial<LocalModel> = {}): LocalModel {
  return {
    ping: async () => true,
    reply: async () => ({ texto: '¿Qué crees que pasará?', comandos: [] }),
    ...over,
  };
}

const hang = () => new Promise<never>(() => {});

describe('TutorService', () => {
  it('answers with the local model when it is up', async () => {
    const tutor = new TutorService(model());
    expect(await tutor.answer(input)).toMatchObject({ texto: '¿Qué crees que pasará?', fuente: 'ia-local' });
  });

  it('answers by rules when there is no local model', async () => {
    const r = await new TutorService(null).answer(input);
    expect(r.fuente).toBe('reglas');
    expect(r.texto.length).toBeGreaterThan(0);
  });

  it('answers by rules in under 1 s when Ollama refuses the connection', async () => {
    const tutor = new TutorService(model({ ping: async () => { throw new Error('ECONNREFUSED'); } }));
    const t0 = performance.now();
    const r = await tutor.answer(input);
    expect(r.fuente).toBe('reglas');
    expect(performance.now() - t0).toBeLessThan(1000);
  });

  it('answers by rules in under 1 s when Ollama hangs (unreachable host)', async () => {
    const tutor = new TutorService(model({ ping: hang, reply: hang }), { probeTimeoutMs: 300 });
    const t0 = performance.now();
    const r = await tutor.answer(input);
    expect(r.fuente).toBe('reglas');
    expect(performance.now() - t0).toBeLessThan(1000);
  });

  it('opens the breaker after a failure: next answers skip the model entirely', async () => {
    let calls = 0;
    const tutor = new TutorService(model({ reply: async () => { calls++; throw new Error('500'); } }));
    expect((await tutor.answer(input)).fuente).toBe('reglas');
    expect((await tutor.answer(input)).fuente).toBe('reglas');
    expect(calls).toBe(1);
  });

  it('closes the breaker after breakerMs', async () => {
    let now = 0;
    let fail = true;
    const tutor = new TutorService(model({ reply: async () => { if (fail) throw new Error('x'); return { texto: 'ok', comandos: [] }; } }), { breakerMs: 1000, now: () => now });
    await tutor.answer(input);
    fail = false;
    now = 1001;
    expect((await tutor.answer(input)).fuente).toBe('ia-local');
  });

  it('falls back to rules when generation exceeds the reply timeout', async () => {
    const tutor = new TutorService(model({ reply: hang }), { replyTimeoutMs: 50 });
    expect((await tutor.answer(input)).fuente).toBe('reglas');
  });
});
