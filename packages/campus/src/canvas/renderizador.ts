/**
 * Canvas 2D world renderer (1.3, DESIGN.md 7.4). Floors and static decoration are pre-rendered into
 * 16x16-tile chunks once per scene and blitted with drawImage; each frame only redraws avatars, Rikuy,
 * the curator and the BFS trail. All art is procedural (original, no bitmaps): flat planes, hard edges,
 * no gradients, no blur. Internal resolution is capped at devicePixelRatio 1.5.
 */
import { TAM_CHUNK, chunksVisibles } from '../caminante.ts';
import type { Escena } from '../generador.ts';
import type { AvatarRender, EstadoRender, RenderizadorMundo } from '../puertos.ts';

export const TILE_CSS = 32;
const DPR_MAX = 1.5;

export interface Paleta {
  bg: string;
  surface: string;
  ink: string;
  ink2: string;
  sol: string;
  foton: string;
  primary: string;
  /** Colour of the current hall (vestibule: primary). */
  hall: string;
  hallTint: string;
  /** Lintel colour per hall id (vestibule doors). */
  salas: Record<string, string>;
}

type Lienzo = HTMLCanvasElement | OffscreenCanvas;
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function crearLienzo(ancho: number, alto: number): Lienzo {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(ancho, alto);
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  return c;
}

function rombo(ctx: Ctx, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
}

function dibujarTile(ctx: Ctx, gid: number, muro: number, x: number, y: number, t: number, p: Paleta) {
  if (muro) {
    ctx.fillStyle = p.ink2;
    ctx.fillRect(x, y, t, t);
    return;
  }
  switch (gid) {
    case 0:
      ctx.fillStyle = p.bg;
      ctx.fillRect(x, y, t, t);
      return;
    case 2:
      ctx.fillStyle = p.hallTint;
      ctx.fillRect(x, y, t, t);
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = p.hall;
      ctx.fillRect(x, y, t, t);
      ctx.globalAlpha = 1;
      return;
    case 3:
      ctx.fillStyle = p.surface;
      ctx.fillRect(x, y, t, t);
      return;
    case 4:
      ctx.fillStyle = p.surface;
      ctx.fillRect(x, y, t, t);
      ctx.fillStyle = p.sol;
      rombo(ctx, x + t / 2, y + t / 2, t / 4);
      return;
    case 6:
      ctx.fillStyle = p.surface;
      ctx.fillRect(x, y, t, t);
      ctx.strokeStyle = p.sol;
      ctx.lineWidth = Math.max(1, t / 10);
      ctx.strokeRect(x + 1, y + 1, t - 2, t - 2);
      return;
    default:
      ctx.fillStyle = p.hallTint;
      ctx.fillRect(x, y, t, t);
  }
}

function dibujarObjetosEstaticos(ctx: Ctx, escena: Escena, t: number, p: Paleta, ox: number, oy: number) {
  for (const o of escena.mapa.objetos) {
    const x = (o.x - ox) * t;
    const y = (o.y - oy) * t;
    const w = o.ancho * t;
    const h = o.alto * t;
    if (o.tipo === 'puerta') {
      const salaId = typeof o.props.salaId === 'string' ? o.props.salaId : '';
      ctx.fillStyle = p.salas[salaId] ?? p.hall;
      // lintel: a band on the door tiles
      ctx.fillRect(x, y, w, Math.max(4, h / 3));
    } else if (o.tipo === 'pedestal' && (o.props.exhibicionId || o.props.retoId)) {
      ctx.strokeStyle = p.hall;
      ctx.lineWidth = t / 6;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = p.foton;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, t / 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.tipo === 'pedestal') {
      ctx.strokeStyle = p.ink2;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x + t / 4, y + t / 4, w - t / 2, h - t / 2);
      ctx.setLineDash([]);
    } else if (o.tipo === 'interactivo') {
      ctx.fillStyle = p.ink;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = p.foton;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    } else if (o.tipo === 'reja' && o.props.bloquea) {
      ctx.fillStyle = p.ink2;
      for (let i = 0; i < 5; i++) ctx.fillRect(x + (i * w) / 5 + w / 20, y, w / 14, h);
      ctx.fillRect(x, y + h / 2 - 2, w, 4);
    }
  }
}

