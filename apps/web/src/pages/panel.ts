/**
 * PANEL DOCENTE: qué está aprendiendo cada grupo, en vivo.
 * Orienta la intervención del docente; no pone notas.
 * Cada indicador muestra las frases reales que lo sustentan.
 */
import '../style.css';
import { CONCEPTS, conceptById, summarize, type ClassSummary, type LearningEvent } from '@rikuy/core';
import { Bus, roomFromUrl } from '../net/bus.ts';

const room = roomFromUrl();
const bus = new Bus(room, 'panel');
const app = document.getElementById('app')!;
let live: LearningEvent[] = [];
let data: ClassSummary | null = null;
let source = 'servidor';

const TYPE_LABEL: Record<string, string> = {
  factual: '¿Qué es?',
  causal: '¿Por qué?',
  hipotetica: '¿Qué pasaría si?',
  relacional: 'Relaciona',
  orden: 'Órdenes',
  otro: 'Otro',
};

async function load() {
  try {
    const res = await fetch(`/api/dashboard?room=${encodeURIComponent(room)}`);
    if (!res.ok) throw new Error();
    data = (await res.json()) as ClassSummary;
    source = 'servidor';
  } catch {
    // Sin servidor: se resume lo que llegó por el bus en este navegador.
    data = summarize(live);
    source = 'solo esta red local';
  }
  render();
}

bus.on((msg) => {
  if (msg.type === 'event') {
    if (!live.some((e) => e.id === msg.event.id)) live.push(msg.event);
    if (source !== 'servidor') {
      data = summarize(live);
      render();
    }
  }
});

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function bars(porTipo: Record<string, number>) {
  const max = Math.max(1, ...Object.values(porTipo));
  return Object.entries(porTipo)
    .filter(([k]) => k !== 'orden')
    .map(
      ([k, v]) =>
        `<div class="bar"><span>${TYPE_LABEL[k] ?? k}</span><div class="track"><div class="fill" style="width:${(v / max) * 100}%"></div></div><b>${v}</b></div>`,
    )
    .join('');
}

function render() {
  if (!data) return;
  const d = data;
  const n = d.grupos.length;
  const preguntas = d.grupos.reduce((a, g) => a + g.preguntas, 0);
  const profundas = d.porTipo.causal + d.porTipo.hipotetica + d.porTipo.relacional;
  const pctProf = preguntas ? Math.round((profundas / preguntas) * 100) : 0;
  const relac = d.grupos.reduce((a, g) => a + g.relacionales, 0);
  const pistas = d.grupos.reduce((a, g) => a + g.pistas, 0);

  const totalConcepts = Math.max(1, n);
  const heat = CONCEPTS.map((c) => {
    const v = d.mapaConceptos[c.id] ?? 0;
    const a = v / totalConcepts;
    const bg = v ? `rgba(95,227,255,${0.15 + a * 0.6})` : 'transparent';
    return `<span style="background:${bg};border:1px solid ${v ? 'transparent' : 'var(--line)'};color:${v ? 'var(--text)' : 'var(--muted)'}">${esc(c.label)}${v ? ` · ${v}` : ''}</span>`;
  }).join('');

  const groups = d.grupos
    .sort((a, b) => a.grupo.localeCompare(b.grupo))
    .map(
      (g) => `
      <div class="card">
        <div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(g.grupo)}</h3>
          <span class="pill">${g.preguntas} preguntas · ${g.pistas} pistas</span></div>
        ${bars(g.porTipo)}
        <div class="row" style="margin-top:8px;font-size:14px">
          <span>Razonamiento: <b>${g.razonamientoPromedio === null ? '—' : `${g.razonamientoPromedio.toFixed(1)}/3`}</b></span>
          <span>Relaciona sistemas: <b>${g.relacionales}</b></span>
          <span>Conclusiones: <b>${g.conclusiones}</b></span>
        </div>
        <div class="muted" style="font-size:13px;margin-top:6px">Conceptos: ${g.conceptos.map((c) => esc(conceptById.get(c)?.label ?? c)).join(', ') || '—'}</div>
        ${g.evidencias.slice(-3).map((e) => `<div class="evidence">“${esc(e)}”</div>`).join('')}
        <div class="suggest">${esc(g.sugerencia)}</div>
      </div>`,
    )
    .join('');

  app.innerHTML = `
    <div class="row" style="justify-content:space-between">
      <div><h1>Panel docente · sala ${esc(room)}</h1>
      <span class="muted">Orienta tu intervención; no es una nota. Datos: ${source}. Grupos con seudónimo.</span></div>
      <div class="row"><button id="refresh">Actualizar</button><a href="/api/dashboard?room=${encodeURIComponent(room)}" target="_blank"><button>JSON</button></a></div>
    </div>
    <div class="kpis">
      <div class="card kpi"><div class="v">${n}</div><div class="l">grupos activos</div></div>
      <div class="card kpi"><div class="v">${preguntas}</div><div class="l">preguntas hechas</div></div>
      <div class="card kpi"><div class="v">${pctProf}%</div><div class="l">preguntas de por qué / qué pasaría si</div></div>
      <div class="card kpi"><div class="v">${relac}</div><div class="l">conexiones entre sistemas</div></div>
      <div class="card kpi"><div class="v">${pistas}</div><div class="l">pistas pedidas</div></div>
    </div>
    ${d.recomendaciones.length ? `<div class="card" style="margin-bottom:12px"><b>Para la clase</b><ul>${d.recomendaciones.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
    <div class="card" style="margin-bottom:12px"><b>Tipos de pregunta (toda la clase)</b>${bars(d.porTipo)}</div>
    <div class="card" style="margin-bottom:12px"><b>Mapa de conceptos explorados</b><p class="muted" style="font-size:13px;margin:4px 0 8px">Más intenso = más grupos llegaron ahí. Lo apagado nadie lo exploró aún.</p><div class="heat">${heat}</div></div>
    <div class="groups">${groups || '<p class="muted">Aún no hay actividad en esta sala.</p>'}</div>
  `;
  document.getElementById('refresh')!.addEventListener('click', () => void load());
}

void load();
setInterval(() => void load(), 4000);
