/**
 * The museum's learning events reach F2's event log: every contract event the museum records
 * (`museo.visita`, `reto.progreso`) is appended, MAC-signed, to the class this device joined by QR.
 * Proposed types (`ayuda.*`, `quipu.nudo.*`) stay in the in-memory log until the contract has them.
 * Before a join, or without IndexedDB, the in-memory log is all there is (the demo keeps working).
 */
import { TipoEvento } from '@rikuy/contracts';
import { registroMuseo } from '../features/mundo/eventos.ts';
import { getRelevo } from '../features/relevo/almacen.ts';

export function conectarRegistroMuseo(): () => void {
  return registroMuseo.suscribir((e) => {
    const tipo = TipoEvento.safeParse(e.tipo);
    if (!tipo.success || typeof indexedDB === 'undefined') return;
    void getRelevo()
      .appendAsJoinedGroup(tipo.data, e.datos as Record<string, unknown>)
      .catch(() => undefined); // an event the log rejects is not lost: it stays in the in-memory log
  });
}
