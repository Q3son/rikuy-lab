import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ids } from '@rikuy/contracts/fixtures';
import { createHub, channelOf, type RunningHub } from './server.ts';
import { macFor } from './discovery.ts';
import { CLASE, eventos } from './testing/eventos.ts';
import { connect, is, type TestClient } from './testing/ws-client.ts';

const running: RunningHub[] = [];
const clients: TestClient[] = [];
afterEach(async () => {
  for (const c of clients.splice(0)) c.close();
  for (const h of running.splice(0)) await h.close();
});

async function start(extra: Partial<Parameters<typeof createHub>[0]> = {}) {
  const hub = await createHub({ dbPath: ':memory:', adminToken: 'teacher-token', ...extra }).listen(0, '127.0.0.1');
  running.push(hub);
  return { hub, base: `http://127.0.0.1:${hub.port}`, wsUrl: `ws://127.0.0.1:${hub.port}/ws` };
}
async function client(url: string) {
  const c = await connect(url);
  clients.push(c);
  return c;
}
const auth = { authorization: 'Bearer teacher-token' };
const KEY = 'class-key-0123456789';
const registerKey = (base: string) =>
  fetch(`${base}/api/clases/${CLASE}/clave`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ claveMac: KEY }),
  });

describe('channel multiplexing', () => {
  it('routes by message shape', () => {
    expect(channelOf({ type: 'hello' })).toBe('bus');
    expect(channelOf({ t: 'rt.mov' })).toBe('rt');
    expect(channelOf({ t: 'hola' })).toBe('sync');
    expect(channelOf({ t: 'other' })).toBeNull();
    expect(channelOf('x')).toBeNull();
  });
});

describe('hologram rooms over the hub', () => {
  it('creates a room with projector and control join links (LAN address, never loopback) and QR codes', async () => {
    const { base, hub } = await start({ interfaces: () => ({ 'Wi-Fi': [{ address: '192.168.1.4', family: 'IPv4', internal: false }] }) });
    const res = await fetch(`${base}/api/holo/salas`, { method: 'POST' });
    expect(res.status).toBe(201);
    const room = (await res.json()) as { codigo: string; proyector: string; control: string; qr: { control: string } };
    const lan = `http://192.168.1.4:${hub.port}`;
    expect(room.proyector).toBe(`${lan}/display.html?sala=${room.codigo}`);
    expect(room.control).toBe(`${lan}/control.html?sala=${room.codigo}`);
    // a phone that reached the hub by another LAN address gets links on that address
    const { app } = createHub({ dbPath: ':memory:' });
    const viaLan = (await (await app.request('/api/holo/salas', { method: 'POST', headers: { host: '10.0.0.9:8787' } })).json()) as { control: string };
    expect(viaLan.control.startsWith('http://10.0.0.9:8787/control.html?sala=')).toBe(true);
    expect(room.qr.control).toContain('<svg');
    const page = await fetch(`${base}/holo/${room.codigo}`);
    expect(await page.text()).toContain(room.codigo);
  });

  it('relays control gestures to the projector and survives a control reconnect', async () => {
    const { base, wsUrl } = await start();
    const { codigo } = (await (await fetch(`${base}/api/holo/salas`, { method: 'POST' })).json()) as { codigo: string };
    const projector = await client(wsUrl);
    projector.send({ type: 'hello', role: 'display', room: codigo, clientId: 'proj' });
    projector.send({ type: 'state', state: { scene: 'pendulo', running: false, variables: {} } });
    await projector.next(is('type', 'peers'));
    const control = await client(wsUrl);
    control.send({ type: 'hello', role: 'control', room: codigo.toUpperCase(), clientId: 'ctl' });
    await control.next(is('type', 'state')); // replayed state
    await projector.next((m) => is('type', 'peers')(m) && (m as { roles: string[] }).roles.length === 2);
    control.send({ type: 'gesture', dx: 0.2, dy: 0, dz: 0, from: 'control' });
    expect(await projector.next(is('type', 'gesture'))).toMatchObject({ dx: 0.2 });

    // the control phone loses wifi without a close frame and reconnects with the same clientId
    const again = await client(wsUrl);
    again.send({ type: 'hello', role: 'control', room: codigo, clientId: 'ctl' });
    await control.closed; // ghost evicted
    again.send({ type: 'gesture', dx: 0.5, dy: 0, dz: 0, from: 'control' });
    expect(await projector.next((m) => is('type', 'gesture')(m) && (m as { dx: number }).dx === 0.5)).toBeTruthy();
    expect(await (await fetch(`${base}/api/holo/salas/${codigo}`)).json()).toEqual({ room: codigo, roles: ['display', 'control'] });
  });
});

