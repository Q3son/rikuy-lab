/**
 * Bus de mensajes entre dispositivos de una misma sala.
 *  - WebSocket al servidor (dispositivos distintos en la misma red).
 *  - BroadcastChannel (pestañas del mismo navegador, sin servidor).
 * Si el servidor no responde, sigue funcionando en local y reintenta.
 */
import type { BusMessage, Role } from '@rikuy/core';

type Handler = (msg: BusMessage) => void;

export class Bus {
  readonly clientId = Math.random().toString(36).slice(2, 10);
  private ws: WebSocket | null = null;
  private readonly channel: BroadcastChannel;
  private readonly handlers = new Set<Handler>();
  private retry = 1000;
  connected = false;
  onStatus: (connected: boolean) => void = () => {};

  constructor(readonly room: string, readonly role: Role) {
    this.channel = new BroadcastChannel(`rikuy-${room}`);
    this.channel.onmessage = (e) => this.dispatch(e.data as BusMessage);
    this.connect();
  }

  private connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    try {
      this.ws = new WebSocket(`${proto}://${location.host}/ws`);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.connected = true;
      this.retry = 1000;
      this.onStatus(true);
      this.ws!.send(JSON.stringify({ type: 'hello', role: this.role, room: this.room, clientId: this.clientId } satisfies BusMessage));
    };
    this.ws.onmessage = (e) => {
      try {
        this.dispatch(JSON.parse(e.data));
      } catch {
        /* mensaje inválido */
      }
    };
    this.ws.onclose = () => {
      this.connected = false;
      this.onStatus(false);
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    setTimeout(() => this.connect(), this.retry);
    this.retry = Math.min(this.retry * 2, 15000);
  }

  private dispatch(msg: BusMessage) {
    for (const h of this.handlers) h(msg);
  }

  on(handler: Handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(msg: BusMessage) {
    this.channel.postMessage(msg);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
}

export function roomFromUrl(): string {
  const p = new URLSearchParams(location.search);
  return (p.get('sala') ?? localStorageGet('rikuy.sala') ?? 'aula1').toLowerCase();
}

export function localStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function localStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* almacenamiento bloqueado: se ignora */
  }
}
