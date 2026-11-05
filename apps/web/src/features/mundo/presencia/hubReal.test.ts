import { createHmac } from 'node:crypto';
import type { SocketLike } from '@rikuy/presencia';
import { describe, expect, it, vi } from 'vitest';
import { macHola, PresenciaHub } from './hubReal.ts';

class FakeSocket implements SocketLike {
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  send(d: string) {
    this.sent.push(d);
  }
  close() {}
}

const datos = { claseId: '01JC0000000000000000000C01', grupoId: '01JC0000000000000000000G02', dispositivo: 'ABCDEFGHJK', nonce: 'n0nce' };

describe('PresenciaHub (F8 rt.* over ReconnectingSocket)', () => {
  it('signs rt.hola like the hub checks it: HMAC-SHA256(class key, nonce), base64url', async () => {
    expect(await macHola('secreto', 'n0nce')).toBe(createHmac('sha256', 'secreto').update('n0nce').digest('base64url'));
  });

  it('says hello on open, forwards rt.* messages and sends positions', async () => {
    const s = new FakeSocket();
    const hub = new PresenciaHub('wss://hub/ws', { ...datos, claveMac: 'secreto' }, () => s);
    const recibidos: unknown[] = [];
    hub.suscribir((m) => recibidos.push(m));
    s.onopen?.();
    await vi.waitFor(() => expect(s.sent).toHaveLength(1));
    expect(JSON.parse(s.sent[0]!)).toMatchObject({ t: 'rt.hola', claseId: datos.claseId, grupoId: datos.grupoId, avatares: [datos.grupoId] });
    s.onmessage?.({ data: JSON.stringify({ t: 'rt.pares', sala: 'vestibulo', pares: [] }) });
    s.onmessage?.({ data: JSON.stringify({ type: 'state' }) });
    expect(recibidos).toHaveLength(1);
    hub.enviar({ t: 'rt.latido' });
    expect(JSON.parse(s.sent[1]!)).toEqual({ t: 'rt.latido' });
    hub.detener();
  });
});
