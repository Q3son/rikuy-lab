/**
 * Discovery and session admission: which URLs the hub is reachable at (shown as QR), and the
 * class MAC check of `rt.hola` (3.9: HMAC of the class key over the hub nonce).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';

export interface NetIf {
  address: string;
  family: string | number;
  internal: boolean;
}

/** Android hotspot (192.168.43.x / 192.168.x) first: that is what phones in the classroom join. */
export function lanUrls(port: number, interfaces: Record<string, NetIf[] | undefined>): string[] {
  const ips: string[] = [];
  for (const list of Object.values(interfaces)) {
    for (const i of list ?? []) if (!i.internal && (i.family === 'IPv4' || i.family === 4)) ips.push(i.address);
  }
  const rank = (ip: string) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('172.') ? 1 : 2);
  ips.sort((a, b) => rank(a) - rank(b));
  return [...ips.map((ip) => `http://${ip}:${port}/`), `http://localhost:${port}/`];
}

export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'M', margin: 2 });
}

export function macFor(classKey: string, nonce: string): string {
  return createHmac('sha256', classKey).update(nonce).digest('base64url');
}

export interface MacAuthorizerOptions {
  keys: ReadonlyMap<string, string>;
  nonce: string;
  /** Demo/dev mode: classes without a registered key are admitted. */
  open: boolean;
}

export function macAuthorizer(o: MacAuthorizerOptions): (hello: { claseId: string; mac: string }) => boolean {
  return ({ claseId, mac }) => {
    const key = o.keys.get(claseId);
    if (!key) return o.open;
    const want = Buffer.from(macFor(key, o.nonce));
    const got = Buffer.from(mac);
    return want.length === got.length && timingSafeEqual(want, got);
  };
}
