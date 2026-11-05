/**
 * Quipu tab: the class cord. Knots come from the @rikuy/quipu ledger (the same one the museum reads for
 * "Nuestra piedra"); they are cooperative and collective. No ranking, no scores, no streaks, no purchases:
 * knots are never spent, they only open things for everyone.
 */
import type { MotivoQuipu } from '@rikuy/contracts';
import { opcionesPiedra } from '@rikuy/campus';
import { nudosPorMotivo } from '@rikuy/quipu';
import { KnotIcon } from '@rikuy/ui';
import { Link } from 'react-router';
import { useAyudante } from './ayudante/servicio.ts';
import { AULA_DEMO, libroQuipuAula, saldoQuipuAula } from './estadoGrupo.ts';
import { TarjetaNarrable } from '../../shell/TarjetaNarrable.tsx';
import { grupoActual } from './grupo.ts';

/** Why knots were earned, in the words of the class (the teacher correction is bookkeeping, not a reason). */
const MOTIVOS: Partial<Record<MotivoQuipu, string>> = {
  ayudo_a_otro_grupo: 'Ayudar a otro grupo',
  todos_predijeron: 'Predecir antes de medir, todos juntos',
  medicion_completa: 'Completar la medición',
  conclusion_con_dato: 'Concluir con su dato',
  reto_cooperativo: 'Resolver un reto en cooperación',
};

const MAX_NUDOS_DIBUJADOS = 24;
const plural = (n: number) => `${n} ${n === 1 ? 'nudo' : 'nudos'}`;

const LEYENDA = [
  ['simple', 'Nudo simple: terminaron una exhibición'],
  ['largo', 'Nudo largo: explicaron algo a otro grupo'],
  ['ocho', 'Nudo en ocho: resolvieron algo juntos'],
] as const;

export function QuipuPagina() {
  const ayudas = useAyudante((s) => s.estado.nudos);
  const aulaId = grupoActual().claseId ?? AULA_DEMO;
  const total = saldoQuipuAula(ayudas, aulaId);
  const porMotivo = nudosPorMotivo(libroQuipuAula(ayudas, aulaId), aulaId);
  const motivos = (Object.keys(MOTIVOS) as MotivoQuipu[]).filter((m) => (porMotivo[m] ?? 0) > 0);

  const { cordones, marcos } = opcionesPiedra(total);
  const todas = [...cordones, ...marcos];
  const abiertas = todas.filter((o) => o.libre && o.nudos > 0).sort((a, b) => a.nudos - b.nudos);
  const proxima = todas.filter((o) => !o.libre).sort((a, b) => a.nudos - b.nudos)[0];

  const resumen =
    total === 0
      ? 'Aún no hay nudos. Los nudos se ganan ayudando al grupo.'
      : `El quipu del aula tiene ${plural(total)}. Cada nudo lo hicieron entre todos. Nada se gasta ni se pierde.`;
  const dibujados = Math.min(total, MAX_NUDOS_DIBUJADOS);
  return (
    <>
      <TarjetaNarrable id="quipu-aula" titulo="El quipu de nuestra aula" texto={resumen}>
        <div aria-hidden="true" className="mt-3 flex flex-wrap items-end gap-1 border-t-4 border-primary pt-1 text-primary">
          {Array.from({ length: dibujados }, (_, i) => (
            <KnotIcon key={i} tipo={i % 5 === 4 ? 'ocho' : i % 3 === 2 ? 'largo' : 'simple'} size={28} />
          ))}
          {total > dibujados ? <span className="text-body font-bold">+{total - dibujados}</span> : null}
        </div>
      </TarjetaNarrable>

      {motivos.length > 0 ? (
        <section aria-labelledby="quipu-motivos" className="flex flex-col gap-2">
          <h2 id="quipu-motivos" className="m-0 text-title-sm font-bold">
            Cómo se ganaron
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {motivos.map((m) => (
              <li key={m} className="flex min-h-12 items-center justify-between gap-3 rounded-ctl border-2 border-line bg-surface px-3 py-2">
                <span className="text-body">{MOTIVOS[m]}</span>
                <b className="text-body">{plural(porMotivo[m] ?? 0)}</b>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="quipu-abierto" className="flex flex-col gap-2">
        <h2 id="quipu-abierto" className="m-0 text-title-sm font-bold">
          Lo que abre el quipu
        </h2>
        {abiertas.length > 0 ? (
          <ul aria-label="Ya se abrió para todos" className="m-0 flex list-none flex-col gap-2 p-0">
            {abiertas.map((o) => (
              <li key={o.id + o.nombre} className="flex min-h-12 items-center gap-3 rounded-ctl border-2 border-line bg-surface px-3 py-2">
                <span aria-hidden="true" className="inline-block h-4 w-4 rounded" style={{ background: o.color }} />
                <span className="text-body">{o.nombre}, abierto para todos</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="m-0 text-body">
          {proxima ? `Faltan ${plural(proxima.nudos - total)} para abrir ${proxima.nombre}.` : 'Ya se abrieron todas las opciones de la piedra.'}
        </p>
        <Link to="/museo/piedra" className="inline-flex min-h-12 items-center justify-center rounded-ctl border-2 border-line bg-surface px-4 font-bold text-ink no-underline">
          Nuestra piedra
        </Link>
      </section>

      <section aria-labelledby="leyenda-nudos" className="flex flex-col gap-2">
        <h2 id="leyenda-nudos" className="m-0 text-title-sm font-bold">
          Tipos de nudo
        </h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {LEYENDA.map(([tipo, texto]) => (
            <li key={tipo} className="flex min-h-12 items-center gap-3 rounded-ctl border-2 border-line bg-surface px-3 py-2">
              <KnotIcon tipo={tipo} size={32} className="text-primary" />
              <span className="text-body">{texto}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
