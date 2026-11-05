/**
 * Minimal QR encoder (byte mode, error correction M, versions 1-6, about 106 bytes), enough for
 * the "join this room" link the projector shows. Written here because the repo only ships a QR
 * reader (jsQR) and adding a dependency would touch the lockfile (5.5). F2 can move it to
 * platform/qr if more features need it.
 */

interface Version {
  dataCodewords: number;
  ecPerBlock: number;
  blocks: number;
  align: number[];
}

// ISO/IEC 18004, level M.
const VERSIONS: Record<number, Version> = {
  1: { dataCodewords: 16, ecPerBlock: 10, blocks: 1, align: [] },
  2: { dataCodewords: 28, ecPerBlock: 16, blocks: 1, align: [6, 18] },
  3: { dataCodewords: 44, ecPerBlock: 26, blocks: 1, align: [6, 22] },
  4: { dataCodewords: 64, ecPerBlock: 18, blocks: 2, align: [6, 26] },
  5: { dataCodewords: 86, ecPerBlock: 24, blocks: 2, align: [6, 30] },
  6: { dataCodewords: 108, ecPerBlock: 16, blocks: 4, align: [6, 34] },
};

export function encodeQr(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const version = Object.keys(VERSIONS)
    .map(Number)
    .find((v) => 4 + 8 + bytes.length * 8 <= VERSIONS[v].dataCodewords * 8);
  if (!version) throw new RangeError(`text too long for a version 6-M QR (${bytes.length} bytes)`);
  const spec = VERSIONS[version];
  const codewords = interleave(dataCodewords(bytes, spec.dataCodewords), spec);

  let best: boolean[][] | null = null;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const m = buildMatrix(version, spec, codewords, mask);
    const p = penalty(m);
    if (p < bestPenalty) {
      bestPenalty = p;
      best = m;
    }
  }
  return best!;
}

function dataCodewords(bytes: Uint8Array, capacity: number): number[] {
  const bits: number[] = [];
  const put = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  put(0b0100, 4); // byte mode
  put(bytes.length, 8);
  bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, capacity * 8 - bits.length)); // terminator
  while (bits.length % 8) bits.push(0);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0; out.length < capacity; pad++) out.push(pad % 2 ? 0x11 : 0xec);
  return out;
}

function interleave(data: number[], spec: Version): number[] {
  const size = data.length / spec.blocks;
  const blocks = Array.from({ length: spec.blocks }, (_, i) => data.slice(i * size, (i + 1) * size));
  const ecs = blocks.map((b) => reedSolomon(b, spec.ecPerBlock));
  const out: number[] = [];
  for (let i = 0; i < size; i++) blocks.forEach((b) => out.push(b[i]));
  for (let i = 0; i < spec.ecPerBlock; i++) ecs.forEach((e) => out.push(e[i]));
  return out;
}

// ---- GF(256) Reed-Solomon ------------------------------------------------------------
const EXP = new Array<number>(512);
const LOG = new Array<number>(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const mul = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function reedSolomon(data: number[], degree: number): number[] {
  let gen = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(gen.length + 1).fill(0);
    gen.forEach((g, j) => {
      next[j] ^= g;
      next[j + 1] ^= mul(g, EXP[i]);
    });
    gen = next;
  }
  const rem = new Array<number>(degree).fill(0);
  for (const d of data) {
    const factor = d ^ rem[0];
    rem.shift();
    rem.push(0);
    for (let i = 0; i < degree; i++) rem[i] ^= mul(gen[i + 1], factor);
  }
  return rem;
}

// ---- Matrix ----------------------------------------------------------------------------
function buildMatrix(version: number, spec: Version, codewords: number[], mask: number): boolean[][] {
  const n = 17 + version * 4;
  const m: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const reserved: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const set = (x: number, y: number, v: boolean) => {
    m[y][x] = v;
    reserved[y][x] = true;
  };

  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, d !== 2 && d !== 4);
      }
  };
  finder(3, 3);
  finder(n - 4, 3);
  finder(3, n - 4);

  for (const cy of spec.align)
    for (const cx of spec.align) {
      if (reserved[cy][cx]) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }

  for (let i = 8; i < n - 8; i++) {
    if (!reserved[6][i]) set(i, 6, i % 2 === 0);
    if (!reserved[i][6]) set(6, i, i % 2 === 0);
  }
  set(8, n - 8, true); // dark module

  // Reserve the format areas, written after masking.
  for (let i = 0; i < 9; i++) {
    reserved[8][i] = reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][n - 1 - i] = reserved[n - 1 - i][8] = true;
  }

  // Zigzag data placement.
  let bit = 0;
  const total = codewords.length * 8;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? n - 1 - vert : vert;
        if (reserved[y][x]) continue;
        let dark = bit < total && ((codewords[bit >>> 3] >>> (7 - (bit & 7))) & 1) === 1;
        bit++;
        if (maskBit(mask, x, y)) dark = !dark;
        m[y][x] = dark;
      }
    }
  }

  writeFormat(m, n, mask);
  return m;
}

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function writeFormat(m: boolean[][], n: number, mask: number) {
  const data = (0b00 << 3) | mask; // level M = 00
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const bitAt = (i: number) => ((bits >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) m[i][8] = bitAt(i);
  m[7][8] = bitAt(6);
  m[8][8] = bitAt(7);
  m[8][7] = bitAt(8);
  for (let i = 9; i < 15; i++) m[8][14 - i] = bitAt(i);
  for (let i = 0; i < 8; i++) m[8][n - 1 - i] = bitAt(i);
  for (let i = 8; i < 15; i++) m[n - 15 + i][8] = bitAt(i);
}

/** Penalty rules 1-4 of the standard (lower is easier to read). */
function penalty(m: boolean[][]): number {
  const n = m.length;
  let p = 0;
  const lines = [...m, ...m[0].map((_, x) => m.map((row) => row[x]))];
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= n; i++) {
      if (i < n && line[i] === line[i - 1]) run++;
      else {
        if (run >= 5) p += run - 2;
        run = 1;
      }
    }
    const s = line.map((b) => (b ? '1' : '0')).join('');
    p += 40 * ((s.match(/10111010000/g)?.length ?? 0) + (s.match(/00001011101/g)?.length ?? 0));
  }
  for (let y = 0; y < n - 1; y++)
    for (let x = 0; x < n - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
    }
  const dark = m.flat().filter(Boolean).length;
  p += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
  return p;
}
