/**
 * Version vectors (3.5): `{ [dispositivo]: maxContiguousSeq }`. Sequences are contiguous per
 * (claseId, dispositivo); a gap stops the vector so the missing events are asked for again.
 */
import type { VectorVersion } from '@rikuy/contracts';

interface Seq {
  dispositivo: string;
  seq: number;
}

export function contiguousVector(events: readonly Seq[]): VectorVersion {
  const seen = new Map<string, Set<number>>();
  for (const e of events) {
    let s = seen.get(e.dispositivo);
    if (!s) seen.set(e.dispositivo, (s = new Set()));
    s.add(e.seq);
  }
  const vv: VectorVersion = {};
  for (const [dev, seqs] of seen) {
    let n = 0;
    while (seqs.has(n + 1)) n++;
    if (n > 0) vv[dev] = n;
  }
  return vv;
}

/** Events with `seq` above what the peer already has contiguously, in (device, seq) order. */
export function lacking<T extends Seq>(events: readonly T[], peer: VectorVersion): T[] {
  return events
    .filter((e) => e.seq > (peer[e.dispositivo] ?? 0))
    .sort((a, b) => (a.dispositivo < b.dispositivo ? -1 : a.dispositivo > b.dispositivo ? 1 : a.seq - b.seq));
}

export function mergeVectors(a: VectorVersion, b: VectorVersion): VectorVersion {
  const out: VectorVersion = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}

/** True when `a` has seen everything `b` has. */
export function dominates(a: VectorVersion, b: VectorVersion): boolean {
  return Object.entries(b).every(([k, v]) => (a[k] ?? 0) >= v);
}
