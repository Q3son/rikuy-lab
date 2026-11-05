/**
 * Canvas host for the museum world. The canvas is decoration plus pointer/arrow-key input; every
 * destination is ALSO a real DOM button outside the canvas (keyboard and screen readers, 1.3).
 */
import { type AvatarRender, type Punto, type RenderizadorMundo, encuadrar } from '@rikuy/campus';
import { type Bucle, crearRenderizadorCanvas, iniciarBucle } from '@rikuy/campus/canvas';
import { useEffect, useRef } from 'react';
import type { ControladorMundo } from './controlador.ts';
import { paletaDe } from './paleta.ts';

export interface FuenteEscena {
  jugador: () => AvatarRender;
  otros: () => readonly AvatarRender[];
  resaltado: () => string | undefined;
  /** Path to draw when the group is not walking (director's suggestion). */
  sugerencia: () => readonly Punto[];
  /** Called every frame with dt (presence interpolation, sending positions...). */
  alPaso?: (dt: number) => void;
}

declare global {
  interface Window {
    __rikuyMundo?: { fps: () => number; avatares: () => number };
  }
}

const TECLAS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

export function VistaMundo({
  controlador,
  fuente,
  etiqueta,
  alActivar,
}: {
  controlador: ControladorMundo;
  fuente: FuenteEscena;
  etiqueta: string;
  /** Tells the container whether the animated world is running (otherwise doors open directly). */
  alActivar?: (activo: boolean) => void;
}) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const fuenteRef = useRef(fuente);
  useEffect(() => {
    fuenteRef.current = fuente;
  });

  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas) return;
    let render: RenderizadorMundo;
    try {
      render = crearRenderizadorCanvas(canvas, { paleta: paletaDe });
    } catch {
      alActivar?.(false);
      return; // no Canvas 2D (old device or test DOM): the DOM buttons and the list mode still work
    }
    const reducido = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let vista = { ancho: 11, alto: 14 };
    const ajustar = () => {
      const ancho = canvas.parentElement?.clientWidth || 360;
      const alto = Math.min(Math.round(ancho * 1.1), 480);
      vista = render.redimensionar(ancho, alto);
    };
    ajustar();
    const teclas = new Set<string>();
    const abajo = (e: KeyboardEvent) => {
      if (TECLAS[e.key]) {
        teclas.add(e.key);
        e.preventDefault();
      }
    };
    const arriba = (e: KeyboardEvent) => teclas.delete(e.key);
    const toque = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const cam = encuadrar(controlador.pos, controlador.escena.mapa, vista);
      controlador.caminarAPunto(cam.x + ((e.clientX - r.left) / r.width) * vista.ancho, cam.y + ((e.clientY - r.top) / r.height) * vista.alto);
    };
    canvas.addEventListener('keydown', abajo);
    canvas.addEventListener('keyup', arriba);
    canvas.addEventListener('blur', () => teclas.clear());
    canvas.addEventListener('pointerdown', toque);
    window.addEventListener('resize', ajustar);

    const bucle: Bucle = iniciarBucle((dt, t) => {
      const f = fuenteRef.current;
      let dx = 0;
      let dy = 0;
      for (const k of teclas) {
        dx += TECLAS[k]![0];
        dy += TECLAS[k]![1];
      }
      if (dx || dy) controlador.mover(dx, dy, dt);
      else controlador.paso(dt);
      f.alPaso?.(dt);
      const otros = f.otros();
      render.dibujar({
        escena: controlador.escena,
        camara: encuadrar(controlador.pos, controlador.escena.mapa, vista),
        jugador: f.jugador(),
        otros,
        camino: controlador.camino.length ? controlador.camino : f.sugerencia(),
        resaltado: f.resaltado(),
        t: reducido ? 0 : t,
      });
    });
    alActivar?.(true);
    window.__rikuyMundo = { fps: () => bucle.fps(), avatares: () => fuenteRef.current.otros().length + 1 };
    return () => {
      bucle.detener();
      render.destruir();
      canvas.removeEventListener('keydown', abajo);
      canvas.removeEventListener('keyup', arriba);
      canvas.removeEventListener('pointerdown', toque);
      window.removeEventListener('resize', ajustar);
      delete window.__rikuyMundo;
      alActivar?.(false);
    };
  }, [controlador, alActivar]);

  return (
    <canvas
      ref={lienzo}
      className="rk-lienzo"
      tabIndex={0}
      role="img"
      aria-label={`${etiqueta}. Usa las flechas para caminar o los botones de destinos de abajo.`}
    />
  );
}
