/**
 * "Nuestra piedra": the group names its Rikuy stone and picks a cord and a frame. Options unlock with the
 * class quipu (collective). Nothing is lost by not coming back: no hunger, no streaks.
 */
import { CORDONES, MARCOS, colorDe, elegirPiedra, opcionesPiedra } from '@rikuy/campus';
import { RUTAS } from '@rikuy/contracts';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { useEstadoGrupo, useNudosAula } from './estadoGrupo.ts';
import { Rikuy } from './Iconos.tsx';
import './mundo.css';

export function PiedraPagina() {
  const { piedra, guardarPiedra } = useEstadoGrupo();
  const nudos = useNudosAula();
  const [borrador, setBorrador] = useState(piedra);
  const [aviso, setAviso] = useState('');
  const idNombre = useId();
  const opciones = opcionesPiedra(nudos);

  const guardar = () => {
    const r = elegirPiedra(borrador, nudos);
    if (r.ok) {
      guardarPiedra(r.piedra);
      setAviso(`Listo: su piedra se llama ${r.piedra.nombre}.`);
    } else {
      setAviso(r.error === 'nombre' ? 'El nombre lleva de 2 a 16 letras, sin números ni enlaces.' : 'Esa opción todavía está cerrada.');
    }
  };

  return (
    <section className="rk-mundo" aria-labelledby="titulo-piedra">
      <header className="rk-sign" style={{ background: 'var(--m-primary)' }}>
        <h2 id="titulo-piedra">Nuestra piedra</h2>
      </header>
      <div style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
        <Rikuy tam={160} cordon={colorDe(CORDONES, borrador.cordon)} marco={colorDe(MARCOS, borrador.marco)} />
      </div>
      <section className="rk-panel">
        <label htmlFor={idNombre}>Nombre de la piedra</label>
        <input
          id={idNombre}
          value={borrador.nombre}
          maxLength={16}
          onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
          style={{ font: 'inherit', minHeight: 48, padding: '0 12px', border: '2px solid var(--m-border)', borderRadius: 12 }}
        />
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend>Cordón</legend>
          <div className="rk-fila">
            {opciones.cordones.map((c) => (
              <button
                key={c.id}
                type="button"
                className="rk-btn"
                aria-pressed={borrador.cordon === c.id}
                aria-disabled={!c.libre ? 'true' : undefined}
                onClick={() => c.libre && setBorrador({ ...borrador, cordon: c.id })}
              >
                <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: 4, background: c.color, display: 'inline-block' }} />
                {c.nombre}
                {!c.libre && ` (se abre con ${c.nudos} nudos del aula)`}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend>Marco</legend>
          <div className="rk-fila">
            {opciones.marcos.map((m) => (
              <button
                key={m.id}
                type="button"
                className="rk-btn"
                aria-pressed={borrador.marco === m.id}
                aria-disabled={!m.libre ? 'true' : undefined}
                onClick={() => m.libre && setBorrador({ ...borrador, marco: m.id })}
              >
                <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: 4, background: m.color, display: 'inline-block' }} />
                {m.nombre}
                {!m.libre && ` (se abre con ${m.nudos} nudos del aula)`}
              </button>
            ))}
          </div>
        </fieldset>
        <small>El quipu del aula tiene {nudos} nudos. Las opciones se abren para todos y nunca se pierden.</small>
        <button type="button" className="rk-btn" data-primario="" onClick={guardar}>
          Guardar nuestra piedra
        </button>
        <p role="status" aria-live="polite" style={{ margin: 0 }}>
          {aviso}
        </p>
      </section>
      <p style={{ padding: '0 16px' }}>
        <Link to={RUTAS.museo}>Volver al museo</Link>
      </p>
    </section>
  );
}
