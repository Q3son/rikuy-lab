import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeFrame, getDetector, planRegions, qrMatrix, resetDetectorForTests, type Pixels, type Region } from './qr.ts';

/** Rasterizes a QR matrix centered in a w x h white image, `px` pixels per module. */
function raster(text: string, w: number, h: number, px: number): (r: Region) => Pixels {
  const m = qrMatrix(text);
  const size = m.size * px;
  const ox = Math.floor((w - size) / 2);
  const oy = Math.floor((h - size) / 2);
  const dark = (x: number, y: number) => {
    const mx = Math.floor((x - ox) / px);
    const my = Math.floor((y - oy) / px);
    return mx >= 0 && my >= 0 && mx < m.size && my < m.size && m.get(mx, my);
  };
  return (r) => {
    const data = new Uint8ClampedArray(r.dw * r.dh * 4);
    for (let y = 0; y < r.dh; y++)
      for (let x = 0; x < r.dw; x++) {
        const sx = r.sx + Math.floor((x * r.sw) / r.dw);
        const sy = r.sy + Math.floor((y * r.sh) / r.dh);
        const v = dark(sx, sy) ? 0 : 255;
        const i = (y * r.dw + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 255;
      }
    return { data, width: r.dw, height: r.dh };
  };
}

const FRAME = 'RK1:E:0ABC:1:3:1A2B3C:' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 $%*+-./:'.repeat(6);

describe('QR platform adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetDetectorForTests();
  });

  it('builds a QR matrix with a quiet-zone-free size of 21 + 4k modules', () => {
    const m = qrMatrix(FRAME);
    expect((m.size - 21) % 4).toBe(0);
    expect(m.get(0, 0)).toBe(true); // finder pattern corner
  });

  it('plans center crops and the full frame', () => {
    const rs = planRegions(1280, 720);
    expect(rs.at(-1)).toMatchObject({ name: 'todo', sx: 0, sy: 0, sw: 1280, sh: 720 });
    for (const r of rs) expect(Math.max(r.dw, r.dh)).toBeLessThanOrEqual(960);
  });

  it('decodes an RK1 frame from a camera-sized image with jsQR (photo fallback path)', () => {
    const got = decodeFrame(raster(FRAME, 800, 600, 5), 800, 600);
    expect(got?.data).toBe(FRAME);
  });

  it('returns null when there is no QR', () => {
    const blank = (r: Region): Pixels => ({ data: new Uint8ClampedArray(r.dw * r.dh * 4).fill(255), width: r.dw, height: r.dh });
    expect(decodeFrame(blank, 320, 240)).toBeNull();
  });

  it('uses BarcodeDetector when it supports qr_code, and falls back to jsQR otherwise', async () => {
    expect(await getDetector()).toBeNull();
    resetDetectorForTests();
    class FakeDetector {
      static async getSupportedFormats() {
        return ['qr_code'];
      }
      async detect() {
        return [{ rawValue: 'hola' }];
      }
    }
    vi.stubGlobal('BarcodeDetector', FakeDetector);
    const d = await getDetector();
    expect(await d?.detect({} as CanvasImageSource)).toEqual([{ rawValue: 'hola' }]);
  });
});
