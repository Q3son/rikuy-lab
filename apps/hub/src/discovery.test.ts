import { describe, expect, it } from 'vitest';
import { lanUrls, macFor, macAuthorizer, qrSvg } from './discovery.ts';

describe('discovery', () => {
  it('lists LAN IPv4 URLs first (hotspot ranges ahead of others), loopback last', () => {
    const urls = lanUrls(8787, {
      lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
      eth: [{ address: '10.0.0.5', family: 'IPv4', internal: false }],
      wlan: [
        { address: '192.168.43.1', family: 'IPv4', internal: false },
        { address: 'fe80::1', family: 'IPv6', internal: false },
      ],
    });
    expect(urls).toEqual(['http://192.168.43.1:8787/', 'http://10.0.0.5:8787/', 'http://localhost:8787/']);
  });

  it('puts wifi ahead of virtual adapters and skips link-local addresses', () => {
    const urls = lanUrls(8787, {
      'vEthernet (WSL)': [{ address: '192.168.224.1', family: 'IPv4', internal: false }],
      'VirtualBox Host-Only Network': [{ address: '192.168.56.1', family: 'IPv4', internal: false }],
      'Wi-Fi': [{ address: '192.168.1.4', family: 'IPv4', internal: false }],
      Ethernet: [{ address: '169.254.160.78', family: 'IPv4', internal: false }],
    });
    expect(urls).toEqual(['http://192.168.1.4:8787/', 'http://192.168.224.1:8787/', 'http://192.168.56.1:8787/', 'http://localhost:8787/']);
  });

  it('honours an explicit public URL first', () => {
    expect(lanUrls(8787, {}, 'http://10.42.0.1:8787')).toEqual(['http://10.42.0.1:8787/', 'http://localhost:8787/']);
  });

  it('renders a QR code as inline SVG', async () => {
    const svg = await qrSvg('http://192.168.43.1:8787/');
    expect(svg).toMatch(/^<svg[\s\S]*<\/svg>\s*$/);
  });

  it('authorizes rt.hola by HMAC of the class key over the hub nonce', () => {
    const keys = new Map([['C1', 'secret']]);
    const auth = macAuthorizer({ keys, nonce: 'n0nce', open: false });
    expect(auth({ claseId: 'C1', mac: macFor('secret', 'n0nce') })).toBe(true);
    expect(auth({ claseId: 'C1', mac: macFor('other', 'n0nce') })).toBe(false);
    expect(auth({ claseId: 'C2', mac: 'x' })).toBe(false);
    expect(macAuthorizer({ keys, nonce: 'n0nce', open: true })({ claseId: 'C2', mac: 'x' })).toBe(true);
  });
});
