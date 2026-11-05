import { Button } from '@rikuy/ui';
import { Pause, Play, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { crearBarrido, type Barrido } from './barrido.ts';

export interface EtiquetasBarrido {
  titulo: string;
  ayuda: string;
  pausar: string;
  reanudar: string;
  salir: string;
}

const dentroDelControl = (t: EventTarget | null) => t instanceof Element && t.closest('[data-barrido-ignorar]') !== null;

/**
 * Mounts the scan while the setting is on. One tap ANYWHERE or one key (Space or Enter) selects the
 * highlighted control; Escape pauses. The bar at the bottom keeps normal taps (pause, resume, exit) so
 * the mode can always be left. The scan can also read each control aloud when `alMover` is given.
 */
export function BarridoActivo({ intervaloMs, etiquetas, onSalir, alMover }: { intervaloMs: number; etiquetas: EtiquetasBarrido; onSalir: () => void; alMover?: (el: HTMLElement) => void }) {
  const [pausado, setPausado] = useState(false);
  const motor = useRef<Barrido | null>(null);
  const seleccionando = useRef(false);
  const alMoverRef = useRef(alMover);
  useEffect(() => {
    alMoverRef.current = alMover;
  }, [alMover]);

  useEffect(() => {
    const barrido = crearBarrido({
      raiz: () => document.body,
      intervalo: () => intervaloMs,
      alMover: (el) => alMoverRef.current?.(el),
    });
    motor.current = barrido;
    barrido.iniciar();

    const elegir = () => {
      seleccionando.current = true;
      try {
        barrido.seleccionar();
      } finally {
        seleccionando.current = false;
      }
    };
    const alPulsar = (e: PointerEvent) => {
      if (dentroDelControl(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (barrido.corriendo()) elegir();
    };
    const alHacerClic = (e: MouseEvent) => {
      // A real click would double-activate whatever is under the finger: only the scan decides.
      if (seleccionando.current || dentroDelControl(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (dentroDelControl(e.target)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (barrido.corriendo()) {
          barrido.pausar();
          setPausado(true);
        } else {
          barrido.reanudar();
          setPausado(false);
        }
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (barrido.corriendo()) elegir();
      }
    };

    document.addEventListener('pointerdown', alPulsar, true);
    document.addEventListener('click', alHacerClic, true);
    document.addEventListener('keydown', alTeclear, true);
    return () => {
      document.removeEventListener('pointerdown', alPulsar, true);
      document.removeEventListener('click', alHacerClic, true);
      document.removeEventListener('keydown', alTeclear, true);
      barrido.detener();
      motor.current = null;
    };
  }, [intervaloMs]);

  const alternar = () => {
    const barrido = motor.current;
    if (!barrido) return;
    if (barrido.corriendo()) {
      barrido.pausar();
      setPausado(true);
    } else {
      barrido.reanudar();
      setPausado(false);
    }
  };

  return (
    <section
      data-barrido-ignorar
      aria-label={etiquetas.titulo}
      className="fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-[var(--rk-w-phone)] flex-wrap items-center gap-2 rounded-card border-2 border-ink bg-surface p-2 shadow-sheet"
    >
      <p className="m-0 min-w-0 flex-1 text-small font-semibold text-ink">{etiquetas.ayuda}</p>
      <Button variant="secondary" onClick={alternar}>
        {pausado ? <Play /> : <Pause />}
        {pausado ? etiquetas.reanudar : etiquetas.pausar}
      </Button>
      <Button variant="danger" onClick={onSalir}>
        <X />
        {etiquetas.salir}
      </Button>
    </section>
  );
}
