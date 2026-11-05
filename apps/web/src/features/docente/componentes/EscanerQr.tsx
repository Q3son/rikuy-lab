import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Called with the text of every QR read; the same frame may arrive many times. */
  onTexto(texto: string): void;
  activo: boolean;
}

interface DetectorQr {
  detect(imagen: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opciones: { formats: string[] }) => DetectorQr;
  }
}

/**
 * Camera QR reader. Uses BarcodeDetector when it exists and jsQR otherwise. Nothing is stored
 * or sent: frames only live in memory. If the camera is denied it says what to do instead.
 */
export function EscanerQr({ onTexto, activo }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [problema, setProblema] = useState<string | null>(null);

  useEffect(() => {
    if (!activo) return undefined;
    let cancelado = false;
    let flujo: MediaStream | null = null;
    let raf = 0;
    const lienzo = document.createElement('canvas');

    async function iniciar() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setProblema('Este celular no deja usar la cámara aquí. Usa «Leer desde foto» o el código de ejemplo.');
        return;
      }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      } catch {
        setProblema('No hay permiso para la cámara. Actívalo en el navegador o usa el código de ejemplo.');
        return;
      }
      if (cancelado || !video.current) return;
      video.current.srcObject = flujo;
      await video.current.play().catch(() => undefined);
      const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
      const ciclo = async () => {
        const v = video.current;
        if (cancelado || !v) return;
        if (v.readyState >= 2 && v.videoWidth > 0) {
          try {
            if (detector) {
              for (const c of await detector.detect(v)) onTexto(c.rawValue);
            } else {
              lienzo.width = v.videoWidth;
              lienzo.height = v.videoHeight;
              const ctx = lienzo.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(v, 0, 0);
                const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
                const r = jsQR(datos.data, datos.width, datos.height);
                if (r) onTexto(r.data);
              }
            }
          } catch {
            /* a bad frame is skipped */
          }
        }
        raf = requestAnimationFrame(() => void ciclo());
      };
      void ciclo();
    }
    void iniciar();
    return () => {
      cancelado = true;
      cancelAnimationFrame(raf);
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, [activo, onTexto]);

  if (!activo) return null;
  return (
    <div>
      {problema ? (
        <p role="status" className="dc-muted">{problema}</p>
      ) : (
        <video ref={video} muted playsInline aria-label="Cámara apuntando al código QR del grupo" style={{ width: '100%', borderRadius: 12, border: '3px solid var(--rk-qr-ink)' }} />
      )}
    </div>
  );
}
