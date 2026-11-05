import { describe, expect, it } from 'vitest';
import { crearApp } from './app.ts';
import { crearDepsDesdeEntorno } from './deps.ts';
import { crearProveedorCorreo, crearReportesDesdeEntorno } from './reportes/entorno.ts';

describe('configuration from environment variables', () => {
  it('runs fully simulated with no variables at all', async () => {
    const deps = crearDepsDesdeEntorno({});
    expect(deps.modo).toBe('simulado');
    expect(deps.enrutador.adaptadores().every((a) => a.simulado)).toBe(true);
    const r = await crearApp(deps).request('/ia/estado', { headers: { 'x-rikuy-colegio': 'demo-1' } });
    expect((await r.json()) as { modo: string }).toMatchObject({ modo: 'simulado' });
  });

  it('uses the real adapters when the keys are present, and the stand-in for the missing one', () => {
    const deps = crearDepsDesdeEntorno({ GEMINI_API_KEY: 'g-key' });
    expect(deps.modo).toBe('mixto');
    const nombres = Object.fromEntries(deps.enrutador.adaptadores().map((a) => [a.nombre, a.simulado ?? false]));
    expect(nombres).toEqual({ gemini: false, meta: true });
    expect(crearDepsDesdeEntorno({ GEMINI_API_KEY: 'g', META_API_KEY: 'm' }).modo).toBe('real');
  });

  it('RIKUY_AI_MODE=mock ignores the keys', () => {
    expect(crearDepsDesdeEntorno({ RIKUY_AI_MODE: 'mock', GEMINI_API_KEY: 'g', META_API_KEY: 'm', OLLAMA_BASE_URL: 'http://x/v1' }).modo).toBe('simulado');
  });

  it('adds a local Ollama adapter when its URL is set', () => {
    const nombres = crearDepsDesdeEntorno({ OLLAMA_BASE_URL: 'http://localhost:11434/v1' }).enrutador.adaptadores().map((a) => a.nombre);
    expect(nombres).toContain('ollama');
  });

  it('picks the e-mail provider by variables and defaults to the mock', () => {
    expect(crearProveedorCorreo({}).simulado).toBe(true);
    expect(crearProveedorCorreo({ RESEND_API_KEY: 'k' }).proveedor.nombre).toBe('resend-compatible');
    expect(crearProveedorCorreo({ SMTP_HOST: 'smtp.example.com' }).proveedor.nombre).toBe('smtp');
    expect(crearProveedorCorreo({ EMAIL_PROVIDER: 'resend' }).simulado).toBe(true); // no key: mock
  });

  it('wires every delivery channel', () => {
    const r = crearReportesDesdeEntorno({});
    expect(Object.keys(r.adaptadores).sort()).toEqual(['correo', 'enlace_wame', 'pdf', 'whatsapp']);
  });
});
