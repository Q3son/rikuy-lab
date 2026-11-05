/**
 * CONTROL REMOTO: otro celular o laptop del grupo.
 *  - Mantener el botón para hablar con el tutor (o escribir).
 *  - Panel táctil: arrastrar = girar el holograma, pellizcar = zoom.
 *  - Botones de escena y deslizadores de variables de la práctica.
 *  - Gestos de mano con la cámara de este equipo (opcional).
 */
import '../style.css';
import { PRACTICES, practiceById, type AgentContext, type Command, type DisplayState } from '@rikuy/core';
import { Bus, localStorageGet, localStorageSet, roomFromUrl } from '../net/bus.ts';
import { Tracker } from '../analytics/tracker.ts';
import { attachTouchpad } from '../input/touch.ts';
import { VoiceInput, speak } from '../input/voice.ts';
import { HandGestures } from '../input/gestures.ts';
import { handleUtterance } from '../session.ts';

const room = roomFromUrl();
localStorageSet('rikuy.sala', room);
let grupo = new URLSearchParams(location.search).get('grupo') ?? localStorageGet('rikuy.grupo') ?? 'G1';

const bus = new Bus(room, 'control');
const tracker = new Tracker(bus, grupo);
let state: DisplayState = { scene: 'digestivo', running: true, variables: {} };
let hintsUsed = 0;
let speakHere = localStorageGet('rikuy.vozControl') === '1';

const SCENE_LABELS: Record<string, string> = {
  digestivo: 'Sistema digestivo',
  intestino: 'Intestino delgado',
  vellosidad: 'Vellosidad',
  enterocito: 'Enterocito',
  lactasa: 'Lactasa',
  respiratorio: 'Respiratorio',
  higado: 'Hígado',
  lobulillo: 'Lobulillo',
  pendulo: 'Péndulo',
};

const app = document.getElementById('app')!;
app.innerHTML = `
  <header>
    <div><h1>Rikuy Lab · control</h1><span class="muted">Sala <b>${room}</b></span></div>
    <span id="net" class="pill off">conectando…</span>
  </header>
  <div class="stack">
    <div class="row">
      <label class="muted" for="grupo">Grupo</label>
      <select id="grupo" style="width:auto">${Array.from({ length: 8 }, (_, i) => `G${i + 1}`).map((g) => `<option ${g === grupo ? 'selected' : ''}>${g}</option>`).join('')}</select>
      <span class="pill" id="sceneName"></span>
    </div>
    <button id="mic" class="mic">🎙 Mantén para hablar</button>
    <form id="ask" class="row"><input type="text" id="text" placeholder="…o escribe tu pregunta o hipótesis" style="flex:1"><button class="primary">Enviar</button></form>
    <div id="log"></div>

    <div class="card stack" id="practiceCard"></div>

    <div id="pad">Arrastra para girar · pellizca para acercar</div>
    <div class="row">
      <button data-cmd="reiniciar_vista">⟲ Centrar</button>
      <button data-cmd="separar_on">⤧ Separar partes</button>
      <button data-cmd="separar_off">⤨ Juntar</button>
      <button data-cmd="correr">▶ Correr</button>
      <button data-cmd="pausar">⏸ Pausa</button>
      <button data-cmd="pista">💡 Pista</button>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Ir a</h3>
      <div class="scene-grid">${Object.entries(SCENE_LABELS).map(([id, l]) => `<button data-scene="${id}">${l}</button>`).join('')}</div>
    </div>

    <div class="row">
      <button id="gestBtn">✋ Gestos con mi cámara</button>
      <button id="voiceBtn" class="${speakHere ? 'on' : ''}">🔊 Voz en este celular</button>
    </div>
    <video id="cam" playsinline muted style="width:120px;border-radius:10px;display:none;transform:scaleX(-1)"></video>
  </div>
`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const log = $('log');

function addMsg(who: 'alumno' | 'agente', text: string, meta = '') {
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.textContent = text;
  if (meta) {
    const s = document.createElement('small');
    s.textContent = meta;
    div.append(s);
  }
  log.append(div);
  log.scrollTop = log.scrollHeight;
}

function context(): AgentContext {
  const practica = practiceForScene(state.scene);
  return { practica, escena: state.scene, pistasUsadas: hintsUsed, variables: { ...state.variables } };
}

function practiceForScene(scene: string): string {
  if (scene === 'pendulo') return 'pendulo';
  if (scene === 'respiratorio') return 'respiratorio';
  return 'lactasa';
}

function sendCommands(commands: Command[]) {
  if (commands.length) bus.send({ type: 'command', commands, from: 'control' });
}

async function ask(text: string) {
  if (!text.trim()) return;
  addMsg('alumno', text);
  bus.send({ type: 'say', text, speaker: 'alumno' });
  tracker.grupo = grupo;
  tracker.practica = practiceForScene(state.scene);
  const result = await handleUtterance(text, {
    tracker,
    context,
    apply: sendCommands,
    say: (reply) => {
      bus.send({ type: 'say', text: reply, speaker: 'agente' });
      if (speakHere) speak(reply);
    },
  });
  if (result.commands.some((c) => c.tool === 'dar_pista')) hintsUsed++;
  addMsg('agente', result.reply, result.source === 'llm' ? 'tutor IA' : 'tutor sin conexión');
}

