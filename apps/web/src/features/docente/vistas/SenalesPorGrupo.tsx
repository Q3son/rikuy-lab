import { useProyeccion } from '../Proveedor.tsx';

/**
 * Strip of learning-signal aggregates (T-06c). Counts per GROUP and per 5-minute window only:
 * the contract has no student field here, and this component never looks for one.
 */
export function SenalesPorGrupo() {
  const { p } = useProyeccion();
  const filas = p.grupos.map((g) => {
    const ventanas = p.agregadosSenales.filter((a) => a.grupoId === g.id);
    const suma = (k: 'confusion' | 'frustracion' | 'atencion', n: 'bajo' | 'medio' | 'alto') => ventanas.reduce((t, v) => t + v[k][n], 0);
    return { g, ventanas: ventanas.length, suma };
  });
  return (
    <section className="dc-card" aria-labelledby="sg">
      <h2 id="sg">Señales por grupo</h2>
      <p className="dc-muted">Son conteos del grupo, nunca de una persona. Úsalos para decidir a qué mesa acercarte, no para evaluar.</p>
      {filas.every((f) => f.ventanas === 0) ? <p className="dc-muted">Aún no hay lecturas.</p> : null}
      {filas
        .filter((f) => f.ventanas > 0)
        .map(({ g, ventanas, suma }) => (
          <div key={g.id} className="dc-grupo">
            <strong>Grupo {g.apodo}</strong>
            <span className="dc-muted">{ventanas} {ventanas === 1 ? 'ventana' : 'ventanas'} de 5 minutos</span>
            <span>Dudas: {suma('confusion', 'alto')} altas · {suma('confusion', 'medio')} medias · {suma('confusion', 'bajo')} bajas</span>
            <span>Atascos: {suma('frustracion', 'alto')} altos · {suma('frustracion', 'medio')} medios · {suma('frustracion', 'bajo')} bajos</span>
            <span>Atención: {suma('atencion', 'alto')} alta · {suma('atencion', 'medio')} media · {suma('atencion', 'bajo')} baja</span>
          </div>
        ))}
    </section>
  );
}
