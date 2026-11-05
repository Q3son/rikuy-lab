/**
 * Simulated hub for the realtime port (mock until F8 ships the local hub and its WS client). Moves N peer
 * groups along random BFS paths of the current room and answers with the `rt.*` hub messages of the
 * contract: welcome, room snapshot and 8 Hz deltas. Deterministic (seeded) so tests are stable.
 */
import { type Escena, type PuertoPresencia, type Punto, avanzar, buscarCamino, direccion } from '@rikuy/campus';
import { Apodo, type MensajeRtCliente, type MensajeRtHub, RT_TICK_MS } from '@rikuy/contracts';
import { COLORES_GRUPO } from '../grupo.ts';

export interface GrupoVisible {
  apodo: string;
  color: string;
}

interface Simulado {
  d: string;
  g: string;
  pos: Punto;
  dir: number;
  camino: Punto[];
}

function semilla(n: number) {
  let s = n >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const ULID_BASE = '01JC000000000000000000SM'; // Crockford base32: no I, L, O, U

export class HubSimulado implements PuertoPresencia {
  /** Peer group directory (the real hub gets it from `grupo.unido` events). */
  readonly grupos = new Map<string, GrupoVisible>();
  private oyentes = new Set<(m: MensajeRtHub) => void>();
  private sala: string | null = null;
  private pares: Simulado[] = [];
  private seq = 0;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private readonly azar: () => number;

  constructor(
    private readonly escenas: (sala: string) => Escena | undefined,
    private readonly cuantos: (sala: string) => number,
    opciones: { semilla?: number } = {},
  ) {
    this.azar = semilla(opciones.semilla ?? 7);
  }

  enviar(m: MensajeRtCliente): void {
    if (m.t === 'rt.sala') this.entrar(m.sala);
  }

  suscribir(cb: (m: MensajeRtHub) => void): () => void {
    this.oyentes.add(cb);
    return () => {
      this.oyentes.delete(cb);
      if (this.oyentes.size === 0) this.detener();
    };
  }

  detener(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
  }

  /** One tick of the simulation (exposed for tests). */
  tick(dt = RT_TICK_MS / 1000): void {
    const escena = this.sala ? this.escenas(this.sala) : undefined;
    if (!escena || !this.sala) return;
    const cambios: Extract<MensajeRtHub, { t: 'rt.delta' }>['cambios'] = [];
    for (const s of this.pares) {
      if (!s.camino.length) {
        if (this.azar() < 0.3) continue; // pause a little at the exhibits
        s.camino = this.rumbo(escena, s.pos);
      }
      const r = avanzar(s.pos, s.camino, 2.5, dt);
      s.pos = r.pos;
      s.camino = r.camino;
      if (r.dir !== undefined) s.dir = r.dir;
      cambios.push({ d: s.d, p: [[Math.round(s.pos.x * 10), Math.round(s.pos.y * 10), s.dir]] });
    }
    if (cambios.length) this.emitir({ t: 'rt.delta', sala: this.sala, s: this.seq++, cambios });
  }

  private rumbo(escena: Escena, desde: Punto): Punto[] {
    for (let intento = 0; intento < 6; intento++) {
      const x = Math.floor(this.azar() * escena.mapa.ancho);
      const y = Math.floor(this.azar() * escena.mapa.alto);
      const c = buscarCamino(escena.grilla, desde, (cx, cy) => cx === x && cy === y);
      if (c && c.length) return c.slice(0, 12);
    }
    return [];
  }

  private entrar(sala: string): void {
    this.sala = sala;
    const escena = this.escenas(sala);
    const n = escena ? this.cuantos(sala) : 0;
    this.pares = [];
    const libres: Punto[] = [];
    if (escena) {
      for (let y = 0; y < escena.mapa.alto; y++)
        for (let x = 0; x < escena.mapa.ancho; x++) if (escena.grilla.bloqueada[y * escena.mapa.ancho + x] === 0) libres.push({ x: x + 0.5, y: y + 0.5 });
    }
    for (let i = 0; i < n && libres.length; i++) {
      const d = `SIM${String(i + 2).padStart(7, '0')}`;
      const g = `${ULID_BASE}${String(i + 2).padStart(2, '0')}`;
      const apodo = Apodo.options[(i + 1) % Apodo.options.length]!;
      this.grupos.set(g, { apodo, color: COLORES_GRUPO[i % COLORES_GRUPO.length]! });
      const pos = libres[Math.floor(this.azar() * libres.length)]!;
      this.pares.push({ d, g, pos, dir: direccion(0, 1), camino: [] });
    }
    const salas: Record<string, number> = { [sala]: n };
    this.emitir({ t: 'rt.bienvenida', yo: 'GRUPO00001', salas, hora: Date.now() });
    this.emitir({
      t: 'rt.instantanea',
      sala,
      pares: this.pares.map((s) => ({ d: s.d, g: s.g, p: [[Math.round(s.pos.x * 10), Math.round(s.pos.y * 10), s.dir]] })),
    });
    if (!this.temporizador && typeof setInterval === 'function') this.temporizador = setInterval(() => this.tick(), RT_TICK_MS);
  }

  private emitir(m: MensajeRtHub): void {
    for (const cb of this.oyentes) cb(m);
  }
}
