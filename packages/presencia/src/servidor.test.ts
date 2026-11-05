import { describe, expect, it } from 'vitest';
import { MensajeRtHub, RT_BAJA_MS, RT_MAX_MENSAJES_POR_S, RT_TICK_MS } from '@rikuy/contracts';
import { ids } from '@rikuy/contracts/fixtures';
import { PresenceServer, type Outbound } from './servidor.ts';
import { MensajeRtReaccion } from './propuestas.ts';

const CLASE = ids.clase;
const hola = (d: string, grupoId: string = ids.grupo1) => ({
  t: 'rt.hola',
  claseId: CLASE,
  dispositivo: d,
  grupoId,
  avatares: [ids.estudiante1],
  mac: 'ok',
});
const mov = (s: number, sala: string, x = 10, y = 20) => ({ t: 'rt.mov', s, sala, p: [[x, y, 2]] });

function sent(out: Outbound[], to: string) {
  return out.filter((o) => o.kind === 'send' && o.to === to).map((o) => (o.kind === 'send' ? o.msg : null));
}

function setup(authorize = () => true) {
  const server = new PresenceServer({ authorize });
  return server;
}

function join(server: PresenceServer, conn: string, dispositivo: string, sala: string, now = 0) {
  server.connect(conn, now);
  server.receive(conn, hola(dispositivo), now);
  return server.receive(conn, { t: 'rt.sala', sala }, now);
}

describe('PresenceServer handshake', () => {
  it('welcomes a device with the occupancy of its class and the hub time', () => {
    const server = setup();
    server.connect('c1', 1000);
    const out = server.receive('c1', hola('GRUPO00001'), 1000);
    const [msg] = sent(out, 'c1');
    expect(MensajeRtHub.parse(msg)).toEqual({ t: 'rt.bienvenida', yo: 'GRUPO00001', salas: {}, hora: 1000 });
  });

  it('closes the connection when the class MAC is rejected', () => {
    const server = setup(() => false);
    server.connect('c1', 0);
    const out = server.receive('c1', hola('GRUPO00001'), 0);
    expect(out).toEqual([{ kind: 'close', to: 'c1', reason: 'mac' }]);
  });

  it('ignores every message before rt.hola and every invalid message', () => {
    const server = setup();
    server.connect('c1', 0);
    expect(server.receive('c1', mov(1, 'fisica'), 0)).toEqual([]);
    server.receive('c1', hola('GRUPO00001'), 0);
    expect(server.receive('c1', { t: 'rt.chat', texto: 'hola' }, 0)).toEqual([]);
    expect(server.receive('c1', { ...mov(1, 'fisica'), texto: 'x' }, 0)).toEqual([]);
    expect(server.stats().invalid).toBe(2);
  });

  it('takes over the previous connection of the same device on reconnect', () => {
    const server = setup();
    join(server, 'old', 'GRUPO00001', 'fisica');
    server.connect('new', 10);
    const out = server.receive('new', hola('GRUPO00001'), 10);
    expect(out).toContainEqual({ kind: 'close', to: 'old', reason: 'replaced' });
    expect(server.occupancy(CLASE)).toEqual({});
  });
});

describe('PresenceServer room interest', () => {
  it('sends a snapshot of the peers already in the room when entering it', () => {
    const server = setup();
    join(server, 'a', 'GRUPO00001', 'fisica');
    server.receive('a', mov(1, 'fisica', 5, 6), 0);
    const out = join(server, 'b', 'GRUPO00002', 'fisica');
    expect(sent(out, 'b')).toContainEqual({ t: 'rt.instantanea', sala: 'fisica', pares: [{ d: 'GRUPO00001', g: ids.grupo1, p: [[5, 6, 2]] }] });
  });

  it('aggregates moves per room per tick and only to the same room', () => {
    const server = setup();
    join(server, 'a', 'GRUPO00001', 'fisica');
    join(server, 'b', 'GRUPO00002', 'fisica');
    join(server, 'c', 'GRUPO00003', 'quimica');
    server.receive('a', mov(1, 'fisica', 1, 1), 10);
    server.receive('a', mov(2, 'fisica', 2, 2), 20);
    const out = server.tick(RT_TICK_MS);
    const toB = sent(out, 'b');
    expect(toB).toHaveLength(1);
    expect(MensajeRtHub.parse(toB[0])).toEqual({ t: 'rt.delta', sala: 'fisica', s: 1, cambios: [{ d: 'GRUPO00001', p: [[2, 2, 2]] }] });
    expect(sent(out, 'a')).toEqual([]); // own moves are not echoed
    expect(sent(out, 'c')).toEqual([]); // other room
  });

  it('reports occupancy per room for the class', () => {
    const server = setup();
    join(server, 'a', 'GRUPO00001', 'fisica');
    join(server, 'b', 'GRUPO00002', 'fisica');
    join(server, 'c', 'GRUPO00003', 'quimica');
    expect(server.occupancy(CLASE)).toEqual({ fisica: 2, quimica: 1 });
  });

  it('announces a peer leaving the room with fuera', () => {
    const server = setup();
    join(server, 'a', 'GRUPO00001', 'fisica');
    join(server, 'b', 'GRUPO00002', 'fisica');
    server.receive('a', mov(1, 'fisica'), 0);
    server.tick(RT_TICK_MS);
    server.receive('a', { t: 'rt.sala', sala: 'quimica' }, 200);
    const out = server.tick(2 * RT_TICK_MS);
    expect(sent(out, 'b')).toEqual([{ t: 'rt.delta', sala: 'fisica', s: 2, cambios: [{ d: 'GRUPO00001', fuera: true }] }]);
  });

  it('drops out-of-order moves', () => {
    const server = setup();
    join(server, 'a', 'GRUPO00001', 'fisica');
    join(server, 'b', 'GRUPO00002', 'fisica');
    server.receive('a', mov(5, 'fisica', 5, 5), 0);
    server.receive('a', mov(4, 'fisica', 4, 4), 1);
    const out = server.tick(RT_TICK_MS);
    expect(sent(out, 'b')).toEqual([{ t: 'rt.delta', sala: 'fisica', s: 1, cambios: [{ d: 'GRUPO00001', p: [[5, 5, 2]] }] }]);
  });
});

