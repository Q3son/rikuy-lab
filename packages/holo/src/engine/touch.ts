/**
 * Arrastrar para girar, pellizcar para acercar. Funciona con dedo y mouse.
 * Entrega deltas: dx/dy en radianes y dz como factor de zoom.
 */
export function attachTouchpad(el: HTMLElement, onDelta: (dx: number, dy: number, dz: number) => void) {
  const pointers = new Map<number, { x: number; y: number }>();
  let lastDist = 0;
  el.style.touchAction = 'none';

  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) lastDist = distance();
  });

  el.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, cur);
    if (pointers.size === 1) {
      onDelta((cur.x - prev.x) * 0.012, (cur.y - prev.y) * 0.012, 1);
    } else if (pointers.size === 2) {
      const d = distance();
      if (lastDist > 0) onDelta(0, 0, d / lastDist);
      lastDist = d;
    }
  });

  const end = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    lastDist = pointers.size === 2 ? distance() : 0;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    onDelta(0, 0, e.deltaY < 0 ? 1.08 : 0.93);
  }, { passive: false });

  function distance() {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
