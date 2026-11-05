/**
 * Pseudonymous ids of a group device, derived from what the shell already knows (class code and group
 * nickname). Deterministic, so every feature on this phone agrees on them; never a name.
 */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** FNV-1a based 26-char Crockford id with the ULID shape (first char 0-7). */
export function idDeterministico(texto: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  let salida = '0';
  for (let i = 1; i < 26; i += 1) {
    for (const c of `${texto}#${i}`) {
      h1 = Math.imul(h1 ^ c.charCodeAt(0), 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ c.charCodeAt(0), 0x5bd1e995) >>> 0;
    }
    salida += CROCKFORD[(h1 ^ h2) & 31];
  }
  return salida;
}

export interface IdentidadDispositivo {
  estudianteId: string;
  claseId: string;
}

export function identidadDeGrupo(codigoClase: string | null, apodo: string | null): IdentidadDispositivo {
  const clase = codigoClase ?? 'sin-clase';
  return { claseId: idDeterministico(`clase:${clase}`), estudianteId: idDeterministico(`grupo:${clase}:${apodo ?? 'grupo'}`) };
}