describe('museum presence over the hub', () => {
  const hola = (d: string, nonce: string, key = KEY) => ({
    t: 'rt.hola',
    claseId: CLASE,
    dispositivo: d,
    grupoId: ids.grupo1,
    avatares: [],
    mac: macFor(key, nonce),
  });

  it('admits devices with the class MAC and relays moves only within the room', async () => {
    const { base, wsUrl, hub } = await start();
    await registerKey(base);
    const nonce = ((await (await fetch(`${base}/api/hub`)).json()) as { nonce: string }).nonce;
    expect(nonce).toBe(hub.nonce);
    const [a, b, c] = [await client(wsUrl), await client(wsUrl), await client(wsUrl)];
    a.send(hola('GRUPO00001', nonce));
    b.send(hola('GRUPO00002', nonce));
    c.send(hola('GRUPO00003', nonce));
    for (const x of [a, b, c]) await x.next(is('t', 'rt.bienvenida'));
    a.send({ t: 'rt.sala', sala: 'fisica' });
    b.send({ t: 'rt.sala', sala: 'fisica' });
    c.send({ t: 'rt.sala', sala: 'quimica' });
    await a.next(is('t', 'rt.instantanea'));
    await b.next(is('t', 'rt.instantanea'));
    a.send({ t: 'rt.mov', s: 1, sala: 'fisica', p: [[10, 10, 0]] });
    expect(await b.next(is('t', 'rt.delta'))).toMatchObject({ sala: 'fisica', cambios: [{ d: 'GRUPO00001', p: [[10, 10, 0]] }] });
    a.send({ t: 'rt.gesto', g: 'saludar' });
    expect(await b.next(is('t', 'rt.reaccion'))).toEqual({ t: 'rt.reaccion', sala: 'fisica', d: 'GRUPO00001', g: 'saludar' });
    await new Promise((r) => setTimeout(r, 300));
    expect(c.inbox.filter((m) => is('t', 'rt.delta')(m) || is('t', 'rt.reaccion')(m))).toEqual([]);
  });

  it('closes a device with a wrong MAC', async () => {
    const { base, wsUrl, hub } = await start();
    await registerKey(base);
    const a = await client(wsUrl);
    a.send(hola('GRUPO00001', hub.nonce, 'wrong-key-0123456789'));
    await a.closed;
  });

  it('delivers teacher orders sent with the teacher token', async () => {
    const { base, wsUrl } = await start({ open: true });
    const a = await client(wsUrl);
    a.send(hola('GRUPO00001', 'any'));
    await a.next(is('t', 'rt.bienvenida'));
    const order = JSON.stringify({ t: 'rt.orden', o: 'pausar', firma: 'sig' });
    expect((await fetch(`${base}/api/rt/${CLASE}/orden`, { method: 'POST', body: order })).status).toBe(401);
    const ok = await fetch(`${base}/api/rt/${CLASE}/orden`, { method: 'POST', headers: auth, body: order });
    expect(await ok.json()).toEqual({ entregados: 1 });
    expect(await a.next(is('t', 'rt.orden'))).toEqual({ t: 'rt.orden', o: 'pausar', firma: 'sig' });
  });
});

