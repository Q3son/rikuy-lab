/**
 * Presence client of the museum (3.9), pure over an injected realtime port. Sends the own group's position
 * at 4-8 Hz only when it moved (heartbeat every 2 s otherwise), keeps peers of the current room from
 * snapshots and deltas, interpolates 100 ms behind and extrapolates at most 250 ms. Nothing is persisted.
 * No chat: reactions are the closed list of the contract.
 */
import { type MensajeRtHub, type Posicion, RT_BAJA_MS, RT_LATIDO_MS, RT_MAX_HZ, Reaccion } from '@rikuy/contracts';
import type { PuertoPresencia } from './puertos.ts';

const RETRASO_MS = 100;
const EXTRAPOLA_MS = 250;
const MIN_HZ = 4;

export interface PosicionTiles {
  x: number;
  y: number;
  dir: number;
}

export interface ParVisible {
  d: string;
  g: string;
  p: PosicionTiles[];
}

interface Muestra {
  t: number;
  p: Posicion[];
}

interface ParInterno {
  g: string;
  muestras: Muestra[];
  ultimo: number;
}

export interface OpcionesPresencia {
  hz?: number;
  reloj?: () => number;
}

const aWire = (p: PosicionTiles): Posicion => [Math.round(p.x * 10), Math.round(p.y * 10), ((Math.round(p.dir) % 8) + 8) % 8];

export class ClientePresencia {
  readonly hz: number;
  private sala: string | null = null;
  private seq = 0;
  private ultimoEnvio = -Infinity;
  private ultimaSenal = 0;
  private ultimoWire = '';
  private paresSala = new Map<string, ParInterno>();
  private ocupaciones: Record<string, number> = {};
  private readonly reloj: () => number;
  private readonly desuscribir: () => void;

  constructor(
    private readonly puerto: PuertoPresencia,
    opciones: OpcionesPresencia = {},
  ) {
    this.hz = Math.min(RT_MAX_HZ, Math.max(MIN_HZ, opciones.hz ?? 6));
    this.reloj = opciones.reloj ?? (() => Date.now());
    this.desuscribir = puerto.suscribir((m) => this.recibir(m, this.reloj()));
  }

  entrarSala(sala: string, ahora = this.reloj()): void {
    this.sala = sala;
    this.paresSala.clear();
    this.ultimoWire = '';
    this.ultimaSenal = ahora;
    this.puerto.enviar({ t: 'rt.sala', sala });
  }

  actualizar(ahora: number, posiciones: PosicionTiles[]): void {
    if (!this.sala || posiciones.length === 0) return;
    const p = posiciones.slice(0, 8).map(aWire);
    const wire = JSON.stringify(p);
    if (wire !== this.ultimoWire) {
      if (ahora - this.ultimoEnvio < 1000 / this.hz) return;
      this.puerto.enviar({ t: 'rt.mov', s: this.seq++, sala: this.sala, p });
      this.ultimoWire = wire;
      this.ultimoEnvio = ahora;
      this.ultimaSenal = ahora;
    } else if (ahora - this.ultimaSenal >= RT_LATIDO_MS) {
      this.puerto.enviar({ t: 'rt.latido' });
      this.ultimaSenal = ahora;
    }
  }

  reaccionar(g: Reaccion): void {
    this.puerto.enviar({ t: 'rt.gesto', g: Reaccion.parse(g) });
  }

  ocupacion(sala: string): number {
    return this.ocupaciones[sala] ?? 0;
  }

  cerrar(): void {
    this.desuscribir();
  }

  private recibir(m: MensajeRtHub, ahora: number): void {
    switch (m.t) {
      case 'rt.bienvenida':
        this.ocupaciones = { ...m.salas };
        return;
      case 'rt.instantanea':
        if (m.sala !== this.sala) return;
        this.paresSala.clear();
        for (const par of m.pares) this.paresSala.set(par.d, { g: par.g, muestras: [{ t: ahora, p: par.p }], ultimo: ahora });
        this.ocupaciones[m.sala] = m.pares.length;
        return;
      case 'rt.delta':
        if (m.sala !== this.sala) return;
        for (const c of m.cambios) {
          if (c.fuera) {
            this.paresSala.delete(c.d);
            continue;
          }
          const par = this.paresSala.get(c.d);
          if (!c.p) continue;
          if (par) {
            par.muestras.push({ t: ahora, p: c.p });
            if (par.muestras.length > 4) par.muestras.shift();
            par.ultimo = ahora;
          } else {
            this.paresSala.set(c.d, { g: '', muestras: [{ t: ahora, p: c.p }], ultimo: ahora });
          }
        }
        this.ocupaciones[m.sala] = this.paresSala.size;
        return;
      default:
        return;
    }
  }

  /** Peers of the current room at render time (tiles). Drops peers silent for 8 s. */
  pares(ahora = this.reloj()): ParVisible[] {
    const t = ahora - RETRASO_MS;
    const out: ParVisible[] = [];
    for (const [d, par] of this.paresSala) {
      if (ahora - par.ultimo > RT_BAJA_MS) {
        this.paresSala.delete(d);
        continue;
      }
      out.push({ d, g: par.g, p: interpolar(par.muestras, t) });
    }
    return out;
  }
}

function interpolar(muestras: Muestra[], t: number): PosicionTiles[] {
  const ultima = muestras[muestras.length - 1]!;
  const aTiles = (p: Posicion): PosicionTiles => ({ x: p[0] / 10, y: p[1] / 10, dir: p[2] });
  if (muestras.length === 1) return ultima.p.map(aTiles);
  let a = muestras[0]!;
  let b = muestras[1]!;
  if (t >= ultima.t) {
    a = muestras[muestras.length - 2]!;
    b = ultima;
  } else {
    for (let i = 0; i < muestras.length - 1; i++) {
      if (t >= muestras[i]!.t && t <= muestras[i + 1]!.t) {
        a = muestras[i]!;
        b = muestras[i + 1]!;
        break;
      }
    }
    if (t < a.t) return a.p.map(aTiles);
  }
  const dt = b.t - a.t || 1;
  const tLimitado = Math.min(t, b.t + EXTRAPOLA_MS);
  const k = (tLimitado - a.t) / dt;
  return b.p.map((pb, i) => {
    const pa = a.p[i] ?? pb;
    return { x: (pa[0] + (pb[0] - pa[0]) * k) / 10, y: (pa[1] + (pb[1] - pa[1]) * k) / 10, dir: pb[2] };
  });
}
