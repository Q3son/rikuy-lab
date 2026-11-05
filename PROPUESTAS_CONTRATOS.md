# Propuestas para `@rikuy/contracts` (desde F9, lenguas y currículo)

F9 no edita `packages/contracts`. Estas propuestas van al dueño del sprint 0 para revisión por PR. Todas son aditivas salvo que se indique.

## 1. Estado de revisión de un texto (`TextosLengua`)

Hoy `TextosLengua` solo tiene `revisado: boolean`. La docente necesita distinguir tres situaciones que hoy se confunden:

- **pendiente de hablante nativo** (quechua y aimara: el texto aún no existe);
- **borrador** (texto propuesto, sin revisar; p. ej. de un modelo);
- **revisado** (aprobado con revisor).

Propuesta: campo opcional `estado: z.enum(['pendiente', 'borrador', 'revisado']).optional()`. Mientras no esté, `revisado` manda. Caso de uso: `packages/lenguas/catalogos/quy.json` deja texto vacío con `revisado: false` y necesita mostrarse como pendiente, no como borrador.

## 2. Verificación de citas contra el PDF oficial (`DesempenoRef`)

Las citas del subconjunto CNEB vienen de OCR (secundaria). Ahora no hay forma de saber en el contrato si una cita ya se contrastó con el PDF de MINEDU, así que una cita sin verificar llegaría a alumnos igual que una verificada.

Propuesta: campo opcional `verificadaPdf: z.boolean().default(false)` en `DesempenoRef`. Regla de publicación (F7/F5): una `Practica` con `estado: 'aprobada'` exige `verificadaPdf: true` en su desempeño. Hoy las tres prácticas de `content/practicas/` quedan sin verificar y en `borrador`.

## 3. Revisor obligatorio cuando `revisado: true`

`TextosLengua` permite `revisado: true` sin `revisor`. Propuesta (refinamiento, más estricta): exigir `revisor` no vacío cuando `revisado` es `true`. Es un cambio de validación, así que conviene subir `SCHEMA_VERSION` o confirmar que ningún fixture lo viola. Hoy `validarCatalogo` en `@rikuy/lenguas` ya lo exige.

## 4. Área de `DesempenoRef` más amplia

`DesempenoRef.area` solo admite `'ciencia-y-tecnologia'`. El subconjunto de F9 se limita a esa área, pero el 4.8 prevé "más áreas como salas a medida que haya contenido". Propuesta: `z.enum(['ciencia-y-tecnologia', ...])` con CyT como primera opción. Es aditivo.

## 5. Alinear `Practica.audio` con el manifiesto de audio

`packages/lenguas/src/manifiesto-audio.ts` define por entrada `{clave, archivo, sha256, bytes, duracionS, codec, tasaKbps, canales, hablante, variedad, revisado}`. `Practica.audio` solo guarda `{clave, lengua, sha256, bytes}`. Propuesta: que `Practica.audio` pueda referenciar también `archivo` y `revisado` (opcionales), para que el empaquetado sepa qué audio es apto para alumnos sin abrir el manifiesto.

## 6. Configuración: el `.gitignore` raíz ignora todos los `data/`

La línea `data/` de `.gitignore` (raíz, línea 153) ignora cualquier carpeta `data/`, incluido `packages/curriculum-cneb/data/` (subconjunto CNEB versionado). F9 lo reincluye con un `.gitignore` propio dentro del paquete (`!/data/`). Propuesta para el sprint 0: acotar la regla raíz (p. ej. `/data/` o `apps/*/data/`) o documentar la excepción. No se editó la raíz porque es propiedad del sprint 0.

## 7. Nota sobre la forma de `Practica.modelo`

El modelo de respiración se llama `respiracion` en el contrato y `respiratorio` en el código legado (`packages/core/src/curriculum.ts`). F9 usa `modelo.id: 'respiracion'` y `escenaHolo: 'respiratorio'`. Sin cambio de contrato; se deja anotado para que el nombre se decida una sola vez en F3 (visor) y F4 (tutor).

## Pendiente fuera de F9 (no es propuesta de contrato)

- Pipeline de audio `tools/audio/` (guion, grabación, `loudnorm`, Opus, hash). No se implementó: requiere ffmpeg, que no está instalado, y no se instala sin permiso. El esquema y la validación sí están listos.
- Layouts precalculados del Cerebro con `d3-force`. No se implementó: requiere una dependencia nueva y no se añadió sin permiso.
- Recursos multiformato de exhibiciones (diagrama SVG y quiz del péndulo). Pertenecen a las exhibiciones (`content/museo/`, F5) y no a `Practica`.

## 8. Retroalimentación del quiz fuera del paquete del alumno (`RecursoExhibicion` tipo `quiz`)

El contrato pone `retro` dentro de cada pregunta del quiz, que viaja en el paquete del alumno. Si la retroalimentación dice "correcto" o "incorrecto", revela la clave. F9 la mueve a `content/claves/ensayos/` (con `correctas`), y el paquete del alumno solo lleva enunciados, opciones y referencias de desempeño. Propuesta: que `ClavesQuiz` incluya `retro` y que el esquema de la pregunta no lo tenga. Es un cambio que rompe el contrato actual, así que va con `SCHEMA_VERSION`.


---

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
