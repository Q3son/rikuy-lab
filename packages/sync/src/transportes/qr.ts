/**
 * `qr` transport (T0): camera <-> screen, no radio at all. The sync messages travel as RK1
 * packages: DELTA -> `eventos` (frames E, shown in a loop until read), HOLA and ACK -> `ack`
 * carrying the version vector (a single frame A). Received E packages become one DELTA flagged as
 * the last batch; A packages become an ACK. The screen and the camera are ports, so this module
 * stays free of the DOM (apps/web/src/platform/qr.ts and features/relevo provide them).
 */
import { MAX_EVENTOS_POR_LOTE, type Evento, type MensajeSync, type Paquete, type Sesion, type VectorVersion } from '@rikuy/contracts';
import { encodeFrames, Reassembler, type FrameType } from '../codec/rk1.ts';
import type { TransporteSync } from '../puertos.ts';

export interface QrDisplay {
  /** Shows the frames in a loop (replacing whatever was on screen). */
  show(frames: string[], tipo: FrameType): void;
  clear(): void;
}

export interface QrReader {
  /** Every decoded QR text, repeats included. */
  subscribe(h: (text: string) => void): () => void;
}

export interface QrTransportOptions {
  display: QrDisplay;
  reader: QrReader;
  /** Device id of this side (package `emisor`). */
  emisor: string;
  /** Current HLC of this device (package `creado`). */
  now(): string;
  fragment?: number;
}

export function createQrTransport(o: QrTransportOptions): TransporteSync {
  return {
    id: 'qr',
    async abrir(claseId): Promise<Sesion> {
      const handlers = new Set<(m: MensajeSync) => void>();
      const reassembler = new Reassembler();
      let pending: Evento[] = [];

      const show = (tipo: Paquete['tipo'], cuerpo: unknown) => {
        const p: Paquete = { v: 1, tipo, claseId, emisor: o.emisor, creado: o.now(), cuerpo };
        const { frames } = encodeFrames(p, { fragment: o.fragment });
        o.display.show(frames, tipo === 'eventos' ? 'E' : 'A');
      };

      const deliver = (m: MensajeSync) => {
        for (const h of handlers) h(m);
      };

      const unsubscribe = o.reader.subscribe((text) => {
        const r = reassembler.add(text);
        if (r.status !== 'complete' || r.paquete.claseId !== claseId) return;
        const p = r.paquete;
        if (p.tipo === 'eventos') {
          const eventos = (p.cuerpo as { eventos: Evento[] }).eventos;
          const batches = Math.max(1, Math.ceil(eventos.length / MAX_EVENTOS_POR_LOTE));
          for (let i = 0; i < batches; i++) {
            deliver({ t: 'delta', claseId, eventos: eventos.slice(i * MAX_EVENTOS_POR_LOTE, (i + 1) * MAX_EVENTOS_POR_LOTE), ultimo: i === batches - 1 });
          }
        } else if (p.tipo === 'ack') {
          deliver({ t: 'ack', claseId, vv: (p.cuerpo as { vv: VectorVersion }).vv });
        }
      });

      return {
        async enviar(m) {
          if (m.t === 'delta') {
            pending = [...pending, ...m.eventos];
            if (m.ultimo !== false) {
              show('eventos', { eventos: pending });
              pending = [];
            }
          } else {
            show('ack', { vv: m.vv });
          }
        },
        recibir(h) {
          handlers.add(h);
          return () => handlers.delete(h);
        },
        cerrar() {
          unsubscribe();
          handlers.clear();
          o.display.clear();
        },
      };
    },
  };
}
