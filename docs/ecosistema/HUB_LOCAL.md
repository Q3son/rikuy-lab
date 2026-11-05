# Rikuy local hub: run it on a laptop, and the hotspot guide

`apps/hub` is the local hub, tier T2 in section 3.7. It runs on any laptop with Node 22.13 or newer and needs no internet. The tier T2b plan (the hub embedded in the teacher's phone) is in [HUB_ANDROID.md](HUB_ANDROID.md).

## What it serves

| Path | What it is |
|---|---|
| `/` | The built PWA (`apps/web/dist`). Without a build, `/` redirects to `/descubrir`. |
| `/ws` | One WebSocket per device. It carries three channels, told apart by message shape: `bus` messages have `{type}`, `rt` messages have `{t:'rt.*'}`, and `sync` messages have `{t:'hola'\|'delta'\|'ack'}`. |
| `/descubrir` | The hub's LAN URLs plus a QR code of the best one. |
| `/holo` | Creates a hologram room and shows two QR codes, one for the projector phone and one for the control phone. |
| `/api/holo/salas` | `POST` creates a room code; `GET /:codigo` shows which roles are connected. |
| `/api/tutor` | The tutor. It uses Ollama if configured and reachable, and falls back to rules in under 1 s. |
| `/api/ia/embeddings` | Embeddings with `nomic-embed-text` for `IndiceVectorial`. Returns 503 without a local model. |
| `/sync` | The same sync session (3.5) over plain HTTP. |
| `/api/clases`, `/api/clases/:id/panel`, `/api/clases/:id/panel/stream` | The teacher panel: a per-group summary plus presence, and a live SSE feed. **Requires the teacher token.** |
| `/api/clases/:id/export.jsonl` | The class event log as JSONL, in HLC order. **Requires the teacher token.** |
| `/api/clases/:id/clave` | `POST {claveMac}` registers the class MAC key, which `rt.hola` is checked against. **Requires the teacher token.** |
| `/api/rt/:id/orden` | `POST` a signed `rt.orden` or `rt.interruptor`. The hub broadcasts it to the class, or to one room. **Requires the teacher token.** |

You can send the teacher token as `Authorization: Bearer <token>` or as `?token=<token>`. The second form is needed for `EventSource`.

## Running it on a laptop

```bash
npm install
npm run build -w @rikuy/web     # optional: lets the hub serve the PWA
npm start -w @rikuy/hub
```

At startup the hub prints its LAN URLs, the discovery page, the hologram room page and the teacher token.

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8787` | HTTP and WS port. |
| `HOST` | `0.0.0.0` | Bind address. |
| `HUB_DATA_DIR` | `apps/hub/data` | Where `hub.sqlite` lives. Uses WAL with `synchronous=FULL`, so committed events survive a crash. |
| `HUB_WEB_DIST` | `apps/web/dist` | The built PWA. |
| `HUB_TOKEN` | random | The teacher token. Set it if you want it to stay the same across restarts. |
| `HUB_PUBLIC_URL` | (guessed) | Forces the URL used in QR codes, for example `http://192.168.43.1:8787`. |
| `HUB_OPEN` | off | Admits `rt.hola` from classes with no registered key. **Demo only.** |
| `OLLAMA_URL` | (none) | For example `http://127.0.0.1:11434`. If it is not set, the tutor uses rules. |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Chat model. It must already be pulled. |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Embedding model. |

Optional local AI:

```bash
ollama pull qwen2.5:3b
ollama pull nomic-embed-text
```

Then start the hub with `OLLAMA_URL=http://127.0.0.1:11434`. Before each answer the hub probes Ollama, with a 400 ms limit. After any failure it uses rules for 30 s, so with Ollama down every answer stays under 1 s.

Persistence: everything is in `hub.sqlite`, an append-only event log plus panel projections. To back it up, copy the file while the hub is stopped, or export the JSONL. Presence is never stored (3.9).

## The two-phone hologram demo

1. Start the hub, then on the laptop open `http://localhost:8787/holo`. The QR codes always use the LAN address, never `localhost`.
2. Scan **QR 1** with the phone that goes under the pyramid. It opens `display.html?sala=<code>`.
3. Scan **QR 2** with the control phone. It opens `control.html?sala=<code>`. Its camera gestures and voice drive the projector.
4. On the room page both labels turn to *conectado*.

To join by hand, type `http://<hub-ip>:8787/control.html?sala=<code>`. The code has 5 characters, is case-insensitive, and leaves out 0/o and 1/l/i.

How the demo recovers from connection problems:

- When a phone reconnects, the hub evicts its old (ghost) connection by `clientId`, so the room never shows two controls.
- The last projector `state` is replayed to any control that joins or rejoins, so the control screen is correct right away.
- The hub pings every socket every 10 s and terminates the ones that stop answering.
- The legacy client reconnects with exponential backoff (1 s up to 15 s). `@rikuy/presencia` also exports `ReconnectingSocket` (backoff with jitter, a stale-link watchdog, and hello resent on every reconnect) for the F3 and F5 clients.

**Camera on the control phone:** browsers only give camera and microphone to secure contexts, and `http://192.168.x.x` is not one. You have three options:

- Use the Vite dev server over HTTPS (`npm run dev`), which proxies `/ws` to the hub.
- In Chrome on Android, add the hub origin under `chrome://flags/#unsafely-treat-insecure-origin-as-secure`. This is for demos only.
- Use the Capacitor APK (T2b), where it does not apply.

## Hotspot guide (no internet)

The usual setup has the teacher's phone or a cheap router provide the wifi, and the laptop runs the hub.

1. **Turn on the hotspot.** Android: *Settings → Network → Hotspot*. Use WPA2, a short password and the 2.4 GHz band, because older phones may not see 5 GHz. Turn off "auto-disable when no devices" if the option exists.
2. **Join the laptop to the hotspot.** On Android the hotspot gateway is usually `192.168.43.1`, or `192.168.x.1` on newer versions. The laptop then gets an address such as `192.168.43.23`.
3. **Start the hub on the laptop.** The first URL printed should be the wifi address. If a virtual adapter appears first (WSL, VirtualBox, Docker), set `HUB_PUBLIC_URL=http://<laptop-wifi-ip>:8787`.
4. **Allow the port through the firewall.**
   - Windows: when asked, allow Node on *private* networks, or run `netsh advfirewall firewall add rule name="Rikuy hub" dir=in action=allow protocol=TCP localport=8787`.
   - macOS: allow incoming connections for `node`.
   - Linux: `sudo ufw allow 8787/tcp`.
5. **Join the phones to the same hotspot** and scan the QR from `/descubrir`, which can be shown on the projector. The hub needs no internet; the phones may show "no internet" on the wifi, which is expected. On Android, choose "Stay connected" so the phone does not fall back to mobile data.
6. **Capacity:** a phone hotspot usually allows 8 to 10 clients, and this is the limit to plan around. At 8 Hz presence uses about 10 KB/s per client with 40 avatars in one room (3.9). This **still has to be checked with 10 real devices**. For a full class, use a cheap travel router instead of the phone hotspot.
7. **Client isolation:** some hotspots and guest networks block client-to-client traffic. If phones cannot reach the laptop even though they are on the same wifi, turn off "AP isolation" or "client isolation", or use another router.

### Troubleshooting

| Symptom | Check |
|---|---|
| A phone cannot open the URL | Same wifi? Is the firewall rule in place? Try `http://<ip>:8787/api/health` from the phone. |
| The QR points to the wrong IP | Set `HUB_PUBLIC_URL`. |
| The room page stays on *esperando* | Did both phones open the URL with the same `?sala=` code? Reload the phone page. |
| The tutor always answers with the `reglas` badge | Is `OLLAMA_URL` set, and is the model pulled? `GET /api/health` shows `ia`. |
| A presence device is closed right after `rt.hola` | Register the class key with `POST /api/clases/:id/clave`, or start the hub with `HUB_OPEN=1` for the demo. |
