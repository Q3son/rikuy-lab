/**
 * `webrtc` transport (T1, EXPERIMENTAL, behind the `webrtc` flag): the teacher is the hub of a
 * star; the SDP offer and answer travel through a signaling port (QR frames in practice, so no
 * server is needed) and the sync messages go through a DTLS data channel over the local wifi.
 * Non-trickle ICE: each side waits for candidate gathering to finish before sending its SDP.
 * Field gate pending (3.7): mDNS host candidates on an Android hotspot.
 */
import { MensajeSync, type Sesion } from '@rikuy/contracts';
import type { TransporteSync } from '../puertos.ts';

export interface Signaling {
  send(message: string): Promise<void>;
  receive(): Promise<string>;
}

export interface WebRtcOptions {
  role: 'offerer' | 'answerer';
  signaling: Signaling;
  createPeer?: () => RTCPeerConnection;
  timeoutMs?: number;
}

const LABEL = 'rikuy-sync';

function iceComplete(pc: RTCPeerConnection, timeoutMs: number): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      if (pc.iceGatheringState === 'complete') resolve();
    };
    pc.onicegatheringstatechange = done;
    setTimeout(resolve, timeoutMs); // send what we have
  });
}

function opened(dc: RTCDataChannel, timeoutMs: number): Promise<RTCDataChannel> {
  if (dc.readyState === 'open') return Promise.resolve(dc);
  return new Promise((resolve, reject) => {
    dc.onopen = () => resolve(dc);
    setTimeout(() => reject(new Error('WebRTC data channel did not open')), timeoutMs);
  });
}

export function createWebRtcTransport(o: WebRtcOptions): TransporteSync {
  const timeoutMs = o.timeoutMs ?? 15_000;
  const createPeer = o.createPeer ?? (() => new RTCPeerConnection({ iceServers: [] }));
  return {
    id: 'webrtc',
    async abrir(claseId): Promise<Sesion> {
      const pc = createPeer();
      let channel: Promise<RTCDataChannel>;
      if (o.role === 'offerer') {
        const dc = pc.createDataChannel(LABEL);
        channel = opened(dc, timeoutMs);
        await pc.setLocalDescription(await pc.createOffer());
        await iceComplete(pc, timeoutMs);
        await o.signaling.send(JSON.stringify({ claseId, type: 'offer', sdp: pc.localDescription?.sdp }));
        const answer = JSON.parse(await o.signaling.receive()) as { type: RTCSdpType; sdp: string };
        await pc.setRemoteDescription({ type: answer.type, sdp: answer.sdp });
      } else {
        channel = new Promise((resolve, reject) => {
          pc.ondatachannel = (e) => opened(e.channel, timeoutMs).then(resolve, reject);
        });
        const offer = JSON.parse(await o.signaling.receive()) as { claseId: string; type: RTCSdpType; sdp: string };
        if (offer.claseId !== claseId) throw new Error('WebRTC offer for another class');
        await pc.setRemoteDescription({ type: offer.type, sdp: offer.sdp });
        await pc.setLocalDescription(await pc.createAnswer());
        await iceComplete(pc, timeoutMs);
        await o.signaling.send(JSON.stringify({ claseId, type: 'answer', sdp: pc.localDescription?.sdp }));
      }
      const dc = await channel;
      const handlers = new Set<(m: MensajeSync) => void>();
      dc.onmessage = (e: MessageEvent) => {
        try {
          const parsed = MensajeSync.safeParse(JSON.parse(String(e.data)));
          if (parsed.success && parsed.data.claseId === claseId) for (const h of handlers) h(parsed.data);
        } catch {
          // not JSON: ignore
        }
      };
      return {
        async enviar(m) {
          dc.send(JSON.stringify(m));
        },
        recibir(h) {
          handlers.add(h);
          return () => handlers.delete(h);
        },
        cerrar() {
          handlers.clear();
          dc.close();
          pc.close();
        },
      };
    },
  };
}
