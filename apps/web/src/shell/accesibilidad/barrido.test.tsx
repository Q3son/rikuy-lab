import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearBarrido, objetivosDeBarrido } from './barrido.ts';
import { BarridoActivo } from './BarridoActivo.tsx';
import { crearCues } from './cues.ts';

function montarPagina() {
  document.body.innerHTML = `
    <main id="raiz">
      <button id="a">Uno</button>
      <button id="b" disabled>Deshabilitado</button>
      <a id="c" href="#/x">Enlace</a>
      <div hidden><button id="oculto">Oculto</button></div>
      <div aria-hidden="true"><button id="decor">Decoración</button></div>
      <input id="d" aria-label="Código" />
      <div data-barrido-ignorar><button id="ctl">Pausar</button></div>
      <button id="e">Último</button>
    </main>`;
  return document.getElementById('raiz')!;
}

describe('single-tap scanning: which controls are scanned', () => {
  it('visits visible, enabled controls in DOM order and skips hidden, decorative and scan-control ones', () => {
    const raiz = montarPagina();
    expect(objetivosDeBarrido(raiz).map((e) => e.id)).toEqual(['a', 'c', 'd', 'e']);
  });
});

describe('single-tap scanning engine', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('moves the highlight on its own every interval and wraps around', () => {
    const raiz = montarPagina();
    const alMover = vi.fn();
    const b = crearBarrido({ raiz: () => raiz, intervalo: () => 1000, alMover });
    b.iniciar();
    expect(b.actual()?.id).toBe('a');
    expect(document.querySelectorAll('[data-barrido-actual]')).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(b.actual()?.id).toBe('c');
    vi.advanceTimersByTime(2000);
    expect(b.actual()?.id).toBe('e');
    vi.advanceTimersByTime(1000);
    expect(b.actual()?.id).toBe('a');
    expect(document.querySelectorAll('[data-barrido-actual]')).toHaveLength(1);
    expect(alMover).toHaveBeenCalledTimes(5);
    b.detener();
  });

  it('one selection activates the highlighted control and restarts from the top', () => {
    const raiz = montarPagina();
    const clic = vi.fn();
    raiz.querySelector('#c')!.addEventListener('click', (e) => {
      e.preventDefault();
      clic();
    });
    const b = crearBarrido({ raiz: () => raiz, intervalo: () => 1000 });
    b.iniciar();
    vi.advanceTimersByTime(1000);
    expect(b.actual()?.id).toBe('c');
    b.seleccionar();
    expect(clic).toHaveBeenCalledOnce();
    expect(b.actual()?.id).toBe('a');
  });

  it('selecting a text field focuses it instead of clicking', () => {
    const raiz = montarPagina();
    const b = crearBarrido({ raiz: () => raiz, intervalo: () => 1000 });
    b.iniciar();
    vi.advanceTimersByTime(2000);
    expect(b.actual()?.id).toBe('d');
    b.seleccionar();
    expect(document.activeElement?.id).toBe('d');
  });

  it('pauses and resumes, and cleans the highlight when stopped', () => {
    const raiz = montarPagina();
    const b = crearBarrido({ raiz: () => raiz, intervalo: () => 1000 });
    b.iniciar();
    b.pausar();
    vi.advanceTimersByTime(5000);
    expect(b.actual()?.id).toBe('a');
    b.reanudar();
    vi.advanceTimersByTime(1000);
    expect(b.actual()?.id).toBe('c');
    b.detener();
    expect(document.querySelectorAll('[data-barrido-actual]')).toHaveLength(0);
    vi.advanceTimersByTime(5000);
    expect(b.actual()).toBeNull();
  });

  it('does nothing and does not throw on a page with no controls', () => {
    document.body.innerHTML = '<main id="raiz"><p>Solo texto</p></main>';
    const b = crearBarrido({ raiz: () => document.getElementById('raiz')!, intervalo: () => 1000 });
    expect(() => {
      b.iniciar();
      vi.advanceTimersByTime(3000);
      b.seleccionar();
    }).not.toThrow();
    expect(b.actual()).toBeNull();
  });
});

describe('BarridoActivo (the component that wires taps and keys)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a tap anywhere selects the highlighted control; Escape pauses and Enter or Space select', () => {
    const clic = vi.fn();
    render(
      <div>
        <main>
          <button onClick={clic}>Entrar al museo</button>
          <button>Otro</button>
          <p data-testid="fondo">Texto</p>
        </main>
        <BarridoActivo intervaloMs={1000} etiquetas={{ titulo: 'Barrido activo', ayuda: 'Toca la pantalla para elegir.', pausar: 'Pausar', reanudar: 'Reanudar', salir: 'Salir del barrido' }} onSalir={() => {}} />
      </div>,
    );
    expect(screen.getByRole('button', { name: 'Entrar al museo' })).toHaveAttribute('data-barrido-actual');
    // a tap on empty space selects, it does not need to hit the control
    act(() => {
      screen.getByTestId('fondo').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    });
    expect(clic).toHaveBeenCalledTimes(1);
    // keyboard switch
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    });
    expect(clic).toHaveBeenCalledTimes(2);
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(screen.getByRole('button', { name: 'Reanudar' })).toBeInTheDocument();
  });

  it('its own controls stay usable by normal taps', () => {
    const salir = vi.fn();
    render(
      <div>
        <main>
          <button>Uno</button>
        </main>
        <BarridoActivo intervaloMs={1000} etiquetas={{ titulo: 'Barrido activo', ayuda: 'Toca la pantalla para elegir.', pausar: 'Pausar', reanudar: 'Reanudar', salir: 'Salir del barrido' }} onSalir={salir} />
      </div>,
    );
    const boton = screen.getByRole('button', { name: 'Salir del barrido' });
    act(() => {
      boton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      boton.click();
    });
    expect(salir).toHaveBeenCalledOnce();
  });
});

describe('every sound has a visual equivalent', () => {
  it('shows the cue as text always, and plays sound and vibration only when enabled', () => {
    const mostrar = vi.fn();
    const sonido = vi.fn();
    const pulso = vi.fn();
    const cues = crearCues({ mostrar, sonido, sonidoActivo: () => false, haptica: { disponible: true, pulso } });
    cues.emitir('oscilacion', 'Oscilación 3 de 10');
    expect(mostrar).toHaveBeenCalledWith({ tipo: 'oscilacion', texto: 'Oscilación 3 de 10' });
    expect(sonido).not.toHaveBeenCalled();
    expect(pulso).toHaveBeenCalledWith('toque');
  });

  it('plays the beep when sound is on', () => {
    const sonido = vi.fn();
    const cues = crearCues({ mostrar: vi.fn(), sonido, sonidoActivo: () => true, haptica: { disponible: false, pulso: vi.fn() } });
    cues.emitir('nudo', 'Nuevo nudo para el grupo');
    expect(sonido).toHaveBeenCalledWith('nudo');
  });

  it('requires a text for every cue, so a sound can never be silent for deaf users', () => {
    const cues = crearCues({ mostrar: vi.fn(), sonido: vi.fn(), sonidoActivo: () => true, haptica: { disponible: false, pulso: vi.fn() } });
    expect(() => cues.emitir('aviso', '')).toThrow(/text/i);
  });
});
