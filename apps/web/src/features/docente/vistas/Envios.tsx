import type { ItemSalida } from '../entrega/salida.ts';
import { useState, type FormEvent } from 'react';
import { enlaceWame } from '../../familia/compartir.ts';
import { urlDeFamilia } from '../../familia/enlace.ts';
import { crearBorradores, type ContactoFamilia, type Contactos } from '../entrega/borradores.ts';
import { useEntrega, useSalida } from '../entrega/servicios.tsx';
import { useClase, useEnLinea, useProyeccion, useServicios } from '../Proveedor.tsx';

const ETIQUETA: Record<ItemSalida['estado'], { t: string; c: string }> = {
  borrador: { t: 'Por aprobar', c: 'dc-chip dc-chip--warn' },
  en_cola: { t: 'En cola · se envía al sincronizar', c: 'dc-chip dc-chip--sync' },
  enviado_proveedor: { t: 'Enviado', c: 'dc-chip dc-chip--sync' },
  entregado: { t: 'Entregado', c: 'dc-chip dc-chip--ok' },
  fallido: { t: 'No se pudo enviar. Sigue en este celular.', c: 'dc-chip dc-chip--warn' },
  rebotado: { t: 'La dirección no funciona', c: 'dc-chip dc-chip--warn' },
  baja: { t: 'La familia pidió no recibir más', c: 'dc-chip dc-chip--off' },
  vencido: { t: 'Venció: no se envía tarde', c: 'dc-chip dc-chip--off' },
  descartado: { t: 'Descartado', c: 'dc-chip dc-chip--off' },
};

const NOMBRE_PLANTILLA: Record<string, string> = {
  tutora_semanal: 'Resumen semanal para ti',
  familia_semanal_a: 'Mensaje semanal a la familia (del grupo)',
  familia_semanal_b: 'Mensaje con nombre (1:1)',
  director_mensual: 'Informe mensual al director',
  ugel_mensual: 'Informe mensual a la UGEL',
};

function parseFamilias(texto: string): ContactoFamilia[] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      const [alias = '', telefono = '', lengua = 'es'] = l.split(',').map((x) => x.trim());
      return { id: `f${i + 1}`, alias, telefono, lengua: lengua === 'quy' ? ('quy' as const) : ('es' as const), alta: true };
    })
    .filter((f) => f.alias && f.telefono);
}

