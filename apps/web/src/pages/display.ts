/**
 * DISPLAY: el celular que va bajo la pirámide o la cajita.
 *
 * - Dibuja el holograma (4 vistas, 1 vista o normal) con espejo/volteo.
 * - Obedece al control remoto (comandos y gestos por el bus).
 * - Modo autónomo: se puede hablarle directo (botón del micrófono).
 * - Toque en la pantalla: arrastrar = girar, pellizcar = zoom.
 * - Ajustes ocultos en la esquina (⚙): modo, espejo, voltear, tamaño...
 */
import '../style.css';
import * as THREE from 'three';
import { PRACTICES, practiceById, type AgentContext, type Command } from '@rikuy/core';
import { DEFAULT_OPTIONS, HoloRenderer, type HoloMode, type HoloOptions } from '../holo/HoloRenderer.ts';
import { ViewController } from '../holo/ViewController.ts';
import { SceneManager } from '../holo/SceneManager.ts';
import { SCENES } from '../scenes/registry.ts';
import { Bus, localStorageGet, localStorageSet, roomFromUrl } from '../net/bus.ts';
import { Tracker } from '../analytics/tracker.ts';
import { attachTouchpad } from '../input/touch.ts';
import { VoiceInput, speak, voiceSupported } from '../input/voice.ts';
import { HandGestures } from '../input/gestures.ts';
import { handleUtterance } from '../session.ts';
import { STATIC } from '../env.ts';

const OPTS_KEY = 'rikuy.holo.v2';
const params = new URLSearchParams(location.search);
const room = roomFromUrl();
localStorageSet('rikuy.sala', room);

// ---------- Render ----------
const canvas = document.getElementById('holo') as HTMLCanvasElement;
const saved = readOptions();
const holo = new HoloRenderer(canvas, saved);
const view = new ViewController(holo.pivot);
const scenes = new SceneManager(holo.pivot, view);

const bus = new Bus(room, 'display');
const tracker = new Tracker(bus, params.get('grupo') ?? localStorageGet('rikuy.grupo') ?? 'G1');
let hintsUsed = 0;

const caption = document.getElementById('caption')!;
function showCaption(text: string) {
  caption.textContent = text;
}

scenes.onHint = (text, level) => {
  hintsUsed = Math.max(hintsUsed, level);
  say(text);
};
scenes.onChange = (state) => {
  tracker.practica = scenes.current?.practice ?? tracker.practica;
  bus.send({ type: 'state', state });
};

function say(text: string) {
  showCaption(text);
  if (voiceOut) speak(text);
}

function context(): AgentContext {
  return {
    practica: scenes.current?.practice ?? 'lactasa',
    escena: scenes.current?.id ?? '',
    pistasUsadas: hintsUsed,
    variables: { ...scenes.ctx.variables },
  };
}

function apply(commands: Command[]) {
  scenes.apply(commands);
}

// ---------- Bus ----------
bus.on((msg) => {
  switch (msg.type) {
    case 'command':
      if (msg.from !== 'display') apply(msg.commands);
      break;
    case 'gesture':
      if (msg.from !== 'display') view.nudge(msg.dx, msg.dy, msg.dz);
      break;
    case 'say':
      if (msg.speaker === 'agente') say(msg.text);
      else showCaption(`“${msg.text}”`);
      break;
    case 'hello':
    case 'peers':
      scenes.emit();
      break;
    default:
      break;
  }
});
// El readout cambia con el tiempo (actividad, frecuencia...): se reenvía cada segundo.
setInterval(() => scenes.emit(), 1000);

// ---------- Interacción directa ----------
attachTouchpad(canvas, (dx, dy, dz) => view.nudge(dx, dy, dz));

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'arrowleft') view.nudge(-0.15, 0);
  if (k === 'arrowright') view.nudge(0.15, 0);
  if (k === 'arrowup') view.nudge(0, -0.1);
  if (k === 'arrowdown') view.nudge(0, 0.1);
  if (k === '+' || k === '=') view.nudge(0, 0, 1.12);
  if (k === '-') view.nudge(0, 0, 0.9);
  if (k === 'm') setOpt({ mirror: !holo.options.mirror });
  if (k === 'f') setOpt({ flip: !holo.options.flip });
  if (k === 's') toggleSettings();
  if (k === 'escape') panel.classList.remove('open');
  if (k === ' ') toggleMic();
});

