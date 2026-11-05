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

const VIRTUAL = /vethernet|virtualbox|vmware|vmnet|wsl|docker|veth|br-|hyper-v|tailscale|zerotier|vboxnet/i;
const WIRELESS = /wi-?fi|wlan|wlp|^wl|wireless|^en0$|^ap\d|swlan/i;

/**
 * URLs the hub is reachable at, best first: wireless interfaces (the hotspot or classroom wifi the
 * phones join), then other private ranges, then virtual adapters; link-local is skipped.
 * `publicUrl` (HUB_PUBLIC_URL) overrides the guess when the teacher knows better.
 */
export function lanUrls(port: number, interfaces: Record<string, NetIf[] | undefined>, publicUrl?: string): string[] {
  const found: Array<{ ip: string; rank: number }> = [];
  for (const [name, list] of Object.entries(interfaces)) {
    for (const i of list ?? []) {
      if (i.internal || !(i.family === 'IPv4' || i.family === 4) || i.address.startsWith('169.254.')) continue;
      const rank = VIRTUAL.test(name) ? 3 : WIRELESS.test(name) ? 0 : i.address.startsWith('192.168.') ? 1 : 2;
      found.push({ ip: i.address, rank });
    }
  }
  found.sort((a, b) => a.rank - b.rank);
  const urls = found.map(({ ip }) => `http://${ip}:${port}/`);
  if (publicUrl) urls.unshift(new URL(publicUrl).href);
  return [...urls, `http://localhost:${port}/`];
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
