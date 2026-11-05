# Contract change proposals from F8 (hub, presence)

F8 did not edit `packages/contracts`. These are proposals for the sprint 0 owner. All of them are additive or clarifications, so `SCHEMA_VERSION` stays at 1.

## 1. Add `rt.reaccion` to `MensajeRtHub`

- **Today:** a client can send `rt.gesto { g: Reaccion }`, but no hub → client message carries a peer's reaction to the others.
- **Workaround in F8:** `@rikuy/presencia` defines `MensajeRtReaccion` and `MensajeRtSalida = MensajeRtHub | MensajeRtReaccion`.
- **Proposal:** `z.strictObject({ t: z.literal('rt.reaccion'), sala: z.string(), d: Dispositivo, g: Reaccion })` in `MensajeRtHub`. It uses a closed list and carries no text, so the rule against free chat between minors holds. After the change, the copy in `presencia/src/propuestas.ts` can be removed.

## 2. Deliver the hub nonce on the socket (`rt.reto`)

- **Today:** `rt.hola.mac` is defined as the HMAC of the class key over the hub nonce, but no message carries that nonce.
- **Workaround in F8:** there is one nonce per hub boot, published at `GET /api/hub` (`nonce`). This is replayable for as long as the hub runs.
- **Proposal:** add a first hub → client message `{ t: 'rt.reto', nonce: z.string().min(16) }`, sent on every connection. Clients answer with `rt.hola`, and the MAC becomes per-connection.

## 3. Pin down the MAC format of `rt.hola`

- **Proposal:** `mac = base64url(HMAC-SHA256(claveClaseMac, nonce))`, not truncated. The 8-byte truncation applies only to the event MAC. This is what `apps/hub/src/discovery.ts` (`macFor`) implements. F2 owns the crypto primitives and may supersede it.

## 4. A way for the teacher device to send orders to the hub

- **Today:** `rt.orden` and `rt.interruptor` exist only in `MensajeRtHub` (hub → client). No message carries them from the teacher to the hub.
- **Workaround in F8:** `POST /api/rt/:claseId/orden` with the hub teacher token. The body is the already-signed `rt.orden` or `rt.interruptor`, and the hub forwards it unchanged.
- **Proposal:** accept the same two shapes in `MensajeRtCliente`. They are valid only after `rt.hola` from the class `docenteDispositivo`, and the firma is checked against `claveClasePub`.

## 5. Clarify that `seq` is contiguous per (claseId, dispositivo)

This is the same as F2's proposal 2. The hub log enforces `UNIQUE (claseId, dispositivo, seq)` and keeps one version vector per class. Please change the `Evento` comment accordingly.

## 6. Normalize the `room` of `BusMessage.hello`

- **Today:** the legacy server and client lowercase the room and strip it to `[a-z0-9-]{1,24}`, with `aula` as the default.
- **Proposal:** document this normalization in `bus.ts`, or add `room: z.string().regex(/^[a-z0-9-]{1,24}$/)`. Then a room code read from a QR or typed by hand always matches. Hub room codes are 5 characters from an alphabet with no ambiguous characters: `[a-hjkmnp-z2-9]`.

## 7. (Optional) `PanelClase` schema for the live panel feed

`GET /api/clases/:id/panel` and the SSE `panel` event return the following shape:

```
{ claseId, eventos, vv, grupos: [{ grupoId, apodo, eventos, porTipo, ultimoHlc }],
  presencia: { salas, dispositivos: [{ dispositivo, grupoId, sala }] }, sync }
```

If F6 wants a contract-level type, F8 proposes adding it as `PanelClase` under `contracts/src/panel.ts`.
