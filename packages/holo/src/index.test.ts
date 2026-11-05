import { describe, expect, it, vi } from 'vitest';

describe('@rikuy/holo public entry', () => {
  it('GATE: importing it does not load Three.js (the hologram loads only when opened)', async () => {
    let threeLoaded = false;
    vi.doMock('three', () => {
      threeLoaded = true;
      return {};
    });
    const mod = await import('./index.ts');
    expect(mod.packageName).toBe('@rikuy/holo');
    expect(typeof mod.VisorExhibicion).toBe('function');
    expect(threeLoaded).toBe(false);
    vi.doUnmock('three');
  });

  it('maps the viewer modes to renderer layouts', async () => {
    const { rendererModeFor } = await import('./index.ts');
    expect(rendererModeFor('pantalla')).toBe('normal');
    expect(rendererModeFor('piramide')).toBe('piramide');
    expect(rendererModeFor('cajita')).toBe('cajita');
  });
});
