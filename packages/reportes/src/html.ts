/**
 * Printable HTML (DESIGN 12): A4 portrait, readable in black and white, no mascot, no gamification, no remote
 * resources. The browser turns it into a PDF with "Guardar como PDF", with no network.
 */
import type { Celda } from './suprimir.ts';
import type { ReporteMensual } from './mensual.ts';

const esc = (s: string | number): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cel = (c: Celda): string => (c.suprimido ? '&lt;5' : String(c.valor));

const CSS = `
:root{color-scheme:light}
body{font:16px/1.4 system-ui,sans-serif;color:#0d2b33;background:#fff;margin:0;padding:24px;max-width:780px}
h1{font-size:24px;font-weight:800;margin:0 0 4px}
h2{font-size:18px;margin:24px 0 8px;border-bottom:2px solid #0d2b33}
.rule{border:0;border-top:3px solid #0d2b33;margin:8px 0 16px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.kpi{border:2px solid #0d2b33;padding:8px;break-inside:avoid}
.kpi b{display:block;font-size:32px;font-variant-numeric:tabular-nums}
table{border-collapse:collapse;width:100%;break-inside:avoid}
th,td{border-bottom:2px solid #6a7568;padding:4px 6px;text-align:left;font-variant-numeric:tabular-nums}
td.n,th.n{text-align:right}
.chip{display:inline-block;border:2px solid #0d2b33;border-radius:999px;padding:2px 10px;font-weight:700}
footer{margin-top:24px;border-top:2px solid #0d2b33;padding-top:8px;font-size:14px}
@page{size: A4 portrait;margin:14mm}
@media print{body{padding:0;background:#fff;color:#000}.noprint{display:none}h2,.kpis{break-after:avoid}}
`;

function tabla(cabeceras: string[], filas: string[][]): string {
  return `<table><thead><tr>${cabeceras.map((c, i) => `<th${i > 0 ? ' class="n"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas
    .map((f) => `<tr>${f.map((c, i) => `<td${i > 0 ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

export function htmlImprimible(r: ReporteMensual): string {
  const destino = r.tipo === 'director_mensual' ? `Institución educativa ${esc(r.colegioCodigo ?? '')}` : `UGEL ${esc(r.ugelCodigo ?? '')}`;
  const k = r.cifras;
  const kpi = (valor: string, etiqueta: string) => `<div class="kpi"><b>${esc(valor)}</b>${esc(etiqueta)}</div>`;
  const partes: string[] = [
    `<h1>Informe mensual de Ciencia y Tecnología</h1>`,
    `<div>${destino} · ${esc(r.periodo.mes)} (${esc(r.periodo.desde)} a ${esc(r.periodo.hasta)}) ${r.ejemplo ? '<span class="chip">Datos de ejemplo</span>' : ''}</div>`,
    `<hr class="rule">`,
    `<div class="kpis">${kpi(String(k.exhibicionesRealizadas), 'exhibiciones realizadas')}${kpi(String(k.seccionesActivas), 'secciones activas')}${kpi(`${k.sesiones.conEvidencia} de ${k.sesiones.total}`, 'sesiones con evidencia')}${kpi(`${k.diasCierre.cubiertos} de ${k.diasCierre.total}`, 'días de cierre cubiertos')}</div>`,
    `<p>${esc(k.cobertura.leyenda)}.</p>`,
  ];
  if (r.coberturaPorSeccion.length > 0) {
    partes.push(
      `<h2>Cobertura de competencias por sección</h2>`,
      tabla(['Sección', 'Competencia', 'Capacidad', 'Grupos con evidencia'], r.coberturaPorSeccion.flatMap((s) => s.capacidades.map((c) => [esc(s.seccion), String(c.competencia), esc(c.capacidad), cel(c.grupos)]))),
    );
  }
  if (r.conceptosQueCostaron.length > 0) {
    partes.push(`<h2>Conceptos que más costaron</h2>`, tabla(['Concepto', 'Grupos', 'Exhibición sugerida'], r.conceptosQueCostaron.map((c) => [esc(c.etiqueta), cel(c.grupos), esc(c.exhibicionSugerida ?? '')])));
  }
  const c = r.continuidad;
  partes.push(
    `<h2>Continuidad en cierres</h2>`,
    tabla(['Indicador', 'Cantidad'], [['Días de cierre', String(c.diasCierre)], ['Con "Para llevar"', String(c.diasCierreCubiertos)], ['Paquetes enviados', String(c.paquetesEnviados)], ['Paquetes devueltos', String(c.paquetesDevueltos)]]),
    `<h2>Brechas por lengua y conectividad</h2>`,
    tabla(['Indicador', 'Cantidad'], [['Sesiones sin red', String(r.brechas.sesionesSinRed)], ['Horas de audio en quechua usadas', String(r.brechas.horasAudioQuechua)]]),
  );
  if (r.ayudaEntrePares.length > 0) {
    partes.push(`<h2>Ayuda entre pares</h2>`, tabla(['Sección', 'Pedidos', 'Cierres'], r.ayudaEntrePares.map((a) => [esc(a.seccion), cel(a.pedidos), cel(a.cierres)])));
  }
  if (r.tablaTerritorial) {
    const t = r.tablaTerritorial;
    partes.push(
      `<h2>Tabla territorial (ordenada por código modular)</h2>`,
      tabla(['Código modular', 'Secciones activas', 'Sesiones con evidencia', 'Aulas sincronizadas', 'Grupos con evidencia'], t.filas.map((f) => [esc(f.colegioCodigo), String(f.seccionesActivas), `${f.sesiones.conEvidencia} de ${f.sesiones.total}`, `${f.aulasSincronizadas.sincronizadas} de ${f.aulasSincronizadas.total}`, cel(f.gruposConEvidencia)])),
      t.totalColegios > t.filasEnPdf ? `<p>Se muestran ${t.filasEnPdf} de ${t.totalColegios} instituciones. La tabla completa está en el anexo CSV.</p>` : '',
    );
  }
  partes.push(
    `<h2>Método y límites</h2>`,
    `<p>${esc(r.metodo.leyenda)}</p>`,
    `<footer>Datos guardados en cada celular, sincronizados el ${esc(r.metodo.ultimaSincronizacion)}. El informe no incluye nombres de estudiantes ni imágenes.</footer>`,
  );
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe mensual ${esc(r.periodo.mes)}</title><style>${CSS}</style></head><body>${partes.join('')}</body></html>`;
}
