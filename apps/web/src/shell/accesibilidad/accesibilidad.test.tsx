import type { Lengua } from '@rikuy/contracts';
import { expectSinViolacionesGraves } from '@rikuy/ui/testing';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearI18n } from '../../platform/i18n/i18n.ts';
import { aplicarAjustes, AJUSTES_POR_DEFECTO, useAjustesA11y } from './ajustes.ts';
import { AnunciosProvider, useAnunciar } from './anuncios.tsx';
import { crearNarrador, type EntradaAudio, type PuertoAudio, type PuertoVoz } from './narrador.ts';
import { NarradorProvider, useNarracion } from './narracion.tsx';
import { PanelAccesibilidad } from './PanelAccesibilidad.tsx';
import { textoDePantalla } from './texto-pantalla.ts';

const voz = (name: string, lang: string, localService: boolean) => ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;

function puertos(opciones: { voces?: SpeechSynthesisVoice[]; grabaciones?: EntradaAudio[]; enLinea?: boolean } = {}) {
  const dichos: { texto: string; voz: string | null; rate: number }[] = [];
  const sonados: { url: string; rate: number }[] = [];
  let finVoz: (() => void) | undefined;
  let finAudio: (() => void) | undefined;
  let limite: ((charIndex: number) => void) | undefined;
  const puertoVoz: PuertoVoz = {
    voces: () => opciones.voces ?? [],
    hablar: (texto, v, cb) => {
      dichos.push({ texto, voz: v?.name ?? null, rate: cb.rate });
      finVoz = cb.onFin;
      limite = cb.onLimite;
    },
    cancelar: vi.fn(),
  };
  const puertoAudio: PuertoAudio = {
    reproducir: (url, cb) => {
      sonados.push({ url, rate: cb.rate });
      finAudio = cb.onFin;
    },
    detener: vi.fn(),
  };
  return {
    dichos,
    sonados,
    puertoVoz,
    puertoAudio,
    terminarVoz: () => finVoz?.(),
    terminarAudio: () => finAudio?.(),
    limiteVoz: (i: number) => limite?.(i),
    manifiesto: (clave: string, lengua: Lengua) => opciones.grabaciones?.find((g) => g.clave === clave && g.lengua === lengua),
    enLinea: () => opciones.enLinea ?? true,
  };
}

