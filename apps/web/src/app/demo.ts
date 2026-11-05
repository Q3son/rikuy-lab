/**
 * Golden demo (Ajustes > "Cargar demo"): the pendulum class "2.º B" with its 4 groups, every group's
 * evidence already received, Yeni's literal quote, and example Guardián and Caja de dudas trays.
 * Everything is labelled "Datos de ejemplo"; nothing here is real student data.
 */
import { AutorreporteMomento } from '@rikuy/contracts';
import { construirEscenario } from '@rikuy/evidencia';
import type { DudaConcepto } from '@rikuy/reportes';
import type { PedidoDeAyuda } from '@rikuy/senales';
import { almacenDocente } from '../features/docente/Proveedor.tsx';
import { useBandejaGuardian } from '../features/guardian/bandeja.ts';
import { EXHIBICION_PENDULO } from '../features/reportes/conceptos.ts';

/** Yeni (E01, group Cóndor) said it before measuring; the evidence view quotes it literally. */
export const FRASE_YENI = 'Creo que si la cuerda es más larga tarda más en volver';

/** Private roster of the demo: first names only, on this phone only. */
export const PADRON_DEMO: Record<string, string> = { E01: 'Yeni', E02: 'Inti', E03: 'Hilda', E04: 'Julio' };

const BASE_MS = 1_762_300_800_000;
const hlc = (min: number, nodo = 'demo0001') => `${String(BASE_MS + min * 60_000).padStart(13, '0')}-0000-${nodo}`;

export function cargarDemo(): void {
  const esc = construirEscenario();
  almacenDocente().getState().cargarDemo({ completa: true, padron: PADRON_DEMO });

  const claseId = esc.clase.id;
  const estudiantes = esc.estudianteIds;
  const emociones = ['curiosidad', 'confusion', 'calma', 'alegria', 'confusion', 'curiosidad'] as const;
  const autorreportes = emociones.map((emocion, i) =>
    AutorreporteMomento.parse({
      id: `01JC000000000000000000AR0${i}`,
      estudianteId: estudiantes[i]!,
      claseId,
      contexto: { practicaId: esc.practica.id, pasoId: 'medir' },
      emociones: [{ emocion, intensidad: 3 }],
      ayuda: emocion === 'confusion' ? 'ejemplo' : 'nada',
      visibilidad: 'mi_docente',
      hlc: hlc(10 + i),
    }),
  );
  const pedidos: PedidoDeAyuda[] = [{ id: '01JC000000000000000000PD01', estudianteId: estudiantes[2]!, claseId, destino: 'docente', urgente: false, hlc: hlc(20) }];
  const grupos = Object.values(esc.grupoIds);
  const duda = (n: number, grupoId: string, conceptoId: string): DudaConcepto => ({
    id: `01JC000000000000000000DU0${n}`,
    claseId,
    grupoId,
    exhibicionId: EXHIBICION_PENDULO,
    conceptoId,
    hlc: hlc(25 + n),
  });
  const dudas = [duda(1, grupos[0]!, 'longitud'), duda(2, grupos[1]!, 'longitud'), duda(3, grupos[2]!, 'longitud'), duda(4, grupos[3]!, 'promedio')];
  useBandejaGuardian.getState().reemplazar({ autorreportes, pedidos, dudas, decisiones: {}, apagado: false, esDemo: true });
}
