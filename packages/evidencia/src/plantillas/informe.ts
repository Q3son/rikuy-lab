/**
 * Monthly report for the principal (4 A4 pages) and the UGEL (6 pages), FUNCIONES_EXTRA 1.4.3.
 * Aggregates only: cells under 5 groups are suppressed, schools are listed by modular code,
 * classrooms alphabetically, and there is no color coding, ranking or Guardian data.
 * The PDF is produced from `htmlImprimible` by the browser ("Guardar como PDF") or by F7's server adapter.
 */
import { EntradaInforme, MIN_CELDA, type EntradaInformeValida } from './modelos.ts';
import { esc, nombreDeMes, rangoDeFechas } from './texto.ts';
import type { Renderizado } from './tipos.ts';

export interface RenderizadoInforme extends Renderizado {
  htmlImprimible: string;
  paginasMax: 4 | 6;
  adjunto: { nombre: string; tipoMime: 'application/pdf' };
}

export const celda = (con: number, total: number): string => (total < MIN_CELDA ? 'menos de 5 grupos' : `${con} de ${total}`);
const orden = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const ESTILO_IMPRESION = `@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0D2B33;font-size:11pt;line-height:1.35;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1{font-size:22pt;margin:0 0 2mm}h2{font-size:13pt;margin:6mm 0 2mm;break-after:avoid}.regla{border-top:3px solid #0D2B33;margin:3mm 0 4mm}
.kpis{display:flex;flex-wrap:wrap;gap:3mm;break-inside:avoid}.kpi{flex:1 1 30%;border:2px solid #0D2B33;padding:3mm}.kpi b{display:block;font-size:22pt;font-variant-numeric:tabular-nums}
table{border-collapse:collapse;width:100%;break-inside:avoid;font-size:10pt}th,td{border-bottom:2px solid #0D2B33;padding:1.5mm 2mm;text-align:left;font-variant-numeric:tabular-nums}
.barra{height:4mm;border:2px solid #0D2B33;background:repeating-linear-gradient(135deg,#fff 0 2mm,#d9ddd5 2mm 2.6mm)}.barra i{display:block;height:100%;background:#0D2B33}
.pie{margin-top:6mm;font-size:9.5pt;border-top:2px solid #0D2B33;padding-top:2mm}.chip{border:2px dashed #0D2B33;padding:0 2mm;font-size:9.5pt}`;