describe('narrator: Spanish by speech synthesis, Quechua only by recordings', () => {
  it('speaks Spanish with an offline Spanish system voice when there is one', async () => {
    const p = puertos({ voces: [voz('Online es-ES', 'es-ES', false), voz('Offline es-MX', 'es-MX', true)] });
    const n = crearNarrador({ lengua: () => 'es', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    const r = await n.narrar({ id: 'a', texto: 'Hola, grupo.' });
    expect(r).toBe('hablando');
    expect(p.dichos).toEqual([{ texto: 'Hola, grupo.', voz: 'Offline es-MX', rate: 1 }]);
    expect(n.estado().hablando).toBe('a');
    expect(n.estado().subtitulo).toBe('Hola, grupo.');
  });

  it('offline it refuses voices that need the network', async () => {
    const p = puertos({ voces: [voz('Online es-ES', 'es-ES', false)], enLinea: false });
    const n = crearNarrador({ lengua: () => 'es', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    expect(await n.narrar({ id: 'a', texto: 'Hola.' })).toBe('sin-voz');
    expect(p.dichos).toEqual([]);
    expect(n.estado().aviso).toBe('sin-voz');
    expect(n.estado().subtitulo).toBe('Hola.');
  });

  it('plays the recorded audio of the manifest for Quechua and never uses speech synthesis', async () => {
    const p = puertos({
      voces: [voz('Offline es-PE', 'es-PE', true)],
      grabaciones: [{ clave: 'pendulo.pregunta', lengua: 'quy', sha256: 'a'.repeat(64), bytes: 1000 }],
    });
    const n = crearNarrador({ lengua: () => 'quy', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    expect(await n.narrar({ id: 'q', clave: 'pendulo.pregunta', texto: '[texto en quechua]' })).toBe('hablando');
    expect(p.dichos).toEqual([]);
    expect(p.sonados).toEqual([{ url: `./audio/${'a'.repeat(64)}.opus`, rate: 1 }]);
    expect(n.estado().subtitulo).toBe('[texto en quechua]');
  });

  it('with no recording for a Quechua key it shows the text and stays silent, never TTS', async () => {
    const p = puertos({ voces: [voz('Offline es-PE', 'es-PE', true)] });
    const n = crearNarrador({ lengua: () => 'quy', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    expect(await n.narrar({ id: 'q', clave: 'otra.clave', texto: 'Texto' })).toBe('sin-grabacion');
    expect(await n.narrar({ id: 'q2', texto: 'Texto sin clave' })).toBe('sin-grabacion');
    expect(p.dichos).toEqual([]);
    expect(p.sonados).toEqual([]);
    expect(n.estado().aviso).toBe('sin-grabacion');
    expect(n.estado().hablando).toBeNull();
  });

  it('Aymara is treated like Quechua: recordings only', async () => {
    const p = puertos({ voces: [voz('Offline es-PE', 'es-PE', true)] });
    const n = crearNarrador({ lengua: () => 'ayr', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    await n.narrar({ id: 'x', clave: 'k', texto: 't' });
    expect(p.dichos).toEqual([]);
  });

  it('only one narration at a time, and the toggle stops the current one', async () => {
    const p = puertos({ voces: [voz('Offline es-PE', 'es-PE', true)] });
    const n = crearNarrador({ lengua: () => 'es', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    await n.narrar({ id: 'a', texto: 'Uno' });
    await n.narrar({ id: 'b', texto: 'Dos' });
    expect(p.puertoVoz.cancelar).toHaveBeenCalled();
    expect(n.estado().hablando).toBe('b');
    await n.alternar({ id: 'b', texto: 'Dos' });
    expect(n.estado().hablando).toBeNull();
    expect(n.estado().subtitulo).toBeNull();
  });

  it('clears the state when the utterance ends and notifies subscribers', async () => {
    const p = puertos({ voces: [voz('Offline es-PE', 'es-PE', true)] });
    const n = crearNarrador({ lengua: () => 'es', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    const oyente = vi.fn();
    n.suscribir(oyente);
    await n.narrar({ id: 'a', texto: 'Uno' });
    p.terminarVoz();
    expect(n.estado().hablando).toBeNull();
    expect(oyente).toHaveBeenCalled();
  });

  it('prefers the prerecorded audio of the exhibit, even in Spanish, before the device voice', async () => {
    const p = puertos({
      voces: [voz('Offline es-PE', 'es-PE', true)],
      grabaciones: [{ clave: 'pendulo.pregunta', lengua: 'es', sha256: 'b'.repeat(64), bytes: 900 }],
    });
    const n = crearNarrador({ lengua: () => 'es', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    expect(await n.narrar({ id: 'a', clave: 'pendulo.pregunta', texto: 'Texto' })).toBe('hablando');
    expect(p.sonados).toHaveLength(1);
    expect(p.dichos).toEqual([]);
  });

  it('uses only local device voices by default; a network voice needs an explicit opt-in and shows a cloud notice', async () => {
    const soloNube = puertos({ voces: [voz('Google es-ES', 'es-ES', false)] });
    const n = crearNarrador({ lengua: () => 'es', voz: soloNube.puertoVoz, audio: soloNube.puertoAudio, manifiesto: soloNube.manifiesto, enLinea: soloNube.enLinea });
    expect(await n.narrar({ id: 'a', texto: 'Hola' })).toBe('sin-voz');
    const m = crearNarrador({ lengua: () => 'es', voz: soloNube.puertoVoz, audio: soloNube.puertoAudio, manifiesto: soloNube.manifiesto, enLinea: soloNube.enLinea, permitirVozEnNube: true });
    expect(await m.narrar({ id: 'a', texto: 'Hola' })).toBe('hablando');
    expect(m.estado().aviso).toBe('nube');
  });

  it('applies the reading speed (0.75x, 1x, 1.25x) to the voice and to recordings', async () => {
    const p = puertos({ voces: [voz('Offline es-PE', 'es-PE', true)], grabaciones: [{ clave: 'k', lengua: 'es', sha256: 'c'.repeat(64), bytes: 1 }] });
    const n = crearNarrador({ lengua: () => 'es', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea, velocidad: () => 0.75 });
    await n.narrar({ id: 'a', texto: 'Hola' });
    await n.narrar({ id: 'b', clave: 'k', texto: 'Hola' });
    expect(p.dichos[0]?.rate).toBe(0.75);
    expect(p.sonados[0]?.rate).toBe(0.75);
  });

  it('follows the reading with a highlighted range, word by word', async () => {
    const p = puertos({ voces: [voz('Offline es-PE', 'es-PE', true)] });
    const n = crearNarrador({ lengua: () => 'es', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    await n.narrar({ id: 'a', texto: 'Mide diez oscilaciones' });
    p.limiteVoz(5);
    expect(n.estado().resaltado).toEqual({ inicio: 5, fin: 9 });
    p.limiteVoz(10);
    expect(n.estado().resaltado).toEqual({ inicio: 10, fin: 22 });
    p.terminarVoz();
    expect(n.estado().resaltado).toBeNull();
  });

  it('highlights the whole block while a recording plays, since recordings have no word timings', async () => {
    const p = puertos({ grabaciones: [{ clave: 'k', lengua: 'quy', sha256: 'd'.repeat(64), bytes: 1 }] });
    const n = crearNarrador({ lengua: () => 'quy', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    await n.narrar({ id: 'a', clave: 'k', texto: 'abcdef' });
    expect(n.estado().resaltado).toEqual({ inicio: 0, fin: 6 });
  });

  it('"use only my screen reader" silences Rikuy completely', async () => {
    const p = puertos({ voces: [voz('Offline es-PE', 'es-PE', true)] });
    const n = crearNarrador({ lengua: () => 'es', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea, soloLectorPantalla: () => true });
    expect(await n.narrar({ id: 'a', texto: 'Hola' })).toBe('lector-externo');
    expect(n.disponibilidad({ id: 'a', texto: 'Hola' })).toBe('lector-externo');
    expect(p.dichos).toEqual([]);
    expect(n.estado().subtitulo).toBeNull();
  });

  it('reports availability before the person presses play', () => {
    const p = puertos({ voces: [] });
    const n = crearNarrador({ lengua: () => 'es', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    expect(n.disponibilidad({ id: 'a', texto: 'x' })).toBe('sin-voz');
    const conVoz = puertos({ voces: [voz('Offline es-PE', 'es-PE', true)] });
    expect(crearNarrador({ lengua: () => 'es', voz: conVoz.puertoVoz, audio: conVoz.puertoAudio, manifiesto: conVoz.manifiesto, enLinea: conVoz.enLinea }).disponibilidad({ id: 'a', texto: 'x' })).toBe('ok-voz');
    const q = crearNarrador({ lengua: () => 'quy', voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    expect(q.disponibilidad({ id: 'a', clave: 'k', texto: 'x' })).toBe('sin-grabacion');
  });
});

describe('screen text for the audio mode', () => {
  it('reads headings and paragraphs in order and skips buttons, navigation and hidden content', () => {
    document.body.innerHTML = `
      <main>
        <h1>Mi clase de hoy</h1>
        <p>Aún no hay una clase abierta.</p>
        <button>Preparar la clase</button>
        <nav><a href="#/x">Enlace de navegación</a></nav>
        <div aria-hidden="true">Decoración</div>
        <div class="sr-only">Texto solo para lectores</div>
        <p data-no-narrar>No leer</p>
        <h2>Pasos</h2>
      </main>`;
    const texto = textoDePantalla(document.querySelector('main')!);
    expect(texto).toBe('Mi clase de hoy. Aún no hay una clase abierta. Texto solo para lectores. Pasos.');
  });

  it('caps very long screens so the narration stays short', () => {
    document.body.innerHTML = `<main><p>${'palabra '.repeat(400)}</p></main>`;
    expect(textoDePantalla(document.querySelector('main')!, { maximo: 200 }).length).toBeLessThanOrEqual(200);
  });
});

describe('accessibility settings', () => {
  beforeEach(() => {
    localStorage.clear();
    useAjustesA11y.setState({ ...AJUSTES_POR_DEFECTO });
    document.documentElement.removeAttribute('data-motion');
    document.documentElement.removeAttribute('data-contrast');
    document.documentElement.style.removeProperty('--rk-text-scale');
  });

  it('start with everything off and 100 % text', () => {
    expect(AJUSTES_POR_DEFECTO).toEqual({
      modoAudio: false,
      soloLectorPantalla: false,
      velocidadVoz: 1,
      escalaTexto: 1,
      movimiento: 'auto',
      contraste: 'normal',
      haptica: false,
      barrido: false,
      barridoMs: 2500,
    });
  });

  it('applies the text scale as a CSS variable and clamps it to 200 %', () => {
    aplicarAjustes(document.documentElement, { ...AJUSTES_POR_DEFECTO, escalaTexto: 2 });
    expect(document.documentElement.style.getPropertyValue('--rk-text-scale')).toBe('2');
    useAjustesA11y.getState().fijarEscala(5);
    expect(useAjustesA11y.getState().escalaTexto).toBe(2);
  });

  it('reduced motion and high contrast are attributes the stylesheet reads', () => {
    aplicarAjustes(document.documentElement, { ...AJUSTES_POR_DEFECTO, movimiento: 'reducido', contraste: 'alto' });
    expect(document.documentElement).toHaveAttribute('data-motion', 'reduce');
    expect(document.documentElement).toHaveAttribute('data-contrast', 'high');
    aplicarAjustes(document.documentElement, AJUSTES_POR_DEFECTO);
    expect(document.documentElement).not.toHaveAttribute('data-motion');
    expect(document.documentElement).not.toHaveAttribute('data-contrast');
  });

  it('persist on the device', () => {
    useAjustesA11y.getState().fijar({ modoAudio: true });
    expect(JSON.parse(localStorage.getItem('rikuy.a11y') ?? '{}').state.modoAudio).toBe(true);
  });
});

describe('announcements through live regions', () => {
  it('announces politely and assertively into always-mounted regions', async () => {
    function Disparador() {
      const anunciar = useAnunciar();
      return (
        <>
          <button onClick={() => anunciar('Medición guardada.')}>guardar</button>
          <button onClick={() => anunciar('Se apagó la cámara.', 'assertive')}>apagar</button>
        </>
      );
    }
    render(
      <AnunciosProvider>
        <Disparador />
      </AnunciosProvider>,
    );
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await userEvent.click(screen.getByText('guardar'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Medición guardada.'));
    await userEvent.click(screen.getByText('apagar'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Se apagó la cámara.'));
  });

  it('is restrained: a repeated keyed message inside one second is dropped (no per-tick chatter)', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAnunciar(), { wrapper: AnunciosProvider });
      act(() => result.current('Oscilación 1', 'polite', { clave: 'cronometro' }));
      act(() => result.current('Oscilación 2', 'polite', { clave: 'cronometro' }));
      expect(screen.getByRole('status').textContent).toBe('Oscilación 1');
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      act(() => result.current('Oscilación 3', 'polite', { clave: 'cronometro' }));
      expect(screen.getByRole('status').textContent?.replace(/​/g, '')).toBe('Oscilación 3');
    } finally {
      vi.useRealTimers();
    }
  });

  it('an assertive message is never dropped', () => {
    const { result } = renderHook(() => useAnunciar(), { wrapper: AnunciosProvider });
    act(() => result.current('Se apagó la cámara.', 'assertive', { clave: 'camara' }));
    act(() => result.current('Se apagó la cámara.', 'assertive', { clave: 'camara' }));
    expect(screen.getByRole('alert').textContent?.replace(/\u200b/g, '')).toBe('Se apagó la cámara.');
  });

  it('announces the same sentence twice in a row', async () => {
    const { result } = renderHook(() => useAnunciar(), { wrapper: AnunciosProvider });
    act(() => result.current('Enviado.'));
    const primero = screen.getByRole('status').textContent;
    act(() => result.current('Enviado.'));
    expect(screen.getByRole('status').textContent).not.toBe(primero);
    expect(screen.getByRole('status').textContent?.replace(/​/g, '')).toBe('Enviado.');
  });
});

describe('PanelAccesibilidad', () => {
  beforeEach(() => {
    localStorage.clear();
    useAjustesA11y.setState({ ...AJUSTES_POR_DEFECTO });
  });

  async function montar(lengua: Lengua = 'es', voces: SpeechSynthesisVoice[] = [voz('Offline es-PE', 'es-PE', true)]) {
    const i18n = await crearI18n({ lengua });
    const p = puertos({ voces });
    const narrador = crearNarrador({ lengua: () => lengua, voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    return {
      p,
      ...render(
        <I18nextProvider i18n={i18n}>
          <AnunciosProvider>
            <NarradorProvider narrador={narrador}>
              <main>
                <PanelAccesibilidad />
              </main>
            </NarradorProvider>
          </AnunciosProvider>
        </I18nextProvider>,
      ),
    };
  }

  it('turns the audio mode on and announces it', async () => {
    await montar();
    await userEvent.click(screen.getByRole('switch', { name: 'Modo audio' }));
    expect(useAjustesA11y.getState().modoAudio).toBe(true);
    await waitFor(() => expect(screen.getAllByRole('status').some((s) => s.textContent?.includes('Modo audio activado'))).toBe(true));
  });

  it('steps the text size from 100 % up to 200 % and back, saying the current size', async () => {
    await montar();
    const mas = screen.getByRole('button', { name: 'Texto más grande' });
    const menos = screen.getByRole('button', { name: 'Texto más pequeño' });
    expect(menos).toBeDisabled();
    for (let i = 0; i < 4; i++) await userEvent.click(mas);
    expect(useAjustesA11y.getState().escalaTexto).toBe(2);
    expect(mas).toBeDisabled();
    expect(screen.getByText('Tamaño actual: 200 %')).toBeInTheDocument();
    await userEvent.click(menos);
    expect(useAjustesA11y.getState().escalaTexto).toBe(1.75);
  });

  it('has switches for reduced motion, high contrast and the haptic cue', async () => {
    await montar();
    await userEvent.click(screen.getByRole('switch', { name: 'Reducir el movimiento' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Alto contraste' }));
    expect(useAjustesA11y.getState()).toMatchObject({ movimiento: 'reducido', contraste: 'alto' });
    expect(screen.getByRole('switch', { name: 'Vibración como aviso' })).toBeInTheDocument();
  });

  it('offers "use only my screen reader", reading speeds and the single-tap scanning switch', async () => {
    await montar();
    await userEvent.click(screen.getByRole('switch', { name: 'Usar solo mi lector de pantalla' }));
    expect(useAjustesA11y.getState().soloLectorPantalla).toBe(true);
    await userEvent.click(screen.getByRole('radio', { name: /^1[.,]25x$/ }));
    expect(useAjustesA11y.getState().velocidadVoz).toBe(1.25);
    await userEvent.click(screen.getByRole('switch', { name: 'Barrido con un toque' }));
    expect(useAjustesA11y.getState().barrido).toBe(true);
  });

  it('explains when the phone has no Spanish voice', async () => {
    await montar('es', []);
    expect(screen.getByText('Este celular no tiene una voz en castellano.')).toBeInTheDocument();
  });

  it('has no serious accessibility violations', async () => {
    const { container } = await montar();
    await expectSinViolacionesGraves(container);
  });
});

describe('useNarracion on a card', () => {
  async function conNarrador(lengua: Lengua, voces: SpeechSynthesisVoice[], grabaciones: EntradaAudio[] = []) {
    const i18n = await crearI18n({ lengua });
    const p = puertos({ voces, grabaciones });
    const narrador = crearNarrador({ lengua: () => lengua, voz: p.puertoVoz, audio: p.puertoAudio, manifiesto: p.manifiesto, enLinea: p.enLinea });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <I18nextProvider i18n={i18n}>
        <NarradorProvider narrador={narrador}>{children}</NarradorProvider>
      </I18nextProvider>
    );
    return { p, wrapper };
  }

  it('toggles speaking and shows translated labels', async () => {
    const { p, wrapper } = await conNarrador('es', [voz('Offline es-PE', 'es-PE', true)]);
    const { result } = renderHook(() => useNarracion({ id: 'tarjeta', texto: 'Péndulo: ¿de qué depende?' }), { wrapper });
    expect(result.current.hablarLabel).toBe('Escuchar');
    expect(result.current.resaltado).toBeNull();
    expect(result.current.detenerLabel).toBe('Detener');
    expect(result.current.disabled).toBeFalsy();
    await act(async () => result.current.onToggle());
    expect(p.dichos[0]?.texto).toBe('Péndulo: ¿de qué depende?');
    expect(result.current.hablando).toBe(true);
    await act(async () => result.current.onToggle());
    expect(result.current.hablando).toBe(false);
  });

  it('is disabled with a reason when Quechua has no recording', async () => {
    const { wrapper } = await conNarrador('quy', [voz('Offline es-PE', 'es-PE', true)]);
    const { result } = renderHook(() => useNarracion({ id: 'tarjeta', clave: 'x', texto: 'texto' }), { wrapper });
    expect(result.current.disabled).toBe(true);
    expect(result.current.motivo).toBe('Sin audio revisado');
  });
});