describe('teacher panel, export and HTTP sync', () => {
  it('ingests over HTTP /sync, exposes the panel, a live SSE feed and a JSONL export', async () => {
    const { base } = await start();
    const post = (body: unknown) => fetch(`${base}/sync`, { method: 'POST', body: JSON.stringify(body) });
    const ack = await post({ t: 'delta', claseId: CLASE, eventos: eventos(1, 1, 3), ultimo: true });
    expect(await ack.json()).toEqual([{ t: 'ack', claseId: CLASE, vv: { DEV0000001: 3 } }]);

    expect((await fetch(`${base}/api/clases/${CLASE}/panel`)).status).toBe(401);
    const panel = (await (await fetch(`${base}/api/clases/${CLASE}/panel`, { headers: auth })).json()) as { eventos: number; grupos: unknown[] };
    expect(panel.eventos).toBe(3);
    expect(panel.grupos).toHaveLength(1);

    const sse = await fetch(`${base}/api/clases/${CLASE}/panel/stream?token=teacher-token`);
    const reader = sse.body!.getReader();
    const decoder = new TextDecoder();
    let chunk = '';
    while (!chunk.includes('event: panel')) chunk += decoder.decode((await reader.read()).value);
    await post({ t: 'delta', claseId: CLASE, eventos: eventos(1, 4, 4) });
    chunk = '';
    while (!chunk.includes('"eventos":4')) chunk += decoder.decode((await reader.read()).value);
    await reader.cancel();

    expect((await fetch(`${base}/api/clases/${CLASE}/export.jsonl`)).status).toBe(401);
    const exp = await fetch(`${base}/api/clases/${CLASE}/export.jsonl`, { headers: auth });
    const lines = (await exp.text()).trim().split('\n').map((l) => JSON.parse(l) as { seq: number });
    expect(lines.map((e) => e.seq)).toEqual([1, 2, 3, 4]);

    const hola = await post({ t: 'hola', claseId: CLASE, vv: { DEV0000001: 2 }, capacidades: ['http'] });
    const msgs = (await hola.json()) as Array<{ t: string; eventos?: unknown[] }>;
    expect(msgs.map((m) => m.t)).toEqual(['delta', 'ack']);
    expect(msgs[0]!.eventos).toHaveLength(2);
  });

  it('serves the built web app, including the projector and control pages', async () => {
    const dist = mkdtempSync(join(tmpdir(), 'rikuy-dist-'));
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Rikuy</title>');
    writeFileSync(join(dist, 'display.html'), '<!doctype html><title>Proyector</title>');
    try {
      const { base } = await start({ webDist: dist });
      expect(await (await fetch(`${base}/`)).text()).toContain('<title>Rikuy</title>');
      const display = await fetch(`${base}/display.html?sala=abcde`);
      expect(display.status).toBe(200);
      expect(await display.text()).toContain('Proyector');
      expect((await fetch(`${base}/api/health`)).status).toBe(200);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });

  it('serves discovery with the hub URL as QR', async () => {
    const { base } = await start({ interfaces: () => ({ wlan: [{ address: '192.168.43.1', family: 'IPv4', internal: false }] }) });
    const info = (await (await fetch(`${base}/api/hub`)).json()) as { urls: string[] };
    expect(info.urls[0]).toMatch(/^http:\/\/192\.168\.43\.1:\d+\/$/);
    const page = await (await fetch(`${base}/descubrir`)).text();
    expect(page).toContain('<svg');
    expect(page).toContain(info.urls[0]);
  });

  it('answers the tutor by rules when no local model is configured', async () => {
    const { base } = await start();
    const r = await fetch(`${base}/api/tutor`, { method: 'POST', body: JSON.stringify({ texto: 'dame una pista', contexto: { practica: 'pendulo' } }) });
    expect(await r.json()).toMatchObject({ fuente: 'reglas' });
    expect((await fetch(`${base}/api/ia/embeddings`, { method: 'POST', body: JSON.stringify({ textos: ['a'] }) })).status).toBe(503);
  });
});
