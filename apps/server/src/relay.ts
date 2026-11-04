/**
 * Relay por salas: todo mensaje que llega de un cliente se reenvía a los
 * demás de la misma sala (display, control y panel del mismo grupo).
 */
import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { BusMessage, Role } from '@rikuy/core';

interface Client {
  ws: WebSocket;
  room: string;
  role: Role;
}

export function attachRelay(server: Server, onEvent: (msg: BusMessage, room: string) => void): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Set<Client>();

  const peersOf = (room: string) => [...clients].filter((c) => c.room === room);
  const announce = (room: string) => {
    const roles = peersOf(room).map((c) => c.role);
    for (const c of peersOf(room)) send(c.ws, { type: 'peers', roles });
  };

  wss.on('connection', (ws) => {
    let me: Client | null = null;

    ws.on('message', (raw) => {
      let msg: BusMessage;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (msg.type === 'hello') {
        me = { ws, room: sanitizeRoom(msg.room), role: msg.role };
        clients.add(me);
        announce(me.room);
        return;
      }
      if (!me) return;
      if (msg.type === 'event') onEvent(msg, me.room);
      for (const c of peersOf(me.room)) if (c.ws !== ws) send(c.ws, msg);
    });

    ws.on('close', () => {
      if (me) {
        clients.delete(me);
        announce(me.room);
      }
    });
  });

  return wss;
}

function send(ws: WebSocket, msg: BusMessage) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function sanitizeRoom(room: string): string {
  return String(room || 'aula').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'aula';
}
