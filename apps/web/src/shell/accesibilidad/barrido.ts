/**
 * Single-tap scanning (switch access), FUNCIONES_EXTRA function 6.
 * For people who cannot use gestures or aim at a touch screen: the highlight moves through the
 * controls by itself and ONE tap (anywhere) or ONE key (Space or Enter) selects. No camera is
 * involved: blink control is out of scope for v1 (face recognition is restricted, ECOSISTEMA 2.14).
 * This file is the DOM engine; BarridoActivo wires it to taps, keys and the on-screen controls.
 */
const SELECTOR = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="tab"], [role="switch"], [role="button"], [tabindex]:not([tabindex="-1"])';
const OCULTOS = '[hidden], [aria-hidden="true"], [inert], [data-barrido-ignorar]';
export const ATRIBUTO_ACTUAL = 'data-barrido-actual';

/** Controls the scan can visit, in DOM order. */
export function objetivosDeBarrido(raiz: ParentNode): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>(SELECTOR)].filter((el) => {
    if (el.closest(OCULTOS)) return false;
    if ((el as HTMLButtonElement).disabled) return false;
    return true;
  });
}

export interface OpcionesBarrido {
  raiz: () => ParentNode;
  intervalo: () => number;
  alMover?: (el: HTMLElement) => void;
  alSeleccionar?: (el: HTMLElement) => void;
}

export function crearBarrido(opciones: OpcionesBarrido) {
  let temporizador: ReturnType<typeof setInterval> | null = null;
  let actual: HTMLElement | null = null;
  let indice = -1;
  let corriendo = false;

  const marcar = (el: HTMLElement | null) => {
    actual?.removeAttribute(ATRIBUTO_ACTUAL);
    actual = el;
    el?.setAttribute(ATRIBUTO_ACTUAL, '');
    if (el) {
      el.scrollIntoView?.({ block: 'nearest' });
      opciones.alMover?.(el);
    }
  };

  const avanzar = () => {
    const lista = objetivosDeBarrido(opciones.raiz());
    if (lista.length === 0) {
      marcar(null);
      indice = -1;
      return;
    }
    indice = (indice + 1) % lista.length;
    marcar(lista[indice] ?? null);
  };

  const programar = () => {
    if (temporizador) clearInterval(temporizador);
    temporizador = setInterval(avanzar, Math.max(300, opciones.intervalo()));
  };

  return {
    iniciar() {
      corriendo = true;
      indice = -1;
      avanzar();
      programar();
    },
    pausar() {
      corriendo = false;
      if (temporizador) clearInterval(temporizador);
      temporizador = null;
    },
    reanudar() {
      if (corriendo) return;
      corriendo = true;
      programar();
    },
    detener() {
      corriendo = false;
      if (temporizador) clearInterval(temporizador);
      temporizador = null;
      marcar(null);
      indice = -1;
    },
    /** Activates the highlighted control and starts again from the top (the page usually changed). */
    seleccionar() {
      const el = actual;
      if (!el) return;
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) el.focus();
      else el.click();
      opciones.alSeleccionar?.(el);
      indice = -1;
      avanzar();
      if (corriendo) programar();
    },
    actual: () => actual,
    corriendo: () => corriendo,
  };
}

export type Barrido = ReturnType<typeof crearBarrido>;
