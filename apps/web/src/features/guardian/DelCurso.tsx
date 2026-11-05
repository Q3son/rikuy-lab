import type { AgregadoCurso } from '@rikuy/senales';
import './guardian.css';

export interface DelCursoProps {
  agregado: AgregadoCurso;
  totalClase?: number;
  onApagarClase(): void;
}

/** T-06c "del curso": class-level counts from 5 participants; one sentence about instruction, not students. */
export function DelCurso({ agregado, totalClase, onApagarClase }: DelCursoProps) {
  if (agregado.estado === 'suprimido') return <p>{agregado.mensaje}</p>;
  return (
    <section className="rk-gd" aria-label="Guardián del grupo">
      <h2>Guardián del grupo</h2>
      <p>{totalClase ? `${agregado.participan} de ${totalClase} participan` : `${agregado.participan} participan`}</p>
      {agregado.oracion && <p>{agregado.oracion}</p>}
      <table aria-label="Pedidos de pista cada 5 minutos">
        <thead>
          <tr>
            <th scope="col">Minutos</th>
            <th scope="col">Pedidos de pista</th>
          </tr>
        </thead>
        <tbody>
          {agregado.pistasPorBin.map((b) => (
            <tr key={b.desdeMin}>
              <th scope="row">{b.desdeMin} a {b.hastaMin}</th>
              <td>{b.pedidos}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={onApagarClase}>Apagar para toda la clase</button>
    </section>
  );
}
