import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readConfig } from './config.ts';

describe('readConfig', () => {
  it('has classroom-friendly defaults', () => {
    const c = readConfig({}, '/repo/apps/hub/src');
    expect(c).toMatchObject({ port: 8787, host: '0.0.0.0', open: false, ollama: null });
    expect(c.dbPath).toBe(resolve('/repo/apps/hub/data/hub.sqlite'));
    expect(c.webDist).toBe(resolve('/repo/apps/web/dist'));
  });

  it('reads the environment', () => {
    const c = readConfig(
      { PORT: '9000', HUB_DATA_DIR: '/data', HUB_OPEN: '1', HUB_TOKEN: 'tok', OLLAMA_URL: 'http://127.0.0.1:11434', OLLAMA_MODEL: 'qwen2.5:3b' },
      '/x',
    );
    expect(c).toMatchObject({ port: 9000, open: true, adminToken: 'tok', ollama: { baseUrl: 'http://127.0.0.1:11434', model: 'qwen2.5:3b' } });
    expect(c.dbPath).toBe(resolve('/data/hub.sqlite'));
  });

  it('rejects an invalid port', () => {
    expect(() => readConfig({ PORT: 'abc' }, '/x')).toThrow(/PORT/);
  });
});