/** T-22: outbox. Weekly tutor digest, family messages and the monthly principal report, approved before they leave. */
export function Envios() {
  const entrega = useEntrega();
  const { items, refrescar } = useSalida();
  const eventos = useClase((x) => x.eventos);
  const practica = useClase((x) => x.practica);
  const contexto = useClase((x) => x.contexto);
  const srv = useServicios();
  const { p } = useProyeccion();
  const enLinea = useEnLinea();
  const [contactos, setContactos] = useState<Contactos>(() => entrega.contactos.leer());
  const [vistos, setVistos] = useState<Record<string, boolean>>({});
  const [aviso, setAviso] = useState<string | null>(null);

  const guardarContactos = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const campo = (k: string) => String(f.get(k) ?? '').trim();
    const nuevo: Contactos = {
      tutor: { correo: campo('tutorCorreo') || undefined, telefono: campo('tutorTelefono') || undefined },
      director: { correo: campo('directorCorreo') || undefined },
      ugel: { correo: campo('ugelCorreo') || undefined },
      familias: parseFamilias(campo('familias')),
    };
    entrega.contactos.escribir(nuevo);
    setContactos(nuevo);
    setAviso('Contactos guardados solo en este celular.');
  };

  async function preparar() {
    if (!practica || !p.clase) return;
    const paquete = { v: 1, tipo: 'practica', claseId: p.clase.id, emisor: p.clase.docenteDispositivo, creado: p.clase.creada, cuerpo: practica, firma: srv.cripto.firmar(`practica:${p.clase.id}`) };
    const base = typeof location === 'undefined' ? 'https://rikuy.app/' : `${location.origin}${location.pathname}`;
    const borradores = crearBorradores({ eventos, practica, contexto, contactos, ahora: entrega.ahora(), enlaceLigero: urlDeFamilia(base, paquete), institucion: 'Mi colegio' });
    for (const b of borradores) await entrega.cola.agregarBorrador(b.mensaje, b.destino);
    setAviso(borradores.length ? `${borradores.length} borradores listos. Revísalos y apruébalos.` : 'Agrega al menos un contacto para preparar mensajes.');
    refrescar();
  }

  async function ver(id: string) {
    await entrega.cola.marcarVista(id);
    setVistos((v) => ({ ...v, [id]: true }));
    refrescar();
  }

  async function aprobarLote() {
    const ids = items.filter((i) => i.estado === 'borrador' && i.vistaPrevia).map((i) => i.id);
    const r = await entrega.cola.aprobarLote(ids, 'docente');
    setAviso(`${r.aprobados.length} aprobados. ${r.rechazados.length ? `${r.rechazados.length} se aprueban uno por uno.` : ''}`.trim());
    refrescar();
  }

  async function sincronizar() {
    await entrega.cola.drenar({ enLinea: entrega.enLinea(), puertos: entrega.puertos });
    await entrega.cola.refrescarEstados(entrega.puertos);
    refrescar();
  }

  const porAprobar = items.filter((i) => i.estado === 'borrador');
  return (
    <>
      <section className="dc-card" aria-labelledby="env">
        <h2 id="env">Bandeja de envíos</h2>
        <p className="dc-muted">Nada sale sin que lo veas y lo apruebes. Sin red, los mensajes esperan aquí y salen cuando el celular sincroniza.</p>
        <div className="dc-row">
          {entrega.simulado ? <span className="dc-chip dc-chip--warn">Datos simulados · no se envía a nadie</span> : null}
          <span className="dc-chip dc-chip--off">{enLinea ? 'En línea' : 'Sin red · todo funciona'}</span>
        </div>
        {aviso ? <p role="status" style={{ margin: 0 }}>{aviso}</p> : null}
        <div className="dc-row">
          <button type="button" className="dc-btn dc-btn--primary" onClick={() => void preparar()}>
            Preparar mensajes de la semana
          </button>
          <button type="button" className="dc-btn" onClick={() => void sincronizar()}>
            Sincronizar ahora
          </button>
        </div>
      </section>

      {items.length === 0 ? <p className="dc-card dc-muted">Todavía no hay mensajes. Guarda tus contactos y toca «Preparar mensajes de la semana».</p> : null}

      {porAprobar.length > 1 ? (
        <section className="dc-card" aria-label="Aprobar en lote">
          <p style={{ margin: 0 }}>{porAprobar.filter((i) => i.vistaPrevia).length} de {porAprobar.length} borradores vistos.</p>
          <button type="button" className="dc-btn dc-btn--tonal" disabled={!porAprobar.some((i) => i.vistaPrevia)} onClick={() => void aprobarLote()}>
            Aprobar los que ya vi
          </button>
        </section>
      ) : null}

      {items.map((i) => {
        const e = ETIQUETA[i.estado];
        const individual = i.mensaje.plantilla === 'familia_semanal_b';
        return (
          <article key={i.id} className="dc-card" aria-label={NOMBRE_PLANTILLA[i.mensaje.plantilla]}>
            <h3>{NOMBRE_PLANTILLA[i.mensaje.plantilla]}</h3>
            <span className="dc-muted">
              Canal: {i.destino.canal === 'correo' ? 'correo' : 'WhatsApp'} · destino guardado solo en este celular
            </span>
            <span className={e.c} role="status">
              {i.estado === 'enviado_proveedor' && i.manual ? 'Preparado en WhatsApp: tú tocas Enviar' : e.t}
            </span>
            <details onToggle={(ev) => ev.currentTarget.open && !i.vistaPrevia && void ver(i.id)}>
              <summary>Vista previa</summary>
              <pre style={{ whiteSpace: 'pre-wrap', font: 'inherit', margin: '8px 0' }}>{i.mensaje.cuerpo.texto}</pre>
              {i.mensaje.cuerpo.html ? <iframe title={`Vista del correo ${i.id}`} sandbox="" srcDoc={i.mensaje.cuerpo.html} style={{ width: '100%', height: 360, border: '2px solid var(--rk-border)', borderRadius: 12 }} /> : null}
            </details>
            {i.estado === 'borrador' ? (
              <span className="dc-row">
                <button type="button" className="dc-btn dc-btn--primary" disabled={!(i.vistaPrevia || vistos[i.id])} onClick={() => void entrega.cola.aprobar(i.id, 'docente').then(refrescar)}>
                  {individual ? 'Aprobar este mensaje' : 'Aprobar'}
                </button>
                <button type="button" className="dc-btn" onClick={() => void entrega.cola.descartar(i.id).then(refrescar)}>
                  Descartar
                </button>
                {!i.vistaPrevia ? <span className="dc-muted">Abre la vista previa para poder aprobar.</span> : null}
              </span>
            ) : null}
            {i.estado === 'fallido' || i.estado === 'rebotado' ? (
              <a className="dc-btn" href={enlaceWame(i.mensaje.cuerpo.texto, i.destino.canal === 'whatsapp' ? i.destino.direccion : undefined)} target="_blank" rel="noopener noreferrer">
                Enviar yo por WhatsApp
              </a>
            ) : null}
          </article>
        );
      })}

      <form className="dc-card" onSubmit={guardarContactos} aria-labelledby="ctc">
        <h2 id="ctc">Contactos</h2>
        <p className="dc-muted">Se guardan solo en este celular. No salen en QR, hub, informes ni eventos.</p>
        <div className="dc-field"><label htmlFor="tutorCorreo">Tu correo</label><input id="tutorCorreo" name="tutorCorreo" type="email" className="dc-input" defaultValue={contactos.tutor?.correo} /></div>
        <div className="dc-field"><label htmlFor="tutorTelefono">Tu WhatsApp</label><input id="tutorTelefono" name="tutorTelefono" type="tel" className="dc-input" defaultValue={contactos.tutor?.telefono} /></div>
        <div className="dc-field"><label htmlFor="directorCorreo">Correo del director</label><input id="directorCorreo" name="directorCorreo" type="email" className="dc-input" defaultValue={contactos.director?.correo} /></div>
        <div className="dc-field"><label htmlFor="ugelCorreo">Correo de la UGEL</label><input id="ugelCorreo" name="ugelCorreo" type="email" className="dc-input" defaultValue={contactos.ugel?.correo} /></div>
        <div className="dc-field">
          <label htmlFor="familias">Familias que pidieron recibir mensajes (alias, WhatsApp, lengua)</label>
          <textarea id="familias" name="familias" className="dc-input" defaultValue={contactos.familias.map((f) => `${f.alias}, ${f.telefono}, ${f.lengua}`).join('\n')} placeholder="E07, +51 900 000 000, es" />
        </div>
        <button type="submit" className="dc-btn">Guardar contactos</button>
      </form>
    </>
  );
}
