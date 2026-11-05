import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { CATALOGO_PRACTICAS } from '../estado/clase.ts';
import { ContextoAula, listaDeTexto } from '../estado/contexto.ts';
import { useAcciones } from '../Proveedor.tsx';

/** T-00: create a class with no cloud account, plus the class context (TeachFlow fields). */
export function CrearClase() {
  const acciones = useAcciones();
  const ir = useNavigate();
  const [error, setError] = useState<string | null>(null);

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texto = (k: string) => String(f.get(k) ?? '').trim();
    const grado = Number(texto('grado'));
    const estudiantes = Number(texto('estudiantes'));
    if (!(grado >= 1 && grado <= 6) || !(estudiantes >= 1 && estudiantes <= 60) || !texto('seccion')) {
      setError('Revisa el grado (1 a 6), la sección y el número de estudiantes (1 a 60).');
      return;
    }
    const region = texto('region');
    let contexto: ContextoAula | null = null;
    if (region) {
      const r = ContextoAula.safeParse({
        region,
        zona: texto('zona') || 'rural',
        lenguaComunidad: texto('lengua') || 'es',
        festividades: listaDeTexto(texto('festividades')),
        floraFauna: listaDeTexto(texto('floraFauna')),
        clima: texto('clima') || undefined,
        materialesCaseros: listaDeTexto(texto('materiales')),
      });
      if (!r.success) {
        setError('Revisa el contexto del aula: cada dato debe tener menos de 60 letras.');
        return;
      }
      contexto = r.data;
    }
    const padron = texto('padron').split('\n').map((s) => s.trim()).filter(Boolean);
    acciones.crearClase({ grado, seccion: texto('seccion').toUpperCase().slice(0, 4), lengua: texto('lengua') === 'quy' ? 'quy' : 'es', estudiantes, contexto, padron });
    ir('/docente');
  }

  return (
    <form className="dc-card" onSubmit={enviar} aria-labelledby="t-nueva">
      <h2 id="t-nueva">Crear clase</h2>
      <div className="dc-field">
        <label htmlFor="practica">Práctica</label>
        <select id="practica" name="practica" className="dc-input" defaultValue={CATALOGO_PRACTICAS[0].id}>
          {CATALOGO_PRACTICAS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.titulo}
            </option>
          ))}
        </select>
      </div>
      <div className="dc-row">
        <div className="dc-field" style={{ flex: 1 }}>
          <label htmlFor="grado">Grado</label>
          <input id="grado" name="grado" className="dc-input" type="number" min={1} max={6} defaultValue={2} />
        </div>
        <div className="dc-field" style={{ flex: 1 }}>
          <label htmlFor="seccion">Sección</label>
          <input id="seccion" name="seccion" className="dc-input" maxLength={4} defaultValue="B" />
        </div>
        <div className="dc-field" style={{ flex: 1 }}>
          <label htmlFor="estudiantes">Estudiantes</label>
          <input id="estudiantes" name="estudiantes" className="dc-input" type="number" min={1} max={60} defaultValue={12} />
        </div>
      </div>
      <div className="dc-field">
        <label htmlFor="lengua">Lengua de la comunidad</label>
        <select id="lengua" name="lengua" className="dc-input" defaultValue="es">
          <option value="es">Castellano</option>
          <option value="quy">Quechua (Ayacucho-Chanka)</option>
        </select>
      </div>

      <fieldset className="dc-field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend>Contexto del aula (opcional)</legend>
        <p className="dc-muted">Sirve para elegir ejemplos locales y una frase en los informes. No lleva datos de personas.</p>
        <label htmlFor="region">Región</label>
        <input id="region" name="region" className="dc-input" placeholder="Arequipa" />
        <label htmlFor="zona">Zona</label>
        <select id="zona" name="zona" className="dc-input" defaultValue="rural">
          <option value="rural">Rural</option>
          <option value="urbana">Urbana</option>
        </select>
        <label htmlFor="festividades">Festividades del año (separadas por comas)</label>
        <input id="festividades" name="festividades" className="dc-input" placeholder="Yaku Raymi, Inti Raymi" />
        <label htmlFor="floraFauna">Cultivos y fauna</label>
        <input id="floraFauna" name="floraFauna" className="dc-input" placeholder="papa, llama, ichu" />
        <label htmlFor="clima">Clima o estación</label>
        <input id="clima" name="clima" className="dc-input" placeholder="época de lluvias" />
        <label htmlFor="materiales">Materiales caseros disponibles</label>
        <input id="materiales" name="materiales" className="dc-input" placeholder="cuerda, piedra, botella" />
      </fieldset>

      <div className="dc-field">
        <label htmlFor="padron">Nombres de tus estudiantes (opcional, uno por línea)</label>
        <textarea id="padron" name="padron" className="dc-input" />
        <span className="dc-muted">Se guardan solo en este celular. Nunca viajan por QR, hub ni informes: los grupos ven alias como E07.</span>
      </div>
      {error ? <p role="alert" style={{ color: 'var(--rk-grana-ink)', margin: 0 }}>{error}</p> : null}
      <button type="submit" className="dc-btn dc-btn--primary">
        Crear clase
      </button>
    </form>
  );
}
