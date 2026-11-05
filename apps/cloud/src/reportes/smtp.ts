/**
 * Minimal SMTP client (node:net / node:tls) so the gateway needs no extra dependency: EHLO, optional STARTTLS,
 * AUTH PLAIN, MAIL FROM / RCPT TO / DATA. Credentials are never sent in clear text unless explicitly allowed
 * (`permitirSinTls`, for a local test server). Header injection is blocked: no CR/LF in addresses or the subject.
 */
import { err, ok, type FalloEntrega, type Result } from '@rikuy/mensajeria';
import { randomUUID } from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';
import { direccionValida, sinSaltos, type CorreoSaliente, type ProveedorCorreo } from './correo.ts';

export interface OpcionesSmtp {
  host: string;
  port: number;
  /** Implicit TLS (port 465). */
  secure?: boolean;
  /** Upgrade with STARTTLS when the server offers it (default true). */
  starttls?: boolean;
  usuario?: string;
  clave?: string;
  de: string;
  /** Only for a local test server: allows sending without TLS and sending credentials in clear text. */
  permitirSinTls?: boolean;
  timeoutMs?: number;
  nombreCliente?: string;
}

interface Respuesta {
  codigo: number;
  lineas: string[];
}

class FalloSmtp extends Error {
  constructor(
    readonly paso: string,
    readonly codigo: number,
  ) {
    super(`SMTP ${paso}: ${codigo}`);
  }
}

class Canal {
  private buffer = '';
  private cola: Respuesta[] = [];
  private pendiente?: { resolver: (r: Respuesta) => void; rechazar: (e: Error) => void };
  private error?: Error;
  private lineasParciales: string[] = [];

  constructor(
    public socket: net.Socket | tls.TLSSocket,
    private readonly timeoutMs: number,
  ) {
    this.escuchar();
  }

  private escuchar() {
    const s = this.socket;
    s.setTimeout(this.timeoutMs, () => s.destroy(new Error('timeout')));
    s.on('data', (d) => {
      this.buffer += d.toString('utf8');
      let i: number;
      while ((i = this.buffer.indexOf('\r\n')) !== -1) {
        const linea = this.buffer.slice(0, i);
        this.buffer = this.buffer.slice(i + 2);
        this.lineasParciales.push(linea);
        if (/^\d{3}( |$)/.test(linea)) {
          this.entregar({ codigo: Number(linea.slice(0, 3)), lineas: this.lineasParciales });
          this.lineasParciales = [];
        }
      }
    });
    s.on('error', (e) => this.fallar(e));
    s.on('close', () => this.fallar(new Error('closed')));
  }

  private entregar(r: Respuesta) {
    if (this.pendiente) {
      const p = this.pendiente;
      this.pendiente = undefined;
      p.resolver(r);
    } else this.cola.push(r);
  }
  private fallar(e: Error) {
    this.error ??= e;
    if (this.pendiente) {
      const p = this.pendiente;
      this.pendiente = undefined;
      p.rechazar(e);
    }
  }

  leer(): Promise<Respuesta> {
    const r = this.cola.shift();
    if (r) return Promise.resolve(r);
    if (this.error) return Promise.reject(this.error);
    return new Promise((resolver, rechazar) => (this.pendiente = { resolver, rechazar }));
  }

  async comando(linea: string, paso: string, esperados: number[]): Promise<Respuesta> {
    this.socket.write(`${linea}\r\n`);
    return this.exigir(paso, esperados);
  }
  async exigir(paso: string, esperados: number[]): Promise<Respuesta> {
    const r = await this.leer();
    if (!esperados.includes(r.codigo)) throw new FalloSmtp(paso, r.codigo);
    return r;
  }

  /** Replaces the socket with its TLS-upgraded version (STARTTLS). */
  async mejorarATls(host: string): Promise<void> {
    const viejo = this.socket;
    viejo.removeAllListeners('data');
    viejo.removeAllListeners('close');
    viejo.removeAllListeners('error');
    this.buffer = '';
    this.cola = [];
    this.error = undefined;
    const nuevo = tls.connect({ socket: viejo, servername: host });
    await new Promise<void>((res, rej) => {
      nuevo.once('secureConnect', () => res());
      nuevo.once('error', rej);
    });
    this.socket = nuevo;
    this.escuchar();
  }
}

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const lineas76 = (s: string) => s.replace(/(.{76})/g, '$1\r\n');

