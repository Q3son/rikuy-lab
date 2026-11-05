/** Source badge (ARQUITECTURA 4.6, "Honestidad del tutor"): every reply says who produced it. */
import type { FuenteIA } from '@rikuy/contracts';

export interface Insignia {
  fuente: FuenteIA;
  etiqueta: string;
  descripcion: string;
}

const INSIGNIAS: Record<FuenteIA, Insignia> = {
  reglas: { fuente: 'reglas', etiqueta: 'Reglas', descripcion: 'Respondí con reglas del dispositivo, sin internet.' },
  'ia-local': { fuente: 'ia-local', etiqueta: 'IA local', descripcion: 'Respondí con un modelo que corre en el aula, sin internet.' },
  'ia-nube': { fuente: 'ia-nube', etiqueta: 'IA en línea', descripcion: 'Respondí con un modelo en la nube; tu docente lo activó.' },
};

export function insigniaFuente(fuente: FuenteIA): Insignia {
  return INSIGNIAS[fuente];
}
