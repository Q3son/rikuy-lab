import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conectarActualizacion, useVersion, type ServiceWorkerWindow } from './actualizacion.ts';
import { GRUPOS_DE_PRECACHE, grupoDePrecache, separarPorGrupo } from './grupos.ts';

describe('precache groups', () => {
  it('names the four groups of ARQUITECTURA 5.4: base, clase, gestos, senales', () => {
    expect([...GRUPOS_DE_PRECACHE]).toEqual(['base', 'clase', 'gestos', 'senales']);
  });

  it('puts the shell, the legacy pages and assets in base', () => {
    for (const url of ['index.html', 'assets/index-abc.js', 'assets/index-abc.css', 'clasico.html', 'manifest.webmanifest', 'icon.svg', 'sw.js']) {
      expect(grupoDePrecache(url)).toBe('base');
    }
  });

  it('puts class content and recorded audio in clase', () => {
    expect(grupoDePrecache('content/practicas/pendulo.json')).toBe('clase');
    expect(grupoDePrecache('audio/abc123.opus')).toBe('clase');
  });

  it('keeps hand gestures and learning signals apart, so signals never ship without their flag', () => {
    expect(grupoDePrecache('mediapipe/hand_landmarker.task')).toBe('gestos');
    expect(grupoDePrecache('mediapipe/wasm/vision_wasm_internal.wasm')).toBe('gestos');
    expect(grupoDePrecache('mediapipe/senales/modelo-senales.task')).toBe('senales');
  });

  it('splits a Workbox manifest by group and keeps revisions', () => {
    const grupos = separarPorGrupo([
      { url: 'index.html', revision: '1' },
      { url: 'audio/a.opus', revision: null },
      { url: 'mediapipe/senales/x.task', revision: '2' },
    ]);
    expect(grupos.base).toEqual([{ url: 'index.html', revision: '1' }]);
    expect(grupos.clase).toHaveLength(1);
    expect(grupos.gestos).toEqual([]);
    expect(grupos.senales).toEqual([{ url: 'mediapipe/senales/x.task', revision: '2' }]);
  });
});

type Oyente = (e: { isUpdate?: boolean }) => void;
function falsoWorkbox() {
  const oyentes = new Map<string, Oyente[]>();
  return {
    addEventListener: (tipo: string, fn: Oyente) => {
      oyentes.set(tipo, [...(oyentes.get(tipo) ?? []), fn]);
    },
    emitir: (tipo: string, e: { isUpdate?: boolean } = {}) => (oyentes.get(tipo) ?? []).forEach((fn) => fn(e)),
    messageSkipWaiting: vi.fn(),
    register: vi.fn(async () => undefined),
  } satisfies ServiceWorkerWindow & { emitir: (t: string, e?: { isUpdate?: boolean }) => void };
}

describe('"versión nueva" banner state', () => {
  beforeEach(() => useVersion.setState({ nueva: false, descartada: false, listaOffline: false, aplicar: null }));

  it('stays hidden until a new service worker is waiting', () => {
    const wb = falsoWorkbox();
    conectarActualizacion(wb, { recargar: vi.fn() });
    expect(useVersion.getState().nueva).toBe(false);
    wb.emitir('waiting');
    expect(useVersion.getState().nueva).toBe(true);
  });

  it('applying asks the waiting worker to take over and reloads once it controls the page', () => {
    const wb = falsoWorkbox();
    const recargar = vi.fn();
    conectarActualizacion(wb, { recargar });
    wb.emitir('waiting');
    useVersion.getState().aplicar?.();
    expect(wb.messageSkipWaiting).toHaveBeenCalledOnce();
    expect(recargar).not.toHaveBeenCalled();
    wb.emitir('controlling');
    expect(recargar).toHaveBeenCalledOnce();
  });

  it('does not reload by surprise: only after the person pressed Actualizar', () => {
    const wb = falsoWorkbox();
    const recargar = vi.fn();
    conectarActualizacion(wb, { recargar });
    wb.emitir('waiting');
    wb.emitir('controlling');
    expect(recargar).not.toHaveBeenCalled();
  });

  it('dismissing hides the banner without losing the update', () => {
    const wb = falsoWorkbox();
    conectarActualizacion(wb, { recargar: vi.fn() });
    wb.emitir('waiting');
    useVersion.getState().descartar();
    expect(useVersion.getState().descartada).toBe(true);
    expect(useVersion.getState().nueva).toBe(true);
  });

  it('knows when the very first install finished, so the app can say it works offline', () => {
    const wb = falsoWorkbox();
    conectarActualizacion(wb, { recargar: vi.fn() });
    wb.emitir('activated', { isUpdate: true });
    expect(useVersion.getState().listaOffline).toBe(false);
    wb.emitir('activated', { isUpdate: false });
    expect(useVersion.getState().listaOffline).toBe(true);
  });
});
