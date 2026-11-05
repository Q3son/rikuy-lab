/** Port `GeneradorPdf` (FUNCIONES_EXTRA 1.4.3). The offline adapter produces printable HTML; a server adapter may add real PDF. */
import { htmlImprimible } from './html.ts';
import type { ReporteMensual } from './mensual.ts';

export interface ArchivoGenerado {
  nombre: string;
  tipoMime: 'text/html' | 'application/pdf';
  contenido: string | Uint8Array;
}

export interface GeneradorPdf {
  generar(reporte: ReporteMensual): Promise<ArchivoGenerado>;
}

/** Offline adapter: no network. The browser prints it to PDF. */
export const generadorHtmlImprimible: GeneradorPdf = {
  async generar(reporte) {
    const quien = reporte.tipo === 'director_mensual' ? `director-${reporte.periodo.mes}-${reporte.colegioCodigo ?? 'sin-codigo'}` : `ugel-${reporte.periodo.mes}-${reporte.ugelCodigo ?? 'sin-codigo'}`;
    return { nombre: `informe-${quien}.html`, tipoMime: 'text/html', contenido: htmlImprimible(reporte) };
  },
};