// Micrófono en el propio display (modo autónomo, sin segundo celular).
const voice = new VoiceInput();
const micBtn = document.getElementById('mic') as HTMLButtonElement;
let voiceOut = (localStorageGet('rikuy.vozDisplay') ?? '1') === '1';
voice.onInterim = (t) => showCaption(`… ${t}`);
voice.onState = (on, err) => {
  micBtn.classList.toggle('listening', on);
  if (err === 'no-soportado') showCaption('Este navegador no reconoce voz. Usa el control remoto.');
  else if (err && err !== 'no-speech' && err !== 'aborted') showCaption(`Micrófono: ${err}`);
};
voice.onText = (text) => {
  showCaption(`“${text}”`);
  bus.send({ type: 'say', text, speaker: 'alumno' });
  void handleUtterance(text, { tracker, context, apply, say: (r) => { say(r); bus.send({ type: 'say', text: r, speaker: 'agente' }); } });
};
function toggleMic() {
  voice.toggle();
}
micBtn.addEventListener('click', toggleMic);
if (!voiceSupported()) micBtn.title = 'Voz no disponible en este navegador';

// Gestos de mano con la cámara de este equipo (opcional).
const camVideo = document.getElementById('gestureCam') as HTMLVideoElement;
let gestures: HandGestures | null = null;
async function toggleGestures(btn: HTMLButtonElement) {
  if (gestures) {
    gestures.stop();
    gestures = null;
    camVideo.style.display = 'none';
    btn.classList.remove('on');
    return;
  }
  gestures = new HandGestures(camVideo, {
    onRotate: (dx, dy) => view.nudge(dx, dy),
    onZoom: (f) => view.nudge(0, 0, f),
    onGesture: (g) => apply([{ tool: g === 'pausa' ? 'pausar' : 'correr', args: {} } as Command]),
    onStatus: showCaption,
  });
  try {
    camVideo.style.display = 'block';
    btn.classList.add('on');
    await gestures.start('user');
  } catch (e) {
    showCaption(`No se pudo abrir la cámara: ${(e as Error).message}`);
    gestures = null;
    camVideo.style.display = 'none';
    btn.classList.remove('on');
  }
}

// ---------- Ajustes ----------
const panel = document.getElementById('settings')!;
document.getElementById('gear')!.addEventListener('click', toggleSettings);
function toggleSettings() {
  panel.classList.toggle('open');
}

function setOpt(patch: Partial<HoloOptions>) {
  holo.setOptions(patch);
  localStorageSet(OPTS_KEY, JSON.stringify(holo.options));
  renderSettings();
}

function readOptions(): Partial<HoloOptions> {
  const fromUrl: Partial<HoloOptions> = {};
  const m = params.get('modo');
  if (m === 'piramide' || m === 'cajita' || m === 'normal') fromUrl.mode = m;
  if (params.has('espejo')) fromUrl.mirror = params.get('espejo') !== '0';
  try {
    return { ...JSON.parse(localStorageGet(OPTS_KEY) ?? '{}'), ...fromUrl };
  } catch {
    return fromUrl;
  }
}

