import type { Evento, Practica } from '@rikuy/contracts';
import {
  avancePorGrupo,
  coberturaPorCapacidad,
  componerDirector,
  componerTutora,
  construirVistaEvidencias,
  medicionesEsperadas,
  proyectar,
  renderFamilia,
  renderInforme,
  renderTutora,
} from '@rikuy/evidencia';
import type { Destino, MensajeSaliente } from '@rikuy/mensajeria';
import { entradaFamilia, semanaDeLima } from '../../familia/mensajeFamilia.ts';
import { fraseLocal, type ContextoAula } from '../estado/contexto.ts';
import { crearUlid } from '../estado/ids.ts';
import { construirMensajeSaliente } from './mensaje.ts';

export interface ContactoFamilia {
  id: string;
  /** Alias of the student (E07). The family phone is matched to it only on this device. */
  alias: string;
  telefono: string;
  lengua: 'es' | 'quy';
  /** The family signed up for reports (Ley 29733). Without it, nothing is drafted. */
  alta: boolean;
  /** Variant B data. Created one by one by the teacher, never in a batch. */
  individual?: { nombre: string; linea: { tipo: 'ayudo' } | { tipo: 'frase'; texto: string } };
}

/** Contact data lives only on the teacher phone (like the padron): it never enters an event or a sync. */
export interface Contactos {
  tutor?: { correo?: string; telefono?: string };
  director?: { correo?: string };
  ugel?: { correo?: string };
  familias: ContactoFamilia[];
}

export interface Borrador {
  mensaje: MensajeSaliente;
  destino: Destino;
}

interface Datos {
  eventos: Evento[];
  practica: Practica;
  contexto: ContextoAula | null;
  contactos: Contactos;
  ahora: number;
  enlaceLigero: string;
  institucion: string;
  /** Draft only the variant B message of this family contact. */
  soloIndividual?: string;
}

const DIA = 86_400_000;

/** Drafts for this week. Nothing here sends anything: the teacher previews and approves each batch. */
export function crearBorradores(d: Datos): Borrador[] {
  const p = proyectar(d.eventos);
  const vista = construirVistaEvidencias(p);
  const avance = avancePorGrupo(p, medicionesEsperadas(d.practica.protocolo));
  const cobertura = coberturaPorCapacidad(vista);
  const semana = semanaDeLima(d.ahora);
  // Weekly messages expire on Wednesday 18:00 Lima (23:00 UTC): after that they merge into the next summary.
  const vigenteHasta = new Date(semana.lunesMs + 9 * DIA + 18 * 3_600_000 + 5 * 3_600_000).toISOString();
  const nuevoId = (n: number) => crearUlid(d.ahora + n, () => (n * 0.137) % 1);
  const frase = fraseLocal(d.contexto);
  const salida: Borrador[] = [];
  let n = 0;
  /** The opaque guardian reference of the destination is the recipient key, never the address. */
  const agregar = (mensaje: Omit<Parameters<typeof construirMensajeSaliente>[0], 'id'>, sobre: Omit<Destino, 'ref'>) => {
    const destino: Destino = { ...sobre, ref: mensaje.destinatarioClave };
    n += 1;
    salida.push({ mensaje: construirMensajeSaliente({ id: nuevoId(n), ...mensaje }), destino });
  };

  if (d.soloIndividual) {
    const c = d.contactos.familias.find((f) => f.id === d.soloIndividual);
    if (c?.alta && c.individual) {
      const r = renderFamilia({ ...entradaFamilia(d.practica, d.enlaceLigero, d.ahora, frase, c.lengua), variante: 'B', nombre: c.individual.nombre, linea: c.individual.linea });
      agregar({ plantilla: 'familia_semanal_b', periodo: semana.lunes, destinatarioClave: `familia:${c.id}`, renderizado: r, vigenteHasta, consentimientoRef: `alta-familia:${c.id}`, lengua: c.lengua }, { canal: 'whatsapp', direccion: c.telefono });
    }
    return salida;
  }

  const t = d.contactos.tutor;
  if (t?.correo || t?.telefono) {
    const r = renderTutora(
      componerTutora({
        p, vista, avance, cobertura, fechaIni: semana.lunes, fechaFin: semana.viernes, exhibiciones: p.clase ? 1 : 0, enlaceApp: d.enlaceLigero.split('#')[0] + '#/docente',
        sincronizadoHasta: 'este celular', mensajesPorAprobar: d.contactos.familias.filter((f) => f.alta).length ? 1 : 0, ...(frase ? { fraseLocal: frase } : {}),
      }),
    );
    if (t.correo) agregar({ plantilla: 'tutora_semanal', periodo: semana.lunes, destinatarioClave: 'tutora', renderizado: r, vigenteHasta, consentimientoRef: 'tutora' }, { canal: 'correo', direccion: t.correo });
    if (t.telefono) agregar({ plantilla: 'tutora_semanal', periodo: semana.lunes, destinatarioClave: 'tutora-wa', renderizado: r, vigenteHasta, consentimientoRef: 'tutora' }, { canal: 'whatsapp', direccion: t.telefono });
  }

  for (const c of d.contactos.familias.filter((f) => f.alta)) {
    const r = renderFamilia(entradaFamilia(d.practica, d.enlaceLigero, d.ahora, frase, c.lengua));
    agregar({ plantilla: 'familia_semanal_a', periodo: semana.lunes, destinatarioClave: `familia:${c.id}`, renderizado: r, vigenteHasta, consentimientoRef: `alta-familia:${c.id}`, lengua: c.lengua }, { canal: 'whatsapp', direccion: c.telefono });
  }

  if (d.contactos.director?.correo) {
    const mes = new Date(d.ahora - 5 * 3_600_000).toISOString().slice(0, 7);
    const r = renderInforme(
      componerDirector({ p, cobertura, institucion: d.institucion, mes, seccion: p.clase ? `${p.clase.grado}.º ${p.clase.seccion}` : 'Sección', ultimaSync: semana.viernes, exhibiciones: p.clase ? 1 : 0, datosSimulados: true }),
    );
    agregar(
      { plantilla: 'director_mensual', periodo: mes, destinatarioClave: 'director', renderizado: r, vigenteHasta: new Date(d.ahora + 30 * DIA).toISOString(), consentimientoRef: 'director' },
      { canal: 'correo', direccion: d.contactos.director.correo },
    );
  }
  return salida;
}
