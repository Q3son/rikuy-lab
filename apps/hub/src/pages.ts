/**
 * Tiny server-rendered pages: hub discovery and the hologram room join sheet. No build step,
 * no external assets (works on a hotspot without internet). UI copy is in Spanish (users).
 */
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

const STYLE = `
:root{color-scheme:light dark;--bg:#faf7f2;--fg:#1f1b16;--muted:#6b6258;--card:#fff;--accent:#b4532a}
@media (prefers-color-scheme:dark){:root{--bg:#16130f;--fg:#f3ede4;--muted:#a89d90;--card:#221d17;--accent:#e08a5c}}
*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--fg);padding:16px}
main{max-width:880px;margin:0 auto}h1{font-size:1.4rem;margin:.2em 0}.muted{color:var(--muted)}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{background:var(--card);border-radius:14px;padding:16px;box-shadow:0 1px 3px #0002}
.card svg{width:100%;height:auto;background:#fff;border-radius:8px}
.code{font:700 2.4rem/1 ui-monospace,monospace;letter-spacing:.15em;color:var(--accent)}
a{color:var(--accent);word-break:break-all}.pill{display:inline-block;padding:2px 10px;border-radius:99px;background:#8883}
.on{background:#2e7d3240}`;

export function discoveryPage(urls: string[], qr: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rikuy hub</title><style>${STYLE}</style></head><body><main>
<h1>Rikuy hub</h1><p class="muted">Conecta los celulares al mismo wifi o punto de acceso y escanea el código.</p>
<div class="grid"><div class="card">${qr}</div><div class="card"><p>Direcciones del hub:</p><ul>${urls
    .map((u) => `<li><a href="${esc(u)}">${esc(u)}</a></li>`)
    .join('')}</ul><p><a href="/holo">Crear sala de holograma</a></p></div></div>
</main></body></html>`;
}

export interface RoomLinks {
  codigo: string;
  proyector: string;
  control: string;
  qr: { proyector: string; control: string };
}

export function holoRoomPage(r: RoomLinks): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sala de holograma</title><style>${STYLE}</style></head><body><main>
<h1>Sala de holograma</h1><p>Código: <span class="code">${esc(r.codigo)}</span></p>
<p class="muted">Escanea cada código con un celular distinto. Si alguno pierde la conexión, se reconecta solo a esta sala.</p>
<div class="grid">
<div class="card"><h2>1. Proyector <span class="pill" id="display">esperando</span></h2><p class="muted">El celular que va bajo la pirámide.</p>${r.qr.proyector}<p><a href="${esc(r.proyector)}">${esc(r.proyector)}</a></p></div>
<div class="card"><h2>2. Control <span class="pill" id="control">esperando</span></h2><p class="muted">El celular que maneja con gestos y voz.</p>${r.qr.control}<p><a href="${esc(r.control)}">${esc(r.control)}</a></p></div>
</div>
<script>
const code=${JSON.stringify(r.codigo)};
async function poll(){try{const s=await (await fetch('/api/holo/salas/'+code)).json();
for(const role of ['display','control']){const el=document.getElementById(role);const on=s.roles.includes(role);el.textContent=on?'conectado':'esperando';el.className='pill'+(on?' on':'');}}catch{}}
poll();setInterval(poll,2000);
</script></main></body></html>`;
}
