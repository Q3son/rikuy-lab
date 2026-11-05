import type { EtiquetaDocente, SugerenciaAcercamiento } from '@rikuy/senales';
import './guardian.css';

export interface ParaAcercarseProps {
  sugerencias: SugerenciaAcercamiento[];
  /** Maps the pseudonymous id to the class alias (the roster lives only on the teacher phone). */
  alias(estudianteId: string): string;
  onDecidir(sugerenciaId: string, etiqueta: EtiquetaDocente): void;
}

const DECISIONES: { etiqueta: EtiquetaDocente; texto: string }[] = [
  { etiqueta: 'ya_converse', texto: 'Ya conversé' },
  { etiqueta: 'no_era_necesario', texto: 'No era necesario' },
  { etiqueta: 'no_aplica', texto: 'No aplica' },
];

/** T-06c "para acercarse": at most 3 a week, pedagogical wording, the teacher decides. */
export function ParaAcercarse({ sugerencias, alias, onDecidir }: ParaAcercarseProps) {
  if (sugerencias.length === 0) return <p>Esta semana no hay sugerencias.</p>;
  return (
    <section aria-label="Para acercarse" style={{ display: 'grid', gap: 12 }}>
      <h2>Para acercarse esta semana</h2>
      {sugerencias.map((s) => (
        <article key={s.id} className="rk-gd">
          <h3>{alias(s.estudianteId)}</h3>
          <p>{s.texto}</p>
          <p className="rk-gd-aviso">{s.aviso}</p>
          {s.compartido?.textoDelEstudiante && <blockquote>«{s.compartido.textoDelEstudiante}»</blockquote>}
          <details>
            <summary>Guía breve para conversar</summary>
            <ul>
              {s.guiaConversacion.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </details>
          <div className="rk-gd-fila">
            {DECISIONES.map((d) => (
              <button key={d.etiqueta} type="button" onClick={() => onDecidir(s.id, d.etiqueta)}>{d.texto}</button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
