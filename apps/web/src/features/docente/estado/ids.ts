/** Identifier helpers for events authored on the teacher phone (clock and randomness are injected). */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function crearUlid(ahoraMs: number, azar: () => number = Math.random): string {
  let t = ahoraMs;
  let tiempo = '';
  for (let i = 0; i < 10; i += 1) {
    tiempo = CROCKFORD[t % 32] + tiempo;
    t = Math.floor(t / 32);
  }
  let cola = '';
  for (let i = 0; i < 16; i += 1) cola += CROCKFORD[Math.floor(azar() * 32) % 32];
  return tiempo + cola;
}

/** Hybrid logical clock: msUnix(13)-counter(4)-node(8). Never goes backwards. */
export function crearGeneradorHlc(nodo: string, reloj: () => number = Date.now): () => string {
  let ultimoMs = 0;
  let contador = 0;
  const nodo8 = nodo.padEnd(8, '0').slice(0, 8);
  return () => {
    const ahora = reloj();
    if (ahora > ultimoMs) {
      ultimoMs = ahora;
      contador = 0;
    } else {
      contador += 1;
    }
    return `${String(ultimoMs).padStart(13, '0')}-${String(contador).padStart(4, '0')}-${nodo8}`;
  };
}

const CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function codigoDeClase(azar: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i += 1) s += CODIGO[Math.floor(azar() * CODIGO.length)];
  return s;
}
