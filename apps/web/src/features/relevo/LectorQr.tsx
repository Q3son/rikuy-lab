import { useEffect, useRef, useState } from 'react';
import { startCamera, type Camera } from '../../platform/camara.ts';
import { decodeImageFile, scanVideo } from '../../platform/qr.ts';

/**
 * QR reader container: live camera (BarcodeDetector or jsQR) or a photo/screenshot as fallback.
 * The camera only starts when the user asks for it, and stops on unmount.
 */
export function LectorQr({ onText, label }: { onText: (text: string) => void; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const camera = useRef<Camera | null>(null);
  const stopScan = useRef<(() => void) | null>(null);
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handler = useRef(onText);
  useEffect(() => {
    handler.current = onText;
  }, [onText]);

  const stop = () => {
    stopScan.current?.();
    camera.current?.stop();
    stopScan.current = null;
    camera.current = null;
    setOn(false);
  };
  useEffect(() => stop, []);

  const start = async () => {
    setError(null);
    try {
      if (!video.current) return;
      camera.current = await startCamera(video.current);
      stopScan.current = scanVideo(video.current, (t) => handler.current(t));
      setOn(true);
    } catch {
      setError('No se pudo abrir la cámara. Puedes leer el QR desde una foto.');
    }
  };

  const fromPhotos = async (files: FileList | null) => {
    setError(null);
    for (const f of Array.from(files ?? [])) {
      const text = await decodeImageFile(f);
      if (text) handler.current(text);
      else setError('No se encontró un QR en la foto.');
    }
  };

  return (
    <section className="flex flex-col gap-2" aria-label={label}>
      <video ref={video} className={on ? 'w-full max-w-[360px] rounded' : 'hidden'} playsInline muted />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded bg-emerald-700 px-3 py-2" onClick={() => (on ? stop() : void start())}>
          {on ? 'Detener cámara' : 'Usar cámara'}
        </button>
        <label className="cursor-pointer rounded border border-neutral-600 px-3 py-2">
          Leer desde foto
          <input type="file" accept="image/*" multiple className="sr-only" aria-label={`${label}: leer desde foto`} onChange={(e) => void fromPhotos(e.target.files)} />
        </label>
      </div>
      {error && <p role="alert" className="text-amber-400">{error}</p>}
    </section>
  );
}
