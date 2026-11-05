/**
 * QR platform adapter (F2): reading with `BarcodeDetector` when the browser has it, `jsQR` as the
 * fallback, and reading from a photo; plus the QR matrix used to draw RK1 frames.
 * Reader adapted from Yaku by agentards (agentards__yaku/src/scanner.ts), reused with the
 * authors' permission: center crops are ENLARGED before jsQR (more pixels per module), several
 * scales rotate frame by frame, and the native detector is cross-checked with jsQR.
 */
import jsQR from 'jsqr';
import QRCode from 'qrcode';

// ---------- writing ----------

export interface QrMatrix {
  size: number;
  get(x: number, y: number): boolean;
}

/** QR modules for `text` (error correction M, as measured in Yaku). RK1 frames use alphanumeric mode. */
export function qrMatrix(text: string): QrMatrix {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  return { size: modules.size, get: (x, y) => !!modules.get(y, x) };
}

/** SVG path (one unit per module) of a QR matrix, for a crisp `<svg viewBox>`. */
export function qrPath(m: QrMatrix): string {
  let d = '';
  for (let y = 0; y < m.size; y++) for (let x = 0; x < m.size; x++) if (m.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
  return d;
}

// ---------- reading: pure core (no DOM, tested in jsdom/Node) ----------

/** Crop (sx, sy, sw, sh) of the frame scaled to dw x dh before jsQR. */
export interface Region {
  name: string;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dw: number;
  dh: number;
}
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}
/** RGBA pixels of a scaled region (a canvas in the browser, plain JS in tests). */
export type Sampler = (r: Region) => Pixels;

function center(name: string, w: number, h: number, f: number, zoom: number, cap: number, px = 0): Region {
  const side = Math.round(Math.min(w, h) * f);
  const d = Math.min(cap, zoom ? Math.round(side * zoom) : px);
  return { name, sx: Math.round((w - side) / 2), sy: Math.round((h - side) / 2), sw: side, sh: side, dw: d, dh: d };
}

/** Crops to try on a w x h frame: enlarged center crops first, the whole frame last. */
export function planRegions(w: number, h: number, cap = 960): Region[] {
  const k = Math.min(1, cap / Math.max(w, h));
  return [
    center('c60x2', w, h, 0.6, 2, cap),
    center('c85x1.5', w, h, 0.85, 1.5, cap),
    center('c85@480', w, h, 0.85, 0, cap, 480),
    center('c100@640', w, h, 1, 0, cap, 640),
    center('c50@960', w, h, 0.5, 0, cap, 960),
    center('c70@800', w, h, 0.7, 0, cap, 800),
    { name: 'todo', sx: 0, sy: 0, sw: w, sh: h, dw: Math.round(w * k), dh: Math.round(h * k) },
  ];
}

export function decodeRegion(sample: Sampler, r: Region, invert = false): string | null {
  const px = sample(r);
  return jsQR(px.data, px.width, px.height, { inversionAttempts: invert ? 'attemptBoth' : 'dontInvert' })?.data ?? null;
}

/** Tries every crop at once (photos and tests); the camera loop tries one crop per frame. */
export function decodeFrame(sample: Sampler, w: number, h: number, cap = 960, invert = false): { data: string; region: string } | null {
  for (const r of planRegions(w, h, cap)) {
    const data = decodeRegion(sample, r, invert);
    if (data) return { data, region: r.name };
  }
  return null;
}

// ---------- reading: browser ----------

export interface Detector {
  detect(src: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
interface DetectorClass {
  new (o: { formats: string[] }): Detector;
  getSupportedFormats(): Promise<string[]>;
}

let detector: Detector | null | undefined;

/** Native `BarcodeDetector` with QR support, or null (then jsQR is used). */
export async function getDetector(): Promise<Detector | null> {
  if (detector !== undefined) return detector;
  detector = null;
  const BD = (globalThis as { BarcodeDetector?: DetectorClass }).BarcodeDetector;
  if (BD) {
    try {
      if ((await BD.getSupportedFormats()).includes('qr_code')) detector = new BD({ formats: ['qr_code'] });
    } catch {
      // no real support
    }
  }
  return detector;
}

export function resetDetectorForTests(): void {
  detector = undefined;
}

function canvasSampler(src: CanvasImageSource): Sampler {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas not available');
  return (r) => {
    if (canvas.width !== r.dw) canvas.width = r.dw;
    if (canvas.height !== r.dh) canvas.height = r.dh;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, r.sx, r.sy, r.sw, r.sh, 0, 0, r.dw, r.dh);
    return ctx.getImageData(0, 0, r.dw, r.dh);
  };
}

export interface ScanStats {
  frames: number;
  reads: number;
  engine: 'BarcodeDetector' | 'jsQR';
  region?: string;
}

/**
 * Decoding loop over a playing <video>. Calls `onText` on every read (repeats included).
 * With BarcodeDetector it also tries one jsQR crop every 3 frames; after 5 consecutive detector
 * errors it stays on jsQR. With jsQR it rotates one crop per frame and keeps the last good one.
 * Returns a stop function.
 */
export function scanVideo(video: HTMLVideoElement, onText: (text: string) => void, stats: ScanStats = { frames: 0, reads: 0, engine: 'jsQR' }): () => void {
  let running = true;
  void (async () => {
    const det = await getDetector();
    stats.engine = det ? 'BarcodeDetector' : 'jsQR';
    const sample = canvasSampler(video);
    let k = 0;
    let detErrors = 0;
    const order: number[] = [];
    const tick = async () => {
      if (!running) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (video.readyState >= 2 && w) {
        stats.frames++;
        let got = false;
        if (det && detErrors < 5) {
          try {
            for (const c of await det.detect(video)) {
              onText(c.rawValue);
              got = true;
            }
            detErrors = 0;
          } catch {
            if (++detErrors >= 5) stats.engine = 'jsQR';
          }
        }
        if (!got && (!det || detErrors >= 5 || stats.frames % 3 === 0)) {
          const regions = planRegions(w, h);
          if (!order.length) for (let j = 2; j < regions.length; j++) order.push(0, 1, j);
          const r = regions[order[k % order.length]];
          try {
            const text = decodeRegion(sample, r);
            if (text) {
              got = true;
              stats.region = r.name;
              onText(text);
            } else k++;
          } catch {
            k++;
          }
        }
        if (got) stats.reads++;
      }
      setTimeout(tick, det ? 60 : 20);
    };
    void tick();
  })();
  return () => {
    running = false;
  };
}

/** Reads a QR from a photo or screenshot (always jsQR: deterministic and offline). */
export async function decodeImageFile(file: Blob): Promise<string | null> {
  const bmp = await createImageBitmap(file);
  try {
    return decodeFrame(canvasSampler(bmp), bmp.width, bmp.height, 1200, true)?.data ?? null;
  } finally {
    bmp.close?.();
  }
}
