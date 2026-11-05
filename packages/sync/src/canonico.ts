/**
 * Canonical JSON: object keys sorted at every level, `undefined` members dropped. Two structurally
 * equal values always produce the same bytes, which is what MACs and signatures are computed over.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[k];
      if (v !== undefined) out[k] = sortDeep(v);
    }
    return out;
  }
  return value;
}

const encoder = new TextEncoder();
export const canonicalBytes = (value: unknown): Uint8Array => encoder.encode(canonicalJson(value));
