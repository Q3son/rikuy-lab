/**
 * Weekly family message (F-05 / FUNCIONES_EXTRA 1.4.2). WhatsApp first, optional email.
 * Short (<= 40 words of narrative), low-literacy friendly (short sentences, three pictograms,
 * a recorded-audio link) and never naming a child in variant A, the default and the only
 * one that may go out as a broadcast.
 */
import { PICTOGRAMAS, svgPictograma, type PictoId } from '../pictogramas.ts';
import { EntradaFamilia, type EntradaFamiliaValida } from './modelos.ts';
import { contarPalabras, esc, rangoDeFechas } from './texto.ts';
import type { Renderizado } from './tipos.ts';

const EMOJI: Record<PictoId, string> = {
  cuerda: '🧵', piedra: '🪨', regla: '📏', reloj: '⏱️', celular: '📱', agua: '💧', sal: '🧂', medir: '📐', anotar: '📝', soltar: '🎯', generico: '📦',
};

/** Pre-recorded blocks (seconds from the spec): fixed greeting, per-exhibit sentence and question, fixed closing. */
const BLOQUES = [
  { clave: 'fijo.saludo', segundos: 3 },
  { clave: 'exhibicion', segundos: 8 },
  { clave: 'pregunta', segundos: 8 },
  { clave: 'fijo.cierre', segundos: 3 },
];

function narrativa(e: EntradaFamiliaValida): string[] {
  const exh = `${e.verbo} ${e.exhibicionCorta}`;
  const lineas =
    e.variante === 'A'
      ? [`Esta semana su hijo o hija y su grupo ${exh}.`, `Pregúntenle: ${e.preguntaCasa}`]
      : [`Esta semana ${e.nombre} y su grupo ${exh}.`, `Pregúntele: ${e.preguntaCasa}`];
  if (e.variante === 'B') lineas.push(e.linea.tipo === 'ayudo' ? `${e.nombre} ayudó a otro grupo a entender.` : `${e.nombre} quiso compartir: «${e.linea.texto}»`);
  if (e.fraseLocal) lineas.push(e.fraseLocal);
  return lineas;
}

export function renderFamilia(entrada: unknown): Renderizado {
  const e = EntradaFamilia.parse(entrada);
  const cuerpo = narrativa(e);
  const palabras = contarPalabras(cuerpo.join(' '));
  if (palabras > 40) throw new RangeError(`Family message has ${palabras} words; the limit is 40.`);

  const cuando = rangoDeFechas(e.fechaIni, e.fechaFin);
  const encabezado = `Rikuy · semana del ${cuando}`;
  const audioTexto = e.audioUrl
    ? `🔊 Escuche esto en ${e.lengua === 'quy' ? 'quechua' : 'castellano'}: ${e.audioUrl}`
    : e.lengua === 'quy'
      ? 'El audio en quechua llega pronto.'
      : null;
  const pie = ['Para no recibir más mensajes, responda BAJA.'];
  const enlace = `Actividad para hacer juntos: ${e.enlaceLigero}`;
  const pictos = e.pictogramas.map((p) => EMOJI[p]).join(' ');

  const whatsapp = [encabezado, pictos || null, ...cuerpo, e.parrafoQuechua?.texto ?? null, audioTexto, enlace, ...pie].filter((x): x is string => x !== null).join('\n');
  const texto = [encabezado, e.pictogramas.length ? `Materiales: ${e.pictogramas.map((p) => PICTOGRAMAS[p].titulo.toLowerCase()).join(', ')}.` : null, ...cuerpo, e.parrafoQuechua?.texto ?? null, audioTexto?.replace('🔊 ', '') ?? null, enlace, ...pie]
    .filter((x): x is string => x !== null)
    .join('\n');

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(encabezado)}</title></head>
<body style="margin:0;background:#F5F6F1;font-family:Arial,Helvetica,sans-serif;color:#0D2B33;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#FFFFFF;border:2px solid #D3D9CC;border-radius:16px;">
<tr><td style="padding:20px;font-size:18px;line-height:26px;">
<p style="margin:0 0 12px;font-weight:bold;">${esc(encabezado)}</p>
${e.pictogramas.length ? `<p style="margin:0 0 12px;">${e.pictogramas.map((p) => svgPictograma(p)).join(' ')}</p>` : ''}
${cuerpo.map((l) => `<p style="margin:0 0 12px;">${esc(l)}</p>`).join('\n')}
${e.parrafoQuechua ? `<p lang="quy" style="margin:0 0 12px;">${esc(e.parrafoQuechua.texto)}</p>` : ''}
${e.audioUrl ? `<p style="margin:0 0 12px;"><a href="${esc(e.audioUrl)}" style="display:inline-block;padding:12px 16px;background:#075E6C;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:bold;">🔊 Escuchar</a></p>` : audioTexto ? `<p style="margin:0 0 12px;">${esc(audioTexto)}</p>` : ''}
<p style="margin:0 0 12px;"><a href="${esc(e.enlaceLigero)}" style="color:#075E6C;">Actividad para hacer juntos</a></p>
<p style="margin:0;font-size:14px;color:#4D6368;">${esc(pie[0])}</p>
</td></tr></table></td></tr></table></body></html>`;

  return {
    asunto: encabezado,
    texto,
    whatsapp,
    html,
    palabras,
    pictogramas: e.pictogramas,
    audio: e.audioUrl ? { bloques: BLOQUES, totalSegundos: BLOQUES.reduce((n, b) => n + b.segundos, 0) } : null,
  };
}
