/**
 * HTTP client of the plan reader in `apps/cloud`. No keys here (2.3.3). The files go once to the gateway,
 * which does not store them; a network failure is reported as `ErrorSinRed` so the screen can queue the upload.
 */
import type { LecturaPlan } from '@rikuy/ai';
import { colegioPorDefecto, urlNubePorDefecto } from '../../creador/clienteNube.ts';

export class ErrorSinRed extends Error {}
export class ErrorPlan extends Error {}

export interface ClientePlan {
  extraer(archivos: Blob[]): Promise<LecturaPlan>;
}

const MENSAJES: Record<string, string> = {
  demasiados: 'Máximo 10 fotos por envío.',
  mezcla: 'Sube un solo PDF, o solo fotos.',
  demasiado_grande: 'El documento pesa demasiado. Prueba con menos fotos o un PDF más liviano.',
  tipo_no_permitido: 'Solo se aceptan PDF o fotos (JPG, PNG, WEBP, HEIC).',
  contenido_no_coincide: 'El archivo no parece un PDF o una foto válida.',
  sin_archivos: 'Elige un PDF o toma fotos de tu planificación.',
};

export function crearClientePlan(o: { baseUrl?: string; colegioId?: string; fetch?: typeof fetch } = {}): ClientePlan {
  const base = (o.baseUrl ?? urlNubePorDefecto()).replace(/\/+$/, '');
  const colegio = o.colegioId ?? colegioPorDefecto();
  const f = o.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  return {
    async extraer(archivos) {
      const form = new FormData();
      archivos.forEach((a, i) => form.append('archivos', a, a instanceof File ? a.name : `pagina-${i + 1}`));
      let r: Response;
      try {
        r = await f(`${base}/ia/plan/extraer`, {
          method: 'POST',
          headers: { 'x-rikuy-colegio': colegio },
          body: form,
        });
      } catch {
        throw new ErrorSinRed('Sin conexión con la nube de Rikuy.');
      }
      const json = (await r.json().catch(() => ({}))) as {
        error?: string;
        detalle?: string;
        fallo?: { tipo: string };
      };
      if (r.status === 200) return json as unknown as LecturaPlan;
      if (r.status === 429) throw new ErrorPlan('Se acabó el cupo de IA o hubo demasiadas peticiones. Intenta más tarde o usa el plan de ejemplo.');
      if (json.error && MENSAJES[json.error]) throw new ErrorPlan(MENSAJES[json.error]!);
      if (json.fallo?.tipo === 'sin_red' || json.fallo?.tipo === 'timeout') throw new ErrorSinRed('La IA no respondió a tiempo.');
      throw new ErrorPlan('No se pudo leer el documento. Prueba con fotos más nítidas o con el PDF original.');
    },
  };
}
