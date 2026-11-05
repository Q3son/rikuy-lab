# Contract change proposals from F2 (sync)

F2 did not edit `packages/contracts`. These are proposals for the sprint 0 owner. All of them
are additive or clarifications, so `SCHEMA_VERSION` stays at 1.

## 1. Add `broadcast` to `Capacidad`

- **Today:** `Capacidad = 'qr' | 'webrtc' | 'ws' | 'http'`, and `Transporte.id: Capacidad`.
- **Problem:** the `broadcast` transport (tabs on the same device, through `BroadcastChannel`) cannot type-check as a `Transporte`.
- **Workaround in F2:** `@rikuy/sync` declares `TransporteSync` with `id: Capacidad | 'broadcast'`.
- **Proposal:** `Capacidad = z.enum(['qr', 'webrtc', 'ws', 'http', 'broadcast'])`. With that, `TransporteSync` can be removed.

## 2. Clarify that `seq` is contiguous per (claseId, dispositivo)

- **Today:** the `Evento` comment says "(dispositivo, seq) unique and contiguous", and the Dexie schema in 3.4 has `&[dispositivo+seq]`.
- **Problem:** one device takes part in several classes. If `seq` is global, every class sees gaps for the events of the other classes. Rule 4 of 3.5 then stops the version vector at the first gap forever, and deltas never shrink.
- **What F2 does:** `seq` is contiguous per (claseId, dispositivo). The Dexie index is `&[claseId+dispositivo+seq]`. The version vector is per class.
- **Proposal:** change the comment to "(claseId, dispositivo, seq) unique; seq contiguous per class and device", and update the excerpt in 3.4.

## 3. Add `docenteDispositivo` to `CuerpoUnion`

- **Today:** the join QR carries `claveClaseMac` and `claveClasePub`, but not the teacher device id.
- **Problem:** a group needs the teacher device id for two things:
  - the authority-device check at ingestion;
  - choosing which peer vector its deltas are computed against.
- **Workaround in F2:** the teacher device id is taken from `Paquete.emisor` of the signed `union` package. This is safe because the package is ECDSA-signed.
- **Proposal:** add `docenteDispositivo: Dispositivo` to `CuerpoUnion`, so the signed body states it explicitly.

## 4. Freeze the enum order of `TipoPaquete` (as for `TIPOS_EVENTO`)

The RK1 positional JSON (3.6) encodes the package type and the event type as indexes into `TipoPaquete.options` and `TIPOS_EVENTO`.

**Proposal:** add the rule "append only, never reorder or delete" to both enums, as a comment and a contract test. Without it, old QR codes and links would decode as the wrong type.

## 5. `quipu.asiento` and authority (for F10)

- **Today:** `quipu.asiento` is not in `TIPOS_AUTORIDAD_DOCENTE`. Any group device can write it with a valid class MAC.
- **F10 gate:** "un grupo no puede emitirse nudos" (a group cannot issue knots to itself).
- **Two options:**
  - add `quipu.asiento` to the authority types, so the teacher phone signs it;
  - let F10's projection ignore entries whose `dispositivo` is not the teacher device.
- **What F2 does:** the F2 projection leaves quipu to F10.