export function renderInforme(entrada: unknown): RenderizadoInforme {
  const e: EntradaInformeValida = EntradaInforme.parse(entrada);
  const etiqueta = e.alcance === 'director' ? 'director' : 'UGEL';
  const mes = nombreDeMes(e.mes);
  const asunto = `Rikuy · informe mensual de ${mes} · ${e.institucion}`;
  const sinc = `${e.sincronizacion.aulasSincronizadas} de ${e.sincronizacion.aulasTotal} aulas sincronizaron`;
  const ultima = rangoDeFechas(e.sincronizacion.ultima, e.sincronizacion.ultima).replace(/ al \d+ de/, ' de');
  const c = e.cifras;
  const kpis: [string, string][] = [
    [String(c.exhibicionesRealizadas), 'exhibiciones realizadas'],
    [String(c.seccionesActivas), 'secciones activas'],
    [`${c.pctSesionesConEvidencia} %`, 'de sesiones con evidencia recibida'],
    [String(c.diasCierreCubiertos), 'días de cierre cubiertos con Para llevar'],
    [`${c.coberturaDatosPct} %`, 'cobertura de datos'],
  ];
  const secciones = [...e.cobertura].sort((a, b) => orden(a.seccion, b.seccion));
  const nombresCap = secciones[0]?.capacidades.map((x) => x.nombre) ?? [];
  const escuelas = [...(e.territorial ?? [])].sort((a, b) => orden(a.codigoModular, b.codigoModular));
  const conceptos = e.conceptos;
  const cont = e.continuidad;
  const proveniencia = `Datos guardados en cada celular, sincronizados el ${ultima}. El informe no incluye nombres de estudiantes ni imágenes.`;
  const metodo = `Método y límites: se omiten las celdas con menos de ${MIN_CELDA} grupos. Orienta, no califica. ${sinc}.`;

  const lineaSeccion = (s: (typeof secciones)[number]) => `${s.seccion}: ${s.capacidades.map((x, i) => `${i + 1}) ${celda(x.gruposConEvidencia, x.gruposTotal)}`).join('; ')}.`;

  const texto = [
    asunto,
    e.datosSimulados ? 'Datos de ejemplo.' : null,
    '',
    `Resumen: ${sinc}.`,
    ...kpis.map(([n, t]) => `- ${n} ${t}`),
    '',
    'Cobertura de competencias por sección (grupos con evidencia; el resto es sin evidencia aún):',
    ...nombresCap.map((n, i) => `  ${i + 1}) ${n}`),
    ...secciones.map(lineaSeccion),
    '',
    'Conceptos que más costaron:',
    ...(conceptos.length ? conceptos.map((x) => `- ${x.concepto}: ${celda(x.gruposAfectados, x.gruposTotal)} con una idea por revisar.`) : ['- Todavía no hay evidencia para decirlo.']),
    '',
    `Continuidad en cierres: ${cont.diasCierre} días de cierre; ${cont.paquetesEnviados} paquetes enviados, ${cont.paquetesDevueltosQr} devueltos por QR (QR ${cont.porCanal.qr}, WhatsApp ${cont.porCanal.whatsapp}, hoja A4 ${cont.porCanal.a4}).`,
    `Brechas: ${e.brechas.sesionesSinRed} sesiones sin red; ${e.brechas.horasAudioQuechua} horas de audio en quechua usadas.`,
    ...(e.ayuda ? [`Ayuda entre pares: ${e.ayuda.pedidos} pedidos, ${e.ayuda.cerrados} cerrados.`] : []),
    ...(e.alcance === 'ugel' && escuelas.length
      ? ['', 'Instituciones educativas (por código modular, sin orden por resultado):', ...escuelas.map((s) => `${s.codigoModular}: ${celda(s.gruposConEvidencia, s.gruposTotal)} grupos con evidencia`)]
      : []),
    '',
    metodo,
    proveniencia,
  ]
    .filter((x): x is string => x !== null)
    .join('\n');

  const whatsapp = `Rikuy · informe de ${mes} (${etiqueta}): ${c.exhibicionesRealizadas} exhibiciones, ${c.pctSesionesConEvidencia} % de sesiones con evidencia, ${sinc}. El PDF va por correo.`;

  const kpiHtml = `<div class="kpis">${kpis.map(([n, t]) => `<div class="kpi"><b>${esc(n)}</b>${esc(t)}</div>`).join('')}</div>`;
  const tablaCob = `<table><caption style="text-align:left;font-weight:bold;">Grupos con evidencia por sección y capacidad</caption><thead><tr><th scope="col">Sección</th>${nombresCap.map((_, i) => `<th scope="col">${i + 1}</th>`).join('')}</tr></thead><tbody>${secciones
    .map((s) => `<tr><th scope="row">${esc(s.seccion)}</th>${s.capacidades.map((x) => `<td>${esc(celda(x.gruposConEvidencia, x.gruposTotal))}</td>`).join('')}</tr>`)
    .join('')}</tbody></table><ol style="font-size:9.5pt;margin:2mm 0 0;padding-left:5mm;">${nombresCap.map((n) => `<li>${esc(n)}</li>`).join('')}</ol>`;
  const concHtml = conceptos.length
    ? `<table><thead><tr><th scope="col">Concepto</th><th scope="col">Grupos</th><th scope="col">Barra</th></tr></thead><tbody>${conceptos
        .map((x) => `<tr><th scope="row">${esc(x.concepto)}</th><td>${esc(celda(x.gruposAfectados, x.gruposTotal))}</td><td style="width:40%">${x.gruposTotal >= MIN_CELDA ? `<div class="barra"><i style="width:${Math.round((x.gruposAfectados / Math.max(x.gruposTotal, 1)) * 100)}%"></i></div>` : ''}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p>Todavía no hay evidencia para decirlo.</p>';
  const escHtml = e.alcance === 'ugel' && escuelas.length
    ? `<h2>Instituciones educativas</h2><p style="margin:0 0 2mm;">Ordenadas por código modular, no por resultado.</p><table><thead><tr><th scope="col">Código modular</th><th scope="col">Grupos con evidencia</th></tr></thead><tbody>${escuelas
        .map((s) => `<tr><th scope="row">${esc(s.codigoModular)}</th><td>${esc(celda(s.gruposConEvidencia, s.gruposTotal))}</td></tr>`)
        .join('')}</tbody></table>`
    : '';
  const cuerpoImprimible = `<header><p style="margin:0;font-weight:bold;">Rikuy</p><h1>Informe mensual · ${esc(mes)}</h1><p style="margin:0;font-size:13pt;">${esc(e.institucion)}${e.datosSimulados ? ' <span class="chip">Datos de ejemplo</span>' : ''}</p><div class="regla"></div></header>
<h2>Cifras del mes</h2>${kpiHtml}
<h2>Cobertura de competencias por sección</h2>${tablaCob}
<h2>Conceptos que más costaron</h2>${concHtml}
<h2>Continuidad en cierres</h2><p style="margin:0;">${esc(`${cont.diasCierre} días de cierre; ${cont.paquetesEnviados} paquetes enviados y ${cont.paquetesDevueltosQr} devueltos por QR (QR ${cont.porCanal.qr}, WhatsApp ${cont.porCanal.whatsapp}, hoja A4 ${cont.porCanal.a4}).`)}</p>
<h2>Brechas por lengua y conectividad</h2><p style="margin:0;">${esc(`${e.brechas.sesionesSinRed} sesiones sin red; ${e.brechas.horasAudioQuechua} horas de audio en quechua usadas.`)}</p>
${e.ayuda ? `<h2>Ayuda entre pares</h2><p style="margin:0;">${esc(`${e.ayuda.pedidos} pedidos, ${e.ayuda.cerrados} cerrados.`)}</p>` : ''}
${escHtml}
<div class="pie"><p style="margin:0 0 1mm;">${esc(metodo)}</p><p style="margin:0;">${esc(proveniencia)}</p></div>`;
  const htmlImprimible = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(asunto)}</title><style>${ESTILO_IMPRESION}</style></head><body>${cuerpoImprimible}</body></html>`;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(asunto)}</title></head>
<body style="margin:0;background:#F5F6F1;font-family:Arial,Helvetica,sans-serif;color:#0D2B33;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border:2px solid #D3D9CC;border-radius:16px;"><tr><td style="padding:20px;font-size:16px;line-height:24px;">
<p style="margin:0 0 4px;font-weight:bold;">${esc(asunto)}</p>
${e.datosSimulados ? '<p style="margin:0 0 8px;font-size:13px;">Datos de ejemplo</p>' : ''}
<ul style="margin:0 0 12px;padding-left:20px;">${kpis.map(([n, t]) => `<li><strong>${esc(n)}</strong> ${esc(t)}</li>`).join('')}</ul>
<p style="margin:0 0 12px;">${esc(sinc)}. El informe completo va en el PDF adjunto (${e.alcance === 'director' ? '4' : '6'} páginas A4 como máximo).</p>
<p style="margin:0;font-size:13px;color:#4D6368;">${esc(metodo)}<br>${esc(proveniencia)}</p>
</td></tr></table></td></tr></table></body></html>`;

  return {
    asunto,
    texto,
    whatsapp,
    html,
    htmlImprimible,
    paginasMax: e.alcance === 'director' ? 4 : 6,
    adjunto: { nombre: `informe-${e.alcance === 'director' ? 'director' : 'ugel'}-${e.mes}.pdf`, tipoMime: 'application/pdf' },
  };
}
