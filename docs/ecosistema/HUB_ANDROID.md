# T2b feasibility: the hub embedded in the teacher's phone (Capacitor)

**Status:** desk analysis only (F8, wave 1). No APK has been built and no phone has been measured. Items marked **(verify)** must be checked on real devices before this tier is announced. The gate in 5.4, "T2b feasibility report with 10 real phones", is **still open**.

## 1. What has to run on the phone

`apps/hub` today:

- **HTTP** (Hono) plus **one WebSocket** at `/ws`, carrying the `bus`, `rt` and `sync` channels.
- **SQLite** event log and projections, through `node:sqlite`.
- The protocol logic: `@rikuy/presencia` (pure), `SyncHub` and `HoloRelay`. All three are pure state machines driven by a thin socket layer.

The Ollama proxy does not apply on a phone. The tutor falls back to rules (or WebLLM on the client).

The Android app is the same `apps/web` build wrapped by Capacitor (`apps/android`). The phone acts as a hotspot and serves HTTP and WS on `:8787`. Group phones running the same APK use native sockets, so the mixed-content and secure-context limits of 3.7 do not apply.

## 2. Option A: nodejs-mobile running `apps/hub` unchanged

| Aspect | Finding |
|---|---|
| Maintenance | The original Janea Systems project stalled on Node 12/16/18. The **digidem fork** (`github.com/digidem/nodejs-mobile`) is active. It moved to the **Node 24 line** with 24.18.0-0 and published **24.20.0-0** in September 2026. It requires Android 7.0 or later (minSdk 24). Source: release notes; **(verify)** the build on our CI. |
| `node:sqlite` | Included in the full flavor of the Node 24 builds. The *lite* flavor drops sqlite, ICU and the inspector. **We need the full flavor**, or a `better-sqlite3` prebuild for the Android ABIs. **(verify)** `DatabaseSync` with WAL on Android app storage. |
| Code changes | Close to none. Hono, `@hono/node-server`, `ws`, `qrcode` and `node:sqlite` are plain Node. We would bundle `apps/hub` with esbuild into one ESM file plus assets, and point `HUB_DATA_DIR` at `context.getFilesDir()`. |
| Capacitor bridge | Starting Node from Capacitor needs a plugin, either the community `capacitor-nodejs` or a small custom plugin that starts the `libnode` thread. **(verify)** that it is compatible with Capacitor 8 and the digidem build. A custom plugin is about 150 lines of Kotlin. |
| APK size | `libnode.so` adds about 30 to 40 MB per ABI (doc estimate 3.7). Shipping only `arm64-v8a` (plus `armeabi-v7a` for old phones) keeps the APK at about 45 to 60 MB. **(verify)** on an Android Go device, where storage is tight. |
| Memory and CPU | V8 plus the hub is about 40 to 70 MB RSS when idle. **(verify)** with 10 clients at 8 Hz on a low-end phone, and watch the presence tick latency (gate: p95 ≤ 150 ms inside the hub). |
| Background | Android kills background work. The hub must run inside a **foreground service** with a persistent notification ("Clase en curso"), and the teacher's screen may need to stay on. The rules differ by Android version (14+ requires the `connectedDevice` or `dataSync` foreground-service type). **(verify)** |
| Risk | Medium. A single maintainer organization, native build friction, and a large binary. It is still the **fastest path**, because the protocol code is shared byte for byte with the laptop hub. |

## 3. Option B: native Kotlin server (Ktor or NanoHTTPD)

| Aspect | Finding |
|---|---|
| Stack | Ktor server (CIO engine) with its WebSocket plugin, plus Android's built-in `SQLiteDatabase`. NanoHTTPD is smaller but its WebSocket support is dated. **Ktor is preferred.** |
| Code changes | The protocol has to be **reimplemented** in Kotlin: `PresenceServer`, `HoloRelay`, `SyncHub` and the SQLite log, about 800 to 1,200 lines. Zod validation becomes kotlinx.serialization with hand-written checks. `EventoValidado` (per-type `datos` validation) is the costly part. A pragmatic split is to validate the envelope on the phone and let the teacher's web app re-validate on projection. |
| APK size | Ktor CIO adds about 3 to 6 MB. Far smaller than option A. |
| Performance | Good. It runs on the JVM/ART with no second VM. |
| Risk | High drift: two implementations of the same protocol. This is acceptable only if both pass **the same contract suite**, as 5.4 requires. |

## 4. The contract suite (shared by both options)

Most of the test suite is already written against messages, not implementations:

- `packages/presencia/src/servidor.test.ts` and `apps/hub/src/bus/holo-relay.test.ts` and `sync/sync-hub.test.ts` test **pure state machines**.
- `apps/hub/src/server.test.ts` and `gates.test.ts` test **over a real WebSocket and HTTP**, using only the URL.

To run the same suite against the phone, the next step is to parameterize the server-level tests with `HUB_URL`. When it is set, the suite skips `createHub()` and targets the external server. The gates (8 clients, 1,000 events, convergence; restart without loss) then run unchanged against the phone over the hotspot. That is also how the "10 real phones" report gets its numbers.

## 5. Recommendation

1. **Go with option A (nodejs-mobile, digidem Node 24 line, full flavor) for the pilot.** It needs no protocol rewrite, uses the same SQLite schema, and the laptop and phone hubs are identical. This matches the doc's "camino principal" for the multiplayer Museum at the lowest engineering cost.
2. Keep **option B as a fallback** if any of these fails: the APK grows beyond about 60 MB for arm64, memory exceeds about 150 MB on a low-end phone, or the foreground service cannot hold sockets with the screen off.
3. Week-1 spike, in order:
   - Build the digidem AAR and confirm `node -e "require('node:sqlite')"` runs on a real phone.
   - Write the Capacitor plugin that starts the bundled hub in a foreground service.
   - Run `gates.test.ts` with `HUB_URL` pointed at the phone over its own hotspot.
   - Measure presence p95 with 10 phones.
4. In the meantime, **T2 on a laptop (or a mini PC) is the supported path** ([HUB_LOCAL.md](HUB_LOCAL.md)).

Not trivial, so not attempted in this wave: the Capacitor plugin and the AAR build both need the Android SDK and NDK, plus devices.

## Sources

- nodejs-mobile (digidem fork) releases: https://github.com/digidem/nodejs-mobile/releases (24.18.0-0 moves to Node 24 with minSdk 24 and adds a lite flavor without sqlite; 24.20.0-0 is the latest).