export function construirMensaje(de: string, c: CorreoSaliente, dominio: string): { id: string; datos: string } {
  const id = `<${randomUUID()}@${dominio}>`;
  const limite = `rikuy-${randomUUID()}`;
  const cab = [
    `From: ${de}`,
    `To: ${c.para}`,
    `Subject: =?UTF-8?B?${b64(sinSaltos(c.asunto))}?=`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${id}`,
    'MIME-Version: 1.0',
    ...Object.entries(c.cabeceras ?? {}).map(([k, v]) => `${sinSaltos(k)}: ${sinSaltos(v)}`),
  ];
  const parte = (tipo: string, cuerpo: string) => `Content-Type: ${tipo}; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${lineas76(b64(cuerpo))}\r\n`;
  const cuerpo = c.html
    ? `Content-Type: multipart/alternative; boundary="${limite}"\r\n\r\n--${limite}\r\n${parte('text/plain', c.texto)}--${limite}\r\n${parte('text/html', c.html)}--${limite}--\r\n`
    : parte('text/plain', c.texto);
  return { id, datos: `${cab.join('\r\n')}\r\n${cuerpo}` };
}

export class ProveedorCorreoSmtp implements ProveedorCorreo {
  readonly nombre = 'smtp';
  constructor(private readonly o: OpcionesSmtp) {}

  async enviar(c: CorreoSaliente): Promise<Result<{ id: string }, FalloEntrega>> {
    const direccionDe = /<([^>]+)>/.exec(this.o.de)?.[1] ?? this.o.de;
    if (!direccionValida(c.para)) return err({ tipo: 'rebote', detalle: 'La dirección de correo no es válida.' });
    if (!direccionValida(direccionDe) || /[\r\n]/.test(this.o.de)) return err({ tipo: 'proveedor', detalle: 'El remitente configurado no es válido.' });
    const timeout = this.o.timeoutMs ?? 15_000;
    let canal: Canal | undefined;
    try {
      const socket = await new Promise<net.Socket | tls.TLSSocket>((res, rej) => {
        const s = this.o.secure ? tls.connect({ host: this.o.host, port: this.o.port, servername: this.o.host }) : net.connect({ host: this.o.host, port: this.o.port });
        s.once(this.o.secure ? 'secureConnect' : 'connect', () => res(s));
        s.once('error', rej);
      });
      canal = new Canal(socket, timeout);
      await canal.exigir('saludo', [220]);
      const nombre = this.o.nombreCliente ?? 'rikuy-cloud';
      let ehlo = await canal.comando(`EHLO ${nombre}`, 'ehlo', [250]);
      let cifrado = !!this.o.secure;
      if (!cifrado && this.o.starttls !== false && ehlo.lineas.some((l) => /STARTTLS/i.test(l))) {
        await canal.comando('STARTTLS', 'starttls', [220]);
        await canal.mejorarATls(this.o.host);
        cifrado = true;
        ehlo = await canal.comando(`EHLO ${nombre}`, 'ehlo', [250]);
      }
      if (!cifrado && !this.o.permitirSinTls) return err({ tipo: 'proveedor', detalle: 'El servidor SMTP no ofrece TLS; no se envía sin cifrar.' });
      if (this.o.usuario) {
        await canal.comando(`AUTH PLAIN ${b64(`\0${this.o.usuario}\0${this.o.clave ?? ''}`)}`, 'auth', [235]);
      }
      await canal.comando(`MAIL FROM:<${direccionDe}>`, 'mail', [250]);
      try {
        await canal.comando(`RCPT TO:<${c.para}>`, 'rcpt', [250, 251]);
      } catch (e) {
        if (e instanceof FalloSmtp && e.codigo >= 500) return err({ tipo: 'rebote', detalle: 'El servidor rechazó al destinatario.' });
        throw e;
      }
      await canal.comando('DATA', 'data', [354]);
      const dominio = direccionDe.split('@')[1] ?? 'rikuy.local';
      const { id, datos } = construirMensaje(this.o.de, c, dominio);
      canal.socket.write(`${datos}\r\n.\r\n`);
      await canal.exigir('fin-de-datos', [250]);
      canal.socket.write('QUIT\r\n');
      return ok({ id });
    } catch (e) {
      if (e instanceof FalloSmtp) return err({ tipo: e.codigo >= 500 ? 'proveedor' : 'proveedor', detalle: `El servidor SMTP respondió ${e.codigo} en ${e.paso}.` });
      return err({ tipo: 'sin_red', detalle: 'No se pudo conectar con el servidor SMTP.' });
    } finally {
      canal?.socket.destroy();
    }
  }
}
