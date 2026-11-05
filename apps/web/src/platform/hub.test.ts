import { describe, expect, it } from 'vitest';
import { consultarHub } from './hub.ts';

const respuesta = (cuerpo: unknown, ok = true) => async () => ({ ok, json: async () => cuerpo });

describe('consultarHub', () => {
  it('recognises the Rikuy hub by its api/hub answer, next to the page (hash routes ignored)', async () => {
    let pedida = '';
    const info = await consultarHub('https://192.168.1.5:8787/app/#/holo', async (u) => {
      pedida = u;
      return respuesta({ nombre: 'Rikuy hub', urls: [], nonce: 'n', ws: '/ws' })();
    });
    expect(pedida).toBe('https://192.168.1.5:8787/app/api/hub');
    expect(info?.ws).toBe('/ws');
  });

  it('says "no hub" on static hosting, errors and anything that is not the hub', async () => {
    expect(await consultarHub('https://x/', respuesta(null, false))).toBeNull();
    expect(await consultarHub('https://x/', respuesta({ nombre: 'otro' }))).toBeNull();
    expect(await consultarHub('https://x/', async () => Promise.reject(new Error('offline')))).toBeNull();
  });
});
