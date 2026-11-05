/** Per-IP fixed-window rate limit (in memory: one instance per route group). */
import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context, MiddlewareHandler } from 'hono';

export interface Limite {
  max: number;
  ventanaMs: number;
}

/**
 * The client address. `X-Forwarded-For` is trusted only behind a known proxy (`confiarProxy`),
 * otherwise anyone could pick their own bucket by sending the header.
 */
export function ipDe(c: Context, confiarProxy: boolean): string {
  if (confiarProxy) {
    const xff = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    if (xff) return xff;
  }
  try {
    return getConnInfo(c).remote.address ?? 'desconocida';
  } catch {
    return 'desconocida';
  }
}

export function limitePorIp(l: Limite, opciones: { confiarProxy: boolean; reloj: () => Date }): MiddlewareHandler {
  const cubos = new Map<string, { n: number; reinicia: number }>();
  return async (c, next) => {
    const ahora = opciones.reloj().getTime();
    if (cubos.size > 10_000) for (const [k, v] of cubos) if (v.reinicia <= ahora) cubos.delete(k);
    const ip = ipDe(c, opciones.confiarProxy);
    const actual = cubos.get(ip);
    const cubo = actual && actual.reinicia > ahora ? actual : { n: 0, reinicia: ahora + l.ventanaMs };
    cubo.n++;
    cubos.set(ip, cubo);
    if (cubo.n > l.max) {
      c.header('Retry-After', String(Math.max(1, Math.ceil((cubo.reinicia - ahora) / 1000))));
      return c.json({ error: 'limite_ip', detalle: 'Demasiadas peticiones desde esta dirección. Intenta de nuevo en un momento.' }, 429);
    }
    await next();
  };
}