/** Rikuy: river stone with one eye hanging from an amber knotted cord (DESIGN.md 6). */
export function dibujarRikuy(ctx: Ctx, cx: number, cy: number, t: number, angulo: number, colores?: { cordon?: string; marco?: string }) {
  ctx.save();
  ctx.translate(cx, cy - t * 0.9);
  ctx.rotate(angulo);
  const cordon = colores?.cordon ?? '#F5B301';
  ctx.strokeStyle = cordon;
  ctx.lineWidth = t / 10;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, t * 0.55);
  ctx.stroke();
  ctx.fillStyle = cordon;
  ctx.beginPath();
  ctx.arc(0, t * 0.3, t / 9, 0, Math.PI * 2);
  ctx.fill();
  // body
  ctx.fillStyle = '#0B6574';
  ctx.strokeStyle = colores?.marco ?? '#052A31';
  ctx.lineWidth = t / 14;
  ctx.beginPath();
  ctx.ellipse(0, t * 0.95, t * 0.36, t * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // eye
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, t * 0.98, t * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#19CBEE';
  ctx.beginPath();
  ctx.arc(0, t * 0.98, t * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0D2B33';
  ctx.beginPath();
  ctx.arc(0, t * 0.98, t * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function sombra(ctx: Ctx, cx: number, cy: number, t: number, ink: string) {
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(cx, cy + t * 0.38, t * 0.4, t * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function dibujarAvatar(ctx: Ctx, a: AvatarRender, cx: number, cy: number, t: number, p: Paleta) {
  sombra(ctx, cx, cy, t, p.ink);
  ctx.fillStyle = a.color;
  ctx.strokeStyle = a.marco ?? p.ink;
  ctx.lineWidth = a.propio ? t / 8 : t / 14;
  ctx.beginPath();
  ctx.arc(cx, cy, t * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // members: small dots around the group token
  ctx.fillStyle = p.surface;
  const n = Math.min(a.integrantes, 8);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(ang) * t * 0.2, cy + Math.sin(ang) * t * 0.2, t * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  // facing tick
  const ang = (a.dir / 8) * Math.PI * 2;
  ctx.strokeStyle = p.surface;
  ctx.lineWidth = t / 14;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ang) * t * 0.3, cy + Math.sin(ang) * t * 0.3);
  ctx.stroke();
  if (a.pideAyuda) {
    // help flag: a Sol pennant above the avatar (shape + colour)
    ctx.fillStyle = p.sol;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + t * 0.2, cy - t * 0.9);
    ctx.lineTo(cx + t * 0.6, cy - t * 0.75);
    ctx.lineTo(cx + t * 0.2, cy - t * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + t * 0.2, cy - t * 0.9);
    ctx.lineTo(cx + t * 0.2, cy - t * 0.3);
    ctx.stroke();
  }
}

function dibujarCurador(ctx: Ctx, cx: number, cy: number, t: number, p: Paleta) {
  sombra(ctx, cx, cy, t, p.ink);
  ctx.fillStyle = p.ink;
  ctx.fillRect(cx - t * 0.25, cy - t * 0.2, t * 0.5, t * 0.55);
  ctx.beginPath();
  ctx.arc(cx, cy - t * 0.38, t * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.hall; // sash in the hall colour
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.6);
  ctx.fillRect(-t * 0.35, -t * 0.06, t * 0.7, t * 0.12);
  ctx.restore();
}

export interface OpcionesCanvas {
  paleta: (escena: Escena) => Paleta;
  dpr?: number;
}

export function crearRenderizadorCanvas(canvas: HTMLCanvasElement, opciones: OpcionesCanvas): RenderizadorMundo {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is not available');
  const dpr = Math.min(opciones.dpr ?? (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1), DPR_MAX);
  const tile = TILE_CSS * dpr;
  let vista = { ancho: 11, alto: 14 };
  let cacheEscena: Escena | null = null;
  let cacheRejaAbierta = false;
  let chunks = new Map<string, Lienzo>();
  let paleta: Paleta | null = null;

  function chunk(escena: Escena, cx: number, cy: number): Lienzo {
    const k = `${cx},${cy}`;
    const hecho = chunks.get(k);
    if (hecho) return hecho;
    const p = paleta!;
    const lienzo = crearLienzo(TAM_CHUNK * tile, TAM_CHUNK * tile);
    const c = lienzo.getContext('2d') as Ctx;
    const { mapa } = escena;
    for (let ty = 0; ty < TAM_CHUNK; ty++) {
      for (let tx = 0; tx < TAM_CHUNK; tx++) {
        const mx = cx * TAM_CHUNK + tx;
        const my = cy * TAM_CHUNK + ty;
        if (mx >= mapa.ancho || my >= mapa.alto) continue;
        const i = my * mapa.ancho + mx;
        dibujarTile(c, mapa.suelo[i]!, mapa.muros[i]!, tx * tile, ty * tile, tile, p);
      }
    }
    dibujarObjetosEstaticos(c, escena, tile, p, cx * TAM_CHUNK, cy * TAM_CHUNK);
    chunks.set(k, lienzo);
    return lienzo;
  }

  return {
    redimensionar(anchoCss, altoCss) {
      canvas.width = Math.round(anchoCss * dpr);
      canvas.height = Math.round(altoCss * dpr);
      canvas.style.width = `${anchoCss}px`;
      canvas.style.height = `${altoCss}px`;
      vista = { ancho: anchoCss / TILE_CSS, alto: altoCss / TILE_CSS };
      return vista;
    },
    dibujar(e: EstadoRender) {
      if (e.escena !== cacheEscena || e.escena.rejaAbierta !== cacheRejaAbierta) {
        cacheEscena = e.escena;
        cacheRejaAbierta = e.escena.rejaAbierta;
        chunks = new Map();
        paleta = opciones.paleta(e.escena);
      }
      const p = paleta!;
      const { camara } = e;
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const [cx, cy] of chunksVisibles(camara, vista, e.escena.mapa)) {
        ctx.drawImage(chunk(e.escena, cx, cy) as CanvasImageSource, Math.round((cx * TAM_CHUNK - camara.x) * tile), Math.round((cy * TAM_CHUNK - camara.y) * tile));
      }
      const aPx = (x: number, y: number): [number, number] => [(x - camara.x) * tile, (y - camara.y) * tile];

      // highlighted destination: Sol outline
      const res = e.resaltado ? e.escena.destinos.find((d) => d.id === e.resaltado) : undefined;
      if (res) {
        const [x, y] = aPx(res.rect.x, res.rect.y);
        ctx.strokeStyle = p.sol;
        ctx.lineWidth = tile / 8;
        ctx.strokeRect(x - 2, y - 2, res.rect.ancho * tile + 4, res.rect.alto * tile + 4);
      }
      // BFS trail drawn by Rikuy: Sol diamonds
      ctx.fillStyle = p.sol;
      for (let i = 0; i < e.camino.length; i += 1) {
        const q = e.camino[i]!;
        const [x, y] = aPx(q.x, q.y);
        rombo(ctx, x, y, tile / 9);
      }
      const angulo = Math.sin((e.t * Math.PI * 2) / 4.2) * (3 * Math.PI) / 180;
      if (e.escena.rikuy) {
        const [x, y] = aPx(e.escena.rikuy.x, e.escena.rikuy.y);
        dibujarRikuy(ctx, x, y, tile, angulo);
      }
      if (e.escena.curador) {
        const [x, y] = aPx(e.escena.curador.x, e.escena.curador.y);
        dibujarCurador(ctx, x, y, tile, p);
      }
      for (const a of e.otros) {
        const [x, y] = aPx(a.x, a.y);
        if (x < -tile || y < -tile || x > canvas.width + tile || y > canvas.height + tile) continue;
        dibujarAvatar(ctx, a, x, y, tile, p);
      }
      const [jx, jy] = aPx(e.jugador.x, e.jugador.y);
      dibujarAvatar(ctx, e.jugador, jx, jy, tile, p);
      // the group's own stone hangs above its token (customisable cord and frame)
      dibujarRikuy(ctx, jx + tile * 0.45, jy - tile * 0.1, tile * 0.5, angulo, { cordon: e.jugador.cordon, marco: e.jugador.marco });
    },
    destruir() {
      chunks.clear();
    },
  };
}
