import { describe, expect, it, vi } from 'vitest';
import { compartirPorWhatsApp, enlaceWame } from './compartir.ts';

const datos = { texto: 'Hola. Esta semana medimos un péndulo.', url: 'https://rikuy.app/#/p/abc.1z', titulo: 'Para llevar · El péndulo' };

describe('WhatsApp sharing', () => {
  it('uses the Web Share API when the phone has it', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const abrir = vi.fn();
    expect(await compartirPorWhatsApp(datos, { share, abrir })).toBe('compartido');
    expect(share).toHaveBeenCalledWith({ title: datos.titulo, text: datos.texto, url: datos.url });
    expect(abrir).not.toHaveBeenCalled();
  });

  it('treats a dismissed share sheet as a normal cancel, not an error', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    expect(await compartirPorWhatsApp(datos, { share, abrir: vi.fn() })).toBe('cancelado');
  });

  it('falls back to a wa.me link with the text and the link when there is no Web Share', async () => {
    const abrir = vi.fn();
    expect(await compartirPorWhatsApp(datos, { abrir })).toBe('enlace_wame');
    const url = abrir.mock.calls[0][0] as string;
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1])).toBe(`${datos.texto}\n${datos.url}`);
  });

  it('falls back too when sharing fails for another reason', async () => {
    const abrir = vi.fn();
    const share = vi.fn().mockRejectedValue(new Error('boom'));
    expect(await compartirPorWhatsApp(datos, { share, abrir })).toBe('enlace_wame');
    expect(abrir).toHaveBeenCalled();
  });

  it('wa.me with a phone number keeps only digits', () => {
    expect(enlaceWame('hola', '+51 987-654 321')).toBe('https://wa.me/51987654321?text=hola');
  });
});
