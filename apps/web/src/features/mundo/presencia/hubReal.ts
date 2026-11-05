/**
 * Presence over the F8 hub: `PuertoPresencia` on @rikuy/presencia's ReconnectingSocket (`/ws`, `rt.*`).
 * Every (re)connection starts with `rt.hola` signed with HMAC-SHA256(class key, hub nonce); without a
 * class key yet (no QR join) it sends `demo`, which only a hub in demo mode admits.
 */
import type { MensajeRtCliente, MensajeRtHub } from '@rikuy/contracts';
import type { PuertoPresencia } from '@rikuy/campus';
import { ReconnectingSocket, type SocketLike } from '@rikuy/presencia';

export interface DatosHola {
  claseId: string;
  grupoId: string;
  dispositivo: string;
  nonce: string;
  claveMac?: string;
}

const base64Url = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function macHola(claveMac: string, nonce: string): Promise<string> {
  const te = new TextEncoder();
  const clave = await crypto.subtle.importKey('raw', te.encode(claveMac), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64Url(await crypto.subtle.sign('HMAC', clave, te.encode(nonce)));
}

export class PresenciaHub implements PuertoPresencia {
  private readonly oyentes = new Set<(m: MensajeRtHub) => void>();
  private readonly socket: ReconnectingSocket;

  constructor(url: string, datos: DatosHola, abrir: (url: string) => SocketLike = (u) => new WebSocket(u) as unknown as SocketLike) {
    this.socket = new ReconnectingSocket({
      open: () => abrir(url),
      onOpen: (send) => {
        void (datos.claveMac ? macHola(datos.claveMac, datos.nonce) : Promise.resolve('demo')).then((mac) =>
          send({ t: 'rt.hola', claseId: datos.claseId, dispositivo: datos.dispositivo, grupoId: datos.grupoId, avatares: [datos.grupoId], mac } satisfies MensajeRtCliente),
        );
      },
      onMessage: (m) => {
        if (m && typeof m === 'object' && String((m as { t?: unknown }).t).startsWith('rt.')) for (const o of this.oyentes) o(m as MensajeRtHub);
      },
      staleMs: 20_000,
    });
  }

  enviar(mensaje: MensajeRtCliente): void {
    this.socket.send(mensaje);
  }

  suscribir(alRecibir: (m: MensajeRtHub) => void): () => void {
    this.oyentes.add(alRecibir);
    return () => this.oyentes.delete(alRecibir);
  }

  detener(): void {
    this.socket.close();
  }
}
