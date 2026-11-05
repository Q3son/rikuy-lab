/**
 * Live voice/video between groups (AulaQuipu uses LiveKit for its live classroom). Rikuy is offline-first
 * and uses no paid services: LiveKit needs a server and credentials, so this hook stays disabled. It is
 * the single place to plug a self-hosted SFU later (for example LiveKit OSS on the school hub).
 * No credentials or URLs are included.
 */
export interface VozEnVivo {
  disponible: false;
  motivo: string;
}

export function useVozEnVivo(): VozEnVivo {
  return { disponible: false, motivo: 'La voz en vivo entre grupos necesita un servidor propio en el hub. Por ahora usen el chat de sala.' };
}