function renderSettings() {
  const o = holo.options;
  const modes: [HoloMode, string][] = [
    ['piramide', 'Pirámide'],
    ['cajita', 'Cajita'],
    ['normal', 'Normal'],
  ];
  const sceneButtons = Object.entries(SCENES)
    .map(([id, f]) => `<button data-scene="${id}" class="${scenes.current?.id === id ? 'on' : ''}">${f().label}</button>`)
    .join('');
  panel.innerHTML = `
    <div class="row" style="justify-content:space-between"><h2>Rikuy Lab · display</h2><button data-close aria-label="Cerrar ajustes">✕</button></div>
    <p class="muted">Sala <b>${room}</b> · <span class="pill ${bus.connected ? 'ok' : 'off'}">${bus.connected ? 'en línea' : STATIC ? 'sin servidor' : 'solo local'}</span></p>

    <h3>Tipo de proyector</h3>
    <div class="seg">${modes.map(([id, l]) => `<button data-mode="${id}" class="${o.mode === id ? 'on' : ''}">${l}</button>`).join('')}</div>
    <p class="muted" style="font-size:13px">Pirámide = 4 caras. Cajita = una lámina a 45°. Normal = pantalla sin holograma.</p>

    <h3>Orientación</h3>
    <div class="seg">
      <button data-toggle="mirror" class="${o.mirror ? 'on' : ''}">⇋ Espejo</button>
      <button data-toggle="flip" class="${o.flip ? 'on' : ''}">⇅ Voltear</button>
      <button data-rot>↻ ${o.rotation}°</button>
    </div>
    <p class="muted" style="font-size:13px">Si el texto o el modelo se ven al revés en la lámina, activa Espejo. Si sale de cabeza, Voltear.</p>

    <h3>Tamaño</h3>
    <label class="var"><span class="muted">Tamaño de cada vista</span>
      <input type="range" min="0.2" max="0.5" step="0.01" value="${o.viewSize}" data-range="viewSize"></label>
    <label class="var"><span class="muted">Hueco central</span>
      <input type="range" min="0" max="0.25" step="0.005" value="${o.gap}" data-range="gap"></label>
    <button data-reset-opts>Restablecer proyección</button>

    <h3>Escena</h3>
    <div class="scene-grid">${sceneButtons}</div>

    <h3>Entrada</h3>
    <div class="stack">
      <button data-gestures class="${gestures ? 'on' : ''}">✋ Gestos con cámara</button>
      <button data-voiceout class="${voiceOut ? 'on' : ''}">🔊 Voz del tutor en este equipo</button>
      <button data-fullscreen>⛶ Pantalla completa</button>
    </div>

    <h3>Sala</h3>
    <div class="row"><input type="text" value="${room}" data-room style="flex:1"><button data-room-go>Cambiar</button></div>
    <p class="muted" style="font-size:13px">${STATIC ? 'Versión sin servidor: usa el micrófono 🎙 y el toque en este mismo celular.' : `Abre <b>${new URL(`control.html?sala=${room}`, location.href).href}</b> en otro celular para manejarlo a distancia.`}</p>
    <p class="muted" style="font-size:12px">Teclas: flechas girar · +/- zoom · M espejo · F voltear · espacio micrófono · S ajustes</p>
  `;
}

panel.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('button');
  if (!t) return;
  if ('close' in t.dataset) toggleSettings();
  else if (t.dataset.mode) setOpt({ mode: t.dataset.mode as HoloMode });
  else if (t.dataset.toggle === 'mirror') setOpt({ mirror: !holo.options.mirror });
  else if (t.dataset.toggle === 'flip') setOpt({ flip: !holo.options.flip });
  else if ('rot' in t.dataset) setOpt({ rotation: (holo.options.rotation + 90) % 360 });
  else if ('resetOpts' in t.dataset) setOpt({ ...DEFAULT_OPTIONS, mode: holo.options.mode });
  else if (t.dataset.scene) void scenes.goTo(t.dataset.scene).then(renderSettings);
  else if ('gestures' in t.dataset) void toggleGestures(t).then(renderSettings);
  else if ('voiceout' in t.dataset) {
    voiceOut = !voiceOut;
    localStorageSet('rikuy.vozDisplay', voiceOut ? '1' : '0');
    renderSettings();
  } else if ('fullscreen' in t.dataset) void document.documentElement.requestFullscreen?.().catch(() => {});
  else if ('roomGo' in t.dataset) {
    const v = (panel.querySelector('[data-room]') as HTMLInputElement).value.trim().toLowerCase();
    if (v) location.search = `?sala=${encodeURIComponent(v)}`;
  }
});
panel.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.range) {
    holo.setOptions({ [t.dataset.range]: Number(t.value) });
    localStorageSet(OPTS_KEY, JSON.stringify(holo.options));
  }
});
bus.onStatus = () => {
  if (panel.classList.contains('open')) renderSettings();
};

// ---------- Inicio ----------
const start = params.get('escena') ?? 'digestivo';
void scenes.goTo(SCENES[start] ? start : 'digestivo').then(renderSettings);
renderSettings();
showCaption(`Sala ${room} · toca ⚙ para ajustar`);
setTimeout(() => showCaption(''), 6000);

// Mantener la pantalla encendida mientras se proyecta.
async function keepAwake() {
  try {
    await (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<unknown> } }).wakeLock?.request('screen');
  } catch {
    /* no soportado */
  }
}
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void keepAwake());
void keepAwake();

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  view.update(dt);
  scenes.update(dt);
  holo.render();
  requestAnimationFrame(frame);
}
frame();

// Exponer prácticas para depurar en consola.
Object.assign(window, { rikuy: { scenes, view, holo, PRACTICES, practiceById } });