describe('PresenceServer liveness and limits', () => {
  it('drops a silent peer after RT_BAJA_MS and keeps the ones sending heartbeats', () => {
    const server = setup();
    join(server, 'a', 'GRUPO00001', 'fisica', 0);
    join(server, 'b', 'GRUPO00002', 'fisica', 0);
    server.receive('b', { t: 'rt.latido' }, RT_BAJA_MS - 100);
    const out = server.tick(RT_BAJA_MS + 1);
    expect(out).toContainEqual({ kind: 'close', to: 'a', reason: 'silence' });
    expect(server.occupancy(CLASE)).toEqual({ fisica: 1 });
  });

  it(`discards messages above ${RT_MAX_MENSAJES_POR_S} per second per connection`, () => {
    const server = setup();
    join(server, 'a', 'GRUPO00001', 'fisica', 0); // hola + sala = 2 messages
    for (let i = 1; i <= 30; i++) server.receive('a', mov(i, 'fisica', i, i), 100);
    expect(server.stats().throttled).toBe(30 - (RT_MAX_MENSAJES_POR_S - 2));
    server.receive('a', mov(31, 'fisica', 31, 31), 1200); // new window
    expect(server.stats().throttled).toBe(30 - (RT_MAX_MENSAJES_POR_S - 2));
  });
});

describe('PresenceServer reactions and teacher authority', () => {
  it('relays a closed-list reaction to the others in the same room only', () => {
    const server = setup();
    join(server, 'a', 'GRUPO00001', 'fisica');
    join(server, 'b', 'GRUPO00002', 'fisica');
    join(server, 'c', 'GRUPO00003', 'quimica');
    const out = server.receive('a', { t: 'rt.gesto', g: 'aplaudir' }, 0);
    const [toB] = sent(out, 'b');
    expect(MensajeRtReaccion.parse(toB)).toEqual({ t: 'rt.reaccion', sala: 'fisica', d: 'GRUPO00001', g: 'aplaudir' });
    expect(sent(out, 'a')).toEqual([]);
    expect(sent(out, 'c')).toEqual([]);
  });

  it('broadcasts a teacher order to the whole class or to one room', () => {
    const server = setup();
    join(server, 'a', 'GRUPO00001', 'fisica');
    join(server, 'c', 'GRUPO00003', 'quimica');
    const all = server.order(CLASE, { t: 'rt.orden', o: 'pausar', firma: 'sig' });
    expect(sent(all, 'a')).toHaveLength(1);
    expect(sent(all, 'c')).toHaveLength(1);
    const one = server.order(CLASE, { t: 'rt.orden', o: 'reunir', sala: 'quimica', firma: 'sig' });
    expect(sent(one, 'a')).toEqual([]);
    expect(sent(one, 'c')).toEqual([{ t: 'rt.orden', o: 'reunir', sala: 'quimica', firma: 'sig' }]);
  });

  it('lists who is where for the teacher panel', () => {
    const server = setup();
    join(server, 'a', 'GRUPO00001', 'fisica');
    expect(server.roster(CLASE)).toEqual([{ dispositivo: 'GRUPO00001', grupoId: ids.grupo1, sala: 'fisica' }]);
  });
});
