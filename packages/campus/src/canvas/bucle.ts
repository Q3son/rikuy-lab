/**
 * Frame loop capped at 30 fps (1.3), paused while the tab is hidden. Exposes the measured drawn-frame rate
 * so the performance gate (>= 30 fps at CPU x4, 40 avatars) can be checked from e2e.
 */
export interface Bucle {
  detener(): void;
  /** Drawn frames per second over the last second. */
  fps(): number;
}

export function iniciarBucle(paso: (dt: number, t: number) => void, fpsMax = 30): Bucle {
  const minimo = 1000 / fpsMax - 2; // tolerance for 60 Hz vsync jitter
  let ultimo = performance.now();
  const inicio = ultimo;
  let raf = 0;
  let activo = true;
  let cuadros: number[] = [];

  const tick = (ahora: number) => {
    if (!activo) return;
    raf = requestAnimationFrame(tick);
    if (ahora - ultimo < minimo) return;
    const dt = Math.min((ahora - ultimo) / 1000, 0.1);
    ultimo = ahora;
    cuadros.push(ahora);
    if (cuadros.length > 120) cuadros = cuadros.slice(-60);
    paso(dt, (ahora - inicio) / 1000);
  };
  const visibilidad = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (activo) {
      ultimo = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  document.addEventListener('visibilitychange', visibilidad);
  raf = requestAnimationFrame(tick);
  return {
    detener() {
      activo = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', visibilidad);
    },
    fps() {
      const ahora = performance.now();
      return cuadros.filter((c) => ahora - c <= 1000).length;
    },
  };
}