// ---------- Voz: mantener para hablar ----------
const voice = new VoiceInput();
const mic = $('mic') as HTMLButtonElement;
voice.onState = (on, err) => {
  mic.classList.toggle('listening', on);
  mic.textContent = on ? '🔴 Escuchando… suelta para enviar' : '🎙 Mantén para hablar';
  if (err === 'no-soportado') mic.textContent = 'Voz no disponible: escribe abajo';
};
voice.onInterim = (t) => (mic.textContent = `… ${t}`);
voice.onText = (t) => void ask(t);
mic.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!voice.listening) voice.toggle();
});
const release = () => {
  if (voice.listening) setTimeout(() => voice.listening && voice.toggle(), 350);
};
mic.addEventListener('pointerup', release);
mic.addEventListener('pointerleave', release);

$('ask').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>('text');
  void ask(input.value);
  input.value = '';
});

$<HTMLSelectElement>('grupo').addEventListener('change', (e) => {
  grupo = (e.target as HTMLSelectElement).value;
  localStorageSet('rikuy.grupo', grupo);
  tracker.grupo = grupo;
});

// ---------- Panel táctil → gestos al display ----------
attachTouchpad($('pad'), (dx, dy, dz) => bus.send({ type: 'gesture', dx, dy, dz, from: 'control' }));

app.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button');
  if (!b) return;
  if (b.dataset.scene) {
    sendCommands([{ tool: 'ir_a', args: { escena: b.dataset.scene } } as Command]);
    tracker.log({ kind: 'accion', texto: `ir_a ${b.dataset.scene}` });
  }
  const cmd = b.dataset.cmd;
  if (!cmd) return;
  if (cmd === 'separar_on') sendCommands([{ tool: 'separar_partes', args: { activo: true } } as Command]);
  else if (cmd === 'separar_off') sendCommands([{ tool: 'separar_partes', args: { activo: false } } as Command]);
  else if (cmd === 'pista') void ask('dame una pista');
  else sendCommands([{ tool: cmd, args: {} } as Command]);
});

// ---------- Variables de la práctica ----------
const practiceCard = $('practiceCard');
let renderedPractice = '';
function renderPractice() {
  const p = practiceById.get(practiceForScene(state.scene)) ?? PRACTICES[0];
  $('sceneName').textContent = SCENE_LABELS[state.scene] ?? state.scene;
  if (renderedPractice !== p.id) {
    renderedPractice = p.id;
    practiceCard.innerHTML = `
      <div><b>${p.title}</b><div class="muted" style="font-size:14px">${p.guidingQuestion}</div></div>
      <div class="readout" id="readout">—</div>
      ${p.variables
        .map(
          (v) => `<div class="var"><label><span>${v.label}</span><b id="v-${v.id}">${v.default} ${v.unit}</b></label>
          <input type="range" min="${v.min}" max="${v.max}" step="${v.step}" value="${v.default}" data-var="${v.id}" data-unit="${v.unit}"></div>`,
        )
        .join('')}
    `;
  }
  for (const [id, value] of Object.entries(state.variables)) {
    const input = practiceCard.querySelector<HTMLInputElement>(`[data-var="${id}"]`);
    if (input && document.activeElement !== input) input.value = String(value);
    const lab = document.getElementById(`v-${id}`);
    if (lab && input) lab.textContent = `${value} ${input.dataset.unit}`;
  }
  const ro = document.getElementById('readout');
  if (ro) ro.textContent = state.readout ? `${state.readout.label}: ${state.readout.value}` : '—';
}

let varTimer = 0;
practiceCard.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (!t.dataset.var) return;
  const valor = Number(t.value);
  document.getElementById(`v-${t.dataset.var}`)!.textContent = `${valor} ${t.dataset.unit}`;
  sendCommands([{ tool: 'fijar_variable', args: { variable: t.dataset.var, valor } } as Command]);
  clearTimeout(varTimer);
  varTimer = window.setTimeout(() => tracker.log({ kind: 'cambio_variable', variable: { id: t.dataset.var!, valor } }), 600);
});

// ---------- Gestos con la cámara de este equipo ----------
let gestures: HandGestures | null = null;
$('gestBtn').addEventListener('click', async () => {
  const btn = $('gestBtn');
  const cam = $<HTMLVideoElement>('cam');
  if (gestures) {
    gestures.stop();
    gestures = null;
    cam.style.display = 'none';
    btn.classList.remove('on');
    return;
  }
  gestures = new HandGestures(cam, {
    onRotate: (dx, dy) => bus.send({ type: 'gesture', dx, dy, dz: 1, from: 'control' }),
    onZoom: (f) => bus.send({ type: 'gesture', dx: 0, dy: 0, dz: f, from: 'control' }),
    onGesture: (g) => sendCommands([{ tool: g === 'pausa' ? 'pausar' : 'correr', args: {} } as Command]),
    onStatus: (s) => (btn.textContent = `✋ ${s}`),
  });
  cam.style.display = 'block';
  btn.classList.add('on');
  try {
    await gestures.start('user');
  } catch (err) {
    btn.textContent = `✋ Cámara no disponible`;
    console.warn(err);
    gestures = null;
    cam.style.display = 'none';
  }
});

$('voiceBtn').addEventListener('click', () => {
  speakHere = !speakHere;
  localStorageSet('rikuy.vozControl', speakHere ? '1' : '0');
  $('voiceBtn').classList.toggle('on', speakHere);
});

// ---------- Bus ----------
bus.onStatus = (on) => {
  const net = $('net');
  net.textContent = on ? 'en línea' : 'sin servidor';
  net.className = `pill ${on ? 'ok' : 'off'}`;
};
bus.on((msg) => {
  if (msg.type === 'state') {
    state = msg.state;
    renderPractice();
  } else if (msg.type === 'say' && msg.speaker === 'alumno') {
    // Otro dispositivo habló (p. ej. el display en modo autónomo): se muestra.
  }
});
renderPractice();
