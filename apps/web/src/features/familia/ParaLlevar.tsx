import type { Practica } from '@rikuy/contracts';
import { renderFamilia, type PictoId } from '@rikuy/evidencia';
import { useMemo, useState } from 'react';
import { QrAnimado } from '../docente/componentes/QrAnimado.tsx';
import { fraseLocal } from '../docente/estado/contexto.ts';
import { useAcciones, useProyeccion, useServicios } from '../docente/Proveedor.tsx';
import { compartirPorWhatsApp, depsDelNavegador, type DepsCompartir, type ResultadoCompartir } from './compartir.ts';
import { urlDeFamilia } from './enlace.ts';
import { construirHoja } from './hoja.ts';
import { HojaA4 } from './HojaA4.tsx';
import { pictogramaDeMaterial } from '@rikuy/evidencia';

const ESTADOS: Record<ResultadoCompartir, string> = {
  compartido: 'Preparado en WhatsApp. Cuando lo envíes, avísale a las familias que lo busquen.',
  cancelado: 'No se envió. Puedes intentarlo otra vez.',
  enlace_wame: 'Se abrió WhatsApp con el mensaje listo. Tú tocas «Enviar».',
};

const FECHA = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function datosDeMensaje(practica: Practica, url: string, hoy: number, local: string | null) {
  const corto = (practica.titulo.split(':')[0] ?? practica.titulo).trim();
  const pictogramas = [...new Set(practica.materiales.map((m) => pictogramaDeMaterial(m.nombre)))].slice(0, 3) as PictoId[];
  const lunes = hoy - ((new Date(hoy).getUTCDay() + 6) % 7) * 86_400_000;
  return {
    variante: 'A' as const,
    fechaIni: FECHA(lunes),
    fechaFin: FECHA(lunes + 4 * 86_400_000),
    verbo: 'trabajaron con',
    exhibicionCorta: corto.charAt(0).toLowerCase() + corto.slice(1),
    preguntaCasa: practica.preguntaGuia,
    lengua: 'es' as const,
    enlaceLigero: url,
    pictogramas,
    ...(local ? { fraseLocal: local } : {}),
  };
}

/** T-14, T-15, T-16: take-home package by QR, WhatsApp and a printable A4 sheet. */
export function ParaLlevar({ deps, base }: { deps?: DepsCompartir; base?: string }) {
  const { p } = useProyeccion();
  const { practica, contexto } = useAcciones();
  const srv = useServicios();
  const [lengua, setLengua] = useState<'es' | 'quy'>('es');
  const [estado, setEstado] = useState<ResultadoCompartir | null>(null);
  const [preparados, setPreparados] = useState({ qr: 0, whatsapp: 0, impresas: 0 });
  const clase = p.clase;

  const paquete = useMemo(() => {
    if (!clase || !practica) return null;
    return { v: 1, tipo: 'practica', claseId: clase.id, emisor: clase.docenteDispositivo, creado: clase.creada, cuerpo: practica, firma: srv.cripto.firmar(`practica:${clase.id}`) };
  }, [clase, practica, srv]);

  const origen = base ?? (typeof location === 'undefined' ? 'https://rikuy.app/' : `${location.origin}${location.pathname}`);
  const url = useMemo(() => (paquete ? urlDeFamilia(origen, paquete) : ''), [paquete, origen]);
  const marcos = useMemo(() => (paquete ? srv.codec.codificar('P', paquete) : []), [paquete, srv]);

  if (!clase || !practica || !paquete) return <p className="dc-card">Primero crea una clase en «Hoy».</p>;

  const mensaje = renderFamilia(datosDeMensaje(practica, url, srv.ahora(), fraseLocal(contexto)));
  const hoja = construirHoja(practica, { lengua, codigoClase: clase.codigo });
  const hayQuechua = practica.textos?.quy?.revisado === true;

  async function compartir() {
    const r = await compartirPorWhatsApp({ texto: mensaje.whatsapp.replace(url, '').trim(), url, titulo: `Para llevar · ${practica?.titulo ?? ''}` }, deps ?? depsDelNavegador());
    setEstado(r);
    if (r !== 'cancelado') setPreparados((x) => ({ ...x, whatsapp: x.whatsapp + 1 }));
  }

  return (
    <>
      <section className="dc-card dc-noprint" aria-labelledby="llevar">
        <h2 id="llevar">Para llevar · {practica.titulo}</h2>
        <p className="dc-muted">Elige cómo llega a casa. Registrar no es entregar: cada canal dice lo que pasó de verdad.</p>
        <p style={{ margin: 0 }}>
          Preparados: <strong>{preparados.qr}</strong> por QR · <strong>{preparados.whatsapp}</strong> por WhatsApp · <strong>{preparados.impresas}</strong> hojas impresas.
        </p>
      </section>

      <section className="dc-card dc-noprint" aria-labelledby="llevar-qr">
        <h2 id="llevar-qr">QR a cada grupo</h2>
        <QrAnimado marcos={marcos} etiqueta="Código QR del paquete para llevar" />
        <button type="button" className="dc-btn" onClick={() => setPreparados((x) => ({ ...x, qr: x.qr + 1 }))}>
          Un grupo ya lo leyó
        </button>
      </section>

      <section className="dc-card dc-noprint" aria-labelledby="llevar-wa">
        <h2 id="llevar-wa">WhatsApp a familias</h2>
        <pre aria-label="Vista previa del mensaje" style={{ whiteSpace: 'pre-wrap', margin: 0, font: 'inherit', background: 'var(--rk-surface-2)', padding: 12, borderRadius: 12 }}>{mensaje.whatsapp}</pre>
        <p className="dc-muted">Mensaje del grupo: no lleva el nombre de ningún niño. Para un mensaje con nombre, usa «Reportes» y apruébalo uno por uno.</p>
        <button type="button" className="dc-btn dc-btn--primary" onClick={() => void compartir()}>
          Compartir por WhatsApp
        </button>
        {estado ? <p role="status" style={{ margin: 0 }}>{ESTADOS[estado]}</p> : null}
        <p className="dc-muted">El enlace funciona sin internet una vez abierto. El contenido va dentro del enlace; ningún servidor lo ve.</p>
      </section>

      <section className="dc-card dc-noprint" aria-labelledby="llevar-a4">
        <h2 id="llevar-a4">Hoja A4 impresa</h2>
        {hayQuechua ? (
          <div className="dc-row" role="group" aria-label="Lengua de la hoja">
            <button type="button" className="dc-btn" aria-pressed={lengua === 'es'} onClick={() => setLengua('es')}>Castellano</button>
            <button type="button" className="dc-btn" aria-pressed={lengua === 'quy'} onClick={() => setLengua('quy')}>Castellano y quechua</button>
          </div>
        ) : (
          <p className="dc-muted">Solo se imprime quechua con estado «revisado por hablante». Esta práctica aún no lo tiene.</p>
        )}
        <button
          type="button"
          className="dc-btn dc-btn--primary"
          onClick={() => {
            setPreparados((x) => ({ ...x, impresas: x.impresas + 1 }));
            window.print();
          }}
        >
          Imprimir o guardar PDF
        </button>
      </section>

      <div className="a4-vista a4-escala" aria-label="Vista previa de la hoja A4">
        <HojaA4 hoja={hoja} />
      </div>
    </>
  );
}
