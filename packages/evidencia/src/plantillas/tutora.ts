/**
 * Weekly summary for the teacher-tutor (FUNCIONES_EXTRA 1.4.1): e-mail first, a short WhatsApp
 * with a link. Fixed order, one main action. It carries counts only: no quotes, no nicknames,
 * no group order by progress, nothing from Rikuy Guardián.
 */
import { EntradaTutora } from './modelos.ts';
import { esc, minuscula, pluralizar, rangoDeFechas } from './texto.ts';
import type { Renderizado } from './tipos.ts';

export function renderTutora(entrada: unknown): Renderizado {
  const e = EntradaTutora.parse(entrada);
  const cuando = rangoDeFechas(e.fechaIni, e.fechaFin);
  const asunto = `Rikuy · ${e.claseEtiqueta} · semana del ${cuando}`;

  const resumen = `Esta semana: ${e.exhibiciones} ${pluralizar(e.exhibiciones, 'exhibición', 'exhibiciones')}, ${e.gruposEntregaron} de ${e.gruposTotal} grupos entregaron evidencia.`;
  const caps = e.competencia.capacidades.map((c) => ({ ...c, linea: `${c.nombre}: ${c.conEvidencia} de ${c.trabajadas} grupos con evidencia; el resto, sin evidencia aún.` }));
  const costo = e.costaron.map((c) => `${c.concepto}: ${c.gruposAfectados} de ${c.gruposTotal} grupos tuvieron una idea por revisar.`);
  const dudas = (e.dudas ?? []).map((d) => d.tema);
  const ayuda = e.ayuda ? `${e.ayuda.pedidos} ${pluralizar(e.ayuda.pedidos, 'pedido', 'pedidos')}, ${e.ayuda.cerrados} cerrados, ${e.ayuda.nudosPorConfirmar} nudos por confirmar.` : null;
  const p = e.pendientes;
  const pend = [
    p.gruposSinEntregar ? `${p.gruposSinEntregar} ${pluralizar(p.gruposSinEntregar, 'grupo falta', 'grupos faltan')} por entregar su QR` : null,
    p.nudosPorConfirmar ? `${p.nudosPorConfirmar} nudos por confirmar` : null,
    p.vitrinasPorAbrir ? `${p.vitrinasPorAbrir} vitrinas por abrir` : null,
    p.mensajesPorAprobar ? `${p.mensajesPorAprobar} mensajes a familias por aprobar` : null,
    p.cierreEscolar ? `Tu región cierra el ${rangoDeFechas(p.cierreEscolar.fecha, p.cierreEscolar.fecha).replace(/ al \d+ de/, ' de')} (fuente: ${p.cierreEscolar.fuente}). Prepara la hoja Para llevar.` : null,
  ].filter((x): x is string => x !== null);
  const pie = `Orienta, no califica. Datos hasta ${e.sincronizadoHasta}. Puedes pausar estos correos en Ajustes.`;

  const texto = [
    asunto,
    '',
    resumen,
    '',
    `Competencia que avanzó: ${e.competencia.nombre}`,
    ...caps.map((c) => `- ${c.linea}`),
    '',
    'Lo que les costó',
    ...(costo.length ? costo.map((c) => `- ${c}`) : ['- Todavía no hay evidencia para decirlo.']),
    ...(dudas.length ? ['', 'Mapa de dudas', ...dudas.map((d) => `- ${d}`)] : []),
    ...(ayuda ? ['', 'Ayuda entre pares', ayuda] : []),
    '',
    'Pendientes',
    ...(pend.length ? pend.map((x) => `- ${x}`) : ['- Nada pendiente.']),
    ...(e.proxima ? ['', `Próxima exhibición sugerida: ${e.proxima.titulo}`] : []),
    ...(e.fraseLocal ? ['', e.fraseLocal] : []),
    '',
    `Abrir Mi clase de hoy: ${e.enlaceApp}`,
    '',
    pie,
  ].join('\n');

  const whatsapp = `Rikuy · ${e.claseEtiqueta}: ${minuscula(resumen.replace('Esta semana: ', 'esta semana '))} ${pend.length ? `Pendientes: ${pend.length}.` : 'Nada pendiente.'}\nAbrir Mi clase de hoy: ${e.enlaceApp}`;

  const li = (xs: string[]) => `<ul style="margin:0 0 16px;padding-left:20px;">${xs.map((x) => `<li style="margin:0 0 6px;">${esc(x)}</li>`).join('')}</ul>`;
  const h = (t: string) => `<h2 style="margin:16px 0 6px;font-size:17px;">${esc(t)}</h2>`;
  const barra = (c: { conEvidencia: number; trabajadas: number; nombre: string }) => {
    const pct = c.trabajadas ? Math.round((c.conEvidencia / c.trabajadas) * 100) : 0;
    return `<div style="margin:0 0 10px;"><div>${esc(c.nombre)}: <strong>${c.conEvidencia} de ${c.trabajadas}</strong></div><div style="height:14px;border:2px solid #0D2B33;border-radius:4px;background:#E9ECE4;"><div style="height:14px;width:${pct}%;background:#075E6C;"></div></div></div>`;
  };
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(asunto)}</title></head>
<body style="margin:0;background:#F5F6F1;font-family:Arial,Helvetica,sans-serif;color:#0D2B33;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border:2px solid #D3D9CC;border-radius:16px;"><tr><td style="padding:20px;font-size:16px;line-height:24px;">
<p style="margin:0 0 4px;font-weight:bold;">${esc(asunto)}</p>
<p style="margin:0 0 12px;font-size:18px;">${esc(resumen)}</p>
${h(`Competencia que avanzó: ${e.competencia.nombre}`)}
${caps.map(barra).join('')}
<p style="margin:0 0 12px;font-size:14px;color:#4D6368;">El resto de cada barra es sin evidencia aún, no un resultado bajo.</p>
${h('Lo que les costó')}
${li(costo.length ? costo : ['Todavía no hay evidencia para decirlo.'])}
${dudas.length ? h('Mapa de dudas') + li(dudas) : ''}
${ayuda ? h('Ayuda entre pares') + `<p style="margin:0 0 12px;">${esc(ayuda)}</p>` : ''}
${h('Pendientes')}
${li(pend.length ? pend : ['Nada pendiente.'])}
${e.proxima ? `<p style="margin:0 0 12px;"><strong>Próxima exhibición sugerida:</strong> ${esc(e.proxima.titulo)}</p>` : ''}
${e.fraseLocal ? `<p style="margin:0 0 12px;">${esc(e.fraseLocal)}</p>` : ''}
<p style="margin:16px 0;"><a href="${esc(e.enlaceApp)}" style="display:inline-block;padding:14px 20px;background:#075E6C;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:bold;">Abrir Mi clase de hoy</a></p>
<p style="margin:0;font-size:13px;color:#4D6368;">${esc(pie)}</p>
</td></tr></table></td></tr></table></body></html>`;

  return { asunto, texto, whatsapp, html };
}
