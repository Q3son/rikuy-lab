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


---

# F8 (hub)

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


---

# F3 (laboratorio y holograma)

# Propuestas de contratos y configuración (F3)

F3 no edita `packages/contracts` ni la configuración raíz. Estas son las propuestas para el dueño del sprint 0. Todas son aditivas.

## 1. `BusMessage`: confirmación explícita (`ack`)

Hoy el proyector confirma cada orden con `{ type: 'say', speaker: 'agente', text: '✓ <etiqueta>' }` y el control empareja las confirmaciones por etiqueta y orden de llegada (`features/holo/sala/room.ts`). Funciona, pero depende de un texto.

```ts
z.object({ type: z.literal('ack'), ref: z.string(), label: z.string(), from: Role })
// y un `id?: string` opcional en 'command' y 'gesture'
```

Con esto, la latencia por orden es exacta y no hace falta interpretar texto.

## 2. `RUTAS`: subrutas del holograma y del laboratorio

```ts
holoProyector: '/holo/proyector/:sala',
holoControl: '/holo/control/:sala',
holoUnCelular: '/holo/ver/:escena',
```

`features/holo/rutas.ts` ya las usa. `laboratorio: '/lab/:practicaId'` no cambia.

## 3. Puerto `ModeloTutor` (F4)

`features/lab/tutorMock.ts` usa esta forma mientras F4 publica el puerto:

```ts
type EntradaTutor =
  | { momento: 'prediccion'; texto: string }
  | { momento: 'medicion'; longitudM: number }
  | { momento: 'comparacion'; errorMedio: number }
  | { momento: 'conclusion'; texto: string };
interface RespuestaTutor { texto: string; fuente: FuenteIA; comandos: Comando[] }
interface ModeloTutor { responder(e: EntradaTutor): Promise<RespuestaTutor> }
```

## 4. `RespuestaRazonamiento.practicaId` opcional

Las mediciones llevan `practicaId`, las respuestas no. `RegistroLab.eventosDe` atribuye las respuestas a la práctica en curso del dispositivo, porque cada dispositivo corre una práctica a la vez. Con `practicaId?: Ulid` en la respuesta, el *replay* no tendría que suponerlo. Lo mismo para la cita de la conclusión: `datoCitado?: { valorIndependiente: number }`.

## 5. Reglas de dependencias: `holo → core` (solo modelos)

`@rikuy/holo` solo puede depender de `contracts`. Por eso `packages/holo/src/scenes/physics.ts` copia 5 funciones de `@rikuy/core/physics.ts` que solo animan las escenas. Opciones:

- **(a)** Permitir `holo: ['core']` en `.dependency-cruiser.cjs`. Es lo más simple, y `core` es puro.
- **(b)** Mover los modelos visuales a `lab-engine` y permitir `holo → lab-engine`.

Hasta decidirlo, la copia queda marcada y el modelo autoritativo para medir sigue siendo `@rikuy/lab-engine`.

## 6. `.gitignore`: `apps/web/public/mediapipe/`

La raíz ignora `apps/web/public/mediapipe/`, pero 1.4 pide empaquetar el `.wasm` y el `.task` en el repositorio. Hoy se versionan `manifest.json` (versión, origen, tamaño y sha256) y `README.md`. Los binarios (≈ 22 MB) los produce `node apps/web/scripts/mediapipe-assets.mjs`, y `assets.test.ts` los verifica cuando están presentes. Propuesta:

- cambiar la regla por `apps/web/public/mediapipe/**` con excepciones `!manifest.json` y `!README.md` y usar Git LFS para `*.wasm` y `*.task`, **o**
- dejar la regla y correr `mediapipe-assets.mjs` en CI antes del *build*, verificando los hashes del manifiesto.

## 7. `vite.config.ts` (F1)

- El *worker* de gestos es un módulo ES (`new Worker(url, { type: 'module' })`). El *build* actual lo empaqueta bien con Rolldown. Si F1 fija `worker.format`, debe ser `'es'`.
- Grupo de precache **gestos** (1.4): `mediapipe/wasm/*` y `mediapipe/hand_landmarker.task`, que se descargan al habilitar gestos.

## 8. Formato de números

DESIGN §3 pide `Intl.NumberFormat('es-PE')`, pero en CLDR `es-PE` usa punto decimal (`2.09`) y los wireframes dorados usan coma (`2,09`, `10,3`). El laboratorio usa `'es'` (coma) en toda la pantalla, en `features/lab/formato.ts`. Falta decidir cuál manda.


---

# F1 (shell y UI)

# Contract proposals from F1 (Shell, UI and PWA)

F1 does not edit `packages/contracts`. These are the additive changes it needs, for the Sprint 0 owner.

## 1. Routes (`packages/contracts/src/rutas.ts`)

The shell owns these tab roots. They are not in `RUTAS` today, so `apps/web/src/shell/navegacion.ts`
declares them locally. Please add them so museum doors and features agree on the same strings:

| Key | Path | Why |
|---|---|---|
| `hoy` | `/hoy` | Teacher home "Mi clase de hoy" (T-01) |
| `evidencia` | `/evidencia` | Teacher tab Evidencia (= Cierre) |
| `reportes` | `/reportes` | Teacher tab Reportes |
| `lab` | `/lab` | Student tab Lab, home of the tab (E-22). `laboratorio` (`/lab/:practicaId`) stays |
| `quipu` | `/quipu` | Student tab Quipu (E-15) |
| `yo` | `/yo` | Student tab Yo (E-23) |
| `entrar` | `/entrar` | Join by class code and nickname (E-00) |

`RUTAS.docente` (`/docente`) stays free for the sub-screens of F6.

## 2. Audio manifest entry (F9 hands it to F1)

The narrator (`apps/web/src/shell/accesibilidad/narrador.ts`) plays a recording when the manifest has one
for the key and the active language. It needs, per entry:

```ts
{ clave: string; lengua: Lengua; sha256: string; bytes: number; url?: string; estado: 'borrador' | 'grabado' | 'revisado' }
```

- F1 resolves the URL as `./audio/<sha256>.opus` when `url` is missing (content addressed, precached in the
  `clase` group).
- Only `estado: 'revisado'` entries must be registered with `registrarManifiestoAudio()`; a draft is never played.
  Today `contracts` has `Practica.audio` without `url` or `estado`; please add `estado` (the review state of
  FUNCIONES_EXTRA 4.3).

## 3. Level of support (`Clase`, optional)

FUNCIONES_EXTRA function 3 says the teacher can set a default level. Proposed additive field:

```ts
nivelPorDefecto: z.enum(['apoyo', 'normal', 'desafio']).default('normal')
```

It is a class setting, never a student attribute, and it must not reach the Brain nor any report.

## 4. Feature flags (`apps/web/src/app/flags.ts`)

The file was listed as Sprint 0 work (ARQUITECTURA 5.3 item 4) but did not exist. F1 created it with the five
flags (`senales`, `gestos`, `webrtc`, `iaLocal`, `iaNube`, all off). Please adopt or replace it; nothing else depends
on its shape yet.

## 5. Playwright (`playwright.config.ts`)

The preview uses a self-signed certificate. `ignoreHTTPSErrors` does not cover the service worker script fetch in
Chromium, so the worker never installed and the `avion` project could not pass. F1 added
`launchOptions: { args: ['--ignore-certificate-errors'] }` to `use`. This is a harness fix, listed here because the
file belongs to the Sprint 0 root.

## 6. Dependencies

- `axe-core` was added as a root dev dependency (commit `build: add axe-core ...`) for the accessibility tests the
  coordinator asked for. It changes `package-lock.json`; the integrator may re-lock.
- `packages/ui` tests use `@testing-library/*`, `jsdom` and `axe-core` from the root `node_modules` without declaring them
  in `packages/ui/package.json` (declaring them would change the lock). Declare them when the lock is regenerated.

# F4 (tutor)

# Propuestas de cambio a `@rikuy/contracts`

Cada frente agrega su sección. Los cambios van por PR al dueño del sprint 0 (ARQUITECTURA 2.3.4, 5.5); aquí solo se registran.

## F4: Tutor, juez y memoria

Todas son aditivas salvo donde se indica.

1. **`dar_pista.nivel` de 1 a 4 vs. escalera de 3 peldaños.** El contrato permite `nivel` 1-4 (`Comando`, `pista.mostrada`), pero ECOSISTEMA 2.4 y ARQUITECTURA 3.10 hablan de peldaños 1/2/3 ("pista 3"). `@rikuy/tutor` fija `MAX_PELDANOS = 3` y `validarComandos` rechaza el 4. Propuesta: bajar el máximo a 3 en ambos esquemas (cambio que rompe: subir `SCHEMA_VERSION`) o declarar la constante en contracts.
2. **`ModeloJuez.fuente`.** ARQUITECTURA 4.2 define `ModeloJuez.juzgar(...)`: `Result<VeredictoJuez, FalloIA>`. Para marcar la `fuente` (`ia-local` o `ia-nube`) sin adivinarla, el puerto declara `readonly fuente` y devuelve una corrida (`{ nivel, cita }`); el juez agrega tres corridas. Lo mismo para `ModeloTutor`. Propuesta: mover `FalloIA`, `SolicitudJuez`, `VeredictoJuez` y `ModeloTutor` a `@rikuy/contracts` (hoy viven en `packages/tutor/src/juez/tipos.ts` y `puertos.ts`) para que `@rikuy/ai` no dependa de `tutor` solo por tipos.
3. **`Result<T,E>`.** ARQUITECTURA 2.2 lo ubica en `@rikuy/core`, pero el `core` actual es el heredado (sin `Result`, sin `normalizar` con límites de palabra). `tutor` usa una copia local (`packages/tutor/src/result.ts`, forma `{ ok, valor | error }`). Propuesta: que `core` exporte `Result` con esa forma y `normalizar`/`palabras` con límites de palabra y decimales con coma intactos.
4. **Contraste predicción-dato en la proyección de memoria.** `prediccion_confirmada/refutada` necesita comparar el texto de la predicción con las mediciones, y `memoria` no puede importar `tutor`. Se resolvió con la función inyectada `ContextoProyeccion.contraste` (la raíz de composición pasa `contrastarPrediccion` de `@rikuy/tutor`; ver `apps/web/src/features/tutor/integracion.test.ts`). Propuesta alternativa: que la `Evidencia` de `prediccion` lleve un campo opcional `contraste: 'confirma' | 'contradice' | 'indeterminado'` calculado por el juez.
5. **`MemoriaEntrada.competencia` sin `cita`.** El `pick` omite `cita`; está bien. Solo se deja constancia de que la proyección no la rellena.
6. **`ConsultaMemoria.recuperar` sin texto libre.** La búsqueda por palabras clave (MiniSearch) vive en `MemoriaLocal.buscar(texto, filtros)`, fuera del puerto. Propuesta: agregar `buscar?(texto, filtros)` opcional al puerto si `cerebro` o `reportes` lo necesitan.
7. **Ruta del tutor.** `RUTAS` no tiene entrada para el tutor. La feature registra `tutor` (relativa a `/`) en `features/tutor/rutas.ts`. Propuesta: agregar `tutor: '/tutor'` a `RUTAS`.
8. **Evento `tutor.turno`.** `DatosTutorTurno` exige `grupoId` ULID; el panel emite `{ grupoId, fuente, texto, comandos }` por callback `onTurno` y deja a quien componga la app construir el evento.

# F6 (panel docente, evidencia y Familia)

# Propuestas de contratos por frente

Cada frente anota aquí lo que necesita que cambie en `@rikuy/contracts` (regla 5.5: solo el dueño del Sprint 0 toca `contracts/`). Todo es **aditivo** salvo que se diga lo contrario. El integrador concatena las secciones de cada frente.

## F6. Panel docente, evidencia y Familia

### F6-1. Modelos de plantillas de informes (nuevo, aditivo)

Hoy viven como esquemas Zod `strict` en `packages/evidencia/src/plantillas/modelos.ts` (lista permitida: un campo no listado falla en ejecución y en compilación). Se proponen para `@rikuy/contracts` (o para `@rikuy/mensajeria`, ver F6-2):

- `EntradaFamilia` (variantes `A` por grupo, `B` individual; `B` solo con `nombre` de pila y una `LineaPositiva`).
- `EntradaTutora` (resumen semanal a la docente-tutora).
- `EntradaInforme` (informe mensual del director y de la UGEL; `MIN_CELDA = 5`).

Reglas ya probadas con instantáneas y pruebas de contrato: sin datos de Guardián, sin frases literales ni apodos en tutora/director, sin orden por puntaje, celdas con menos de 5 suprimidas sin filtrar el número, quechua solo con `revisado: true`.

### F6-2. Paquete `@rikuy/mensajeria` y puerto `PuertoEntrega` (de FUNCIONES_EXTRA 1.6)

Se implementó **dentro de `packages/evidencia/src/mensajeria/`** para no tocar la configuración de raíz (`.dependency-cruiser.cjs`). Mover tal cual a `packages/mensajeria/` cuando el Sprint 0 lo cree, con las reglas `mensajeria → reportes, core, lenguas` y `mensajeria ✗→ senales`.

Contenido: `Canal`, `EstadoEntrega`, `Plantilla`, `MensajeSaliente`, `Destino`, `AcuseEnvio`, `FalloEntrega`, `PuertoEntrega` (nombres de la especificación), `AdaptadorEntregaSimulado` (`crearAdaptadorSimulado`), cola persistente `crearColaSalida` con `AlmacenSalida`.

Decisiones de implementación que conviene confirmar:

1. `MensajeSaliente.cuerpo` lleva `asunto`, `texto` y `html`. El PDF del director/UGEL **no** va embebido: `RenderizadoInforme.htmlImprimible` (HTML con `@page{size:A4}`) y `adjunto.nombre`; lo convierte el navegador ("Guardar como PDF") o el adaptador de servidor de F7.
2. `AcuseEnvio.manual?: boolean` (adaptador `wa.me`): queda como "Preparado, tú tocas Enviar", nunca "entregado".
3. La tabla `salida_mensajes` se persiste hoy en `localStorage` (`rikuy.salida.v1`) detrás de `AlmacenSalida`. F2 debe darle una tabla Dexie excluida de la sincronización de eventos.
4. Disparador del vaciado: el evento `window` `rikuy:sync` (y `online`). F2/F8 deben emitir `rikuy:sync` al completar cada sincronización con el hub.
5. Ventana de envío 17:00 a 20:00 (Lima, sin domingos) implementada como opción `respetarVentana` de `cola.drenar`; la bandeja de la docente la deja apagada porque ella aprueba y envía de forma manual.
6. Acta del mensaje (`ItemSalida.acta`): plantilla, versión, hash SHA-256 del contenido, referencia de consentimiento y aprobador. No guarda el texto del niño.

### F6-3. `Clase.contexto` (FUNCIONES_EXTRA, función 4; aditivo)

```ts
ContextoAula = { region, zona: 'urbana'|'rural', lenguaComunidad: Lengua,
                 festividades: string[<=8], floraFauna: string[<=8], clima?: string, materialesCaseros: string[<=8] }
```

Hoy: `apps/web/src/features/docente/estado/contexto.ts` (Zod `strict`), guardado solo en el celular de la docente. Propuesta: `Clase.contexto?: ContextoAula` y `DatosClaseConfig.contexto?`. Lo usan F7 (Creador), F9 (calendario regional) y los informes (una frase local: "Falta poco para Yaku Raymi.").

### F6-4. Contratos del Ayudante del museo (FUNCIONES_EXTRA 2.4)

`PedidoAyuda`, `OfertaAyuda`, `CierreAyuda`, eventos `ayuda.pedida | ayuda.ofrecida | ayuda.aceptada | ayuda.cerrada`, `quipu.nudo.confirmado | quipu.nudo.revocado`, `AsientoQuipu.motivo += 'ayuda_a_otro_grupo'`. El tablero T-23 se construyó contra una fuente simulada (`features/docente/ayudas/tablero.ts`) con exactamente esos nombres; al llegar los contratos solo cambia la fuente. La pantalla no ordena por cantidad de ayudas y la revocación es una corrección, no un borrado.

### F6-5. Recepción del relevo QR (API de F2, hoy simulada)

Puerto usado por el cierre (`features/docente/puertos.ts`):

```ts
ReceptorRelevo.agregarCuadro(texto): { estado: 'invalido' | 'otra_clase' }
  | { estado: 'parcial', recibidos, total, faltan }
  | { estado: 'completo', emisor, eventos: Evento[] }
CodecQr.codificar(tipo: 'E'|'P'|'J'|'A'|'F', valor): string[]   // marcos RK1
```

Simulado con un RK1 real (Base45 RFC 9285 + deflate-raw + CRC32, 450 caracteres por marco) en `simulacion/rk1.ts`. Pedimos a F2 que `@rikuy/sync` exporte exactamente esta forma para sustituirlo sin tocar la UI. Un paquete `eventos` completo se valida con `Paquete` y se filtra por `claseId`.

### F6-6. QR de vuelta de la hoja A4 (nuevo formato, a decidir por F2)

La hoja impresa lleva un QR con el texto `RKR:<codigoClase>:<practicaId>` (sin datos de personas). Propuesta: tipo de marco `R` (retorno) en `MARCO_QR_REGEX` o reutilizar `J`. Hoy lo lee el docente como texto; T-08 lo reconocería para abrir la clase correcta.

### F6-7. Mapeo indicador → capacidad CNEB

`packages/evidencia/src/competencias.ts`: `prediccion→Problematiza`, `variable→Diseña estrategias`, `uso_del_dato→Genera y registra`, `justificacion→Analiza datos`, `conclusion_coherente→Evalúa y comunica`. Los nombres de las cinco capacidades de la competencia 1 deben verificarse letra por letra contra `@rikuy/curriculum-cneb` (F9). Propuesta: que `Indicador` lleve su `capacidad` en el contrato o en el JSON curricular.

### F6-8. Enlace de familia

`https://<origen>/#/p/<base64url(deflateRaw(JSON(Paquete 'practica')))>.<crc32 en base36>`. El contenido es un `Paquete` de tipo `practica` firmado (validado con `PaqueteValidado` al abrir). Funciona sin red porque la ruta `/p/:carga` es del enrutador por hash. Falta (F1): que el *service worker* precachee la *shell* para el caso de recarga completa en modo avión (`e2e/docente/familia.avion.spec.ts` está en `fixme` por eso).

### F6-9. Datos que **nunca** salen del celular de la docente

`padron` (nombres), contactos de familias, correos y números de la docente/director/UGEL. Viven en `localStorage` (`rikuy.docente.v1`, `rikuy.contactos.v1`) y no entran en eventos, QR, paquetes ni plantillas. Solo viajan en el sobre de `POST /mensajes` (F7) con TTL corto.

# F10 (guardián, reportes, quipu y Cerebro)

# Propuestas de contrato (F10: Guardián, reportes, quipu, Cerebro)

Nada de esto se aplicó en `packages/contracts`. Cada punto es aditivo salvo que se diga lo contrario. El código de F10 usa hoy tipos locales (indicados entre paréntesis) y migra a `contracts` cuando el dueño del Sprint 0 acepte la propuesta.

## 1. Rikuy Guardián (`@rikuy/senales`)

| # | Propuesta | Motivo | Hoy |
|---|---|---|---|
| G1 | `PedidoDeAyuda { id, estudianteId, claseId, destino: 'docente' \| 'otro_adulto', urgente: boolean, hlc }` | El botón "Necesito hablar" (E-20d) no cabe en `AutorreporteMomento`: este exige al menos una emoción. `urgente` lo declara el alumno de forma explícita ("alguien me hace daño o estoy en peligro"); es lo único que activa `escalarSiseVe`, sin analizar texto libre | `PedidoDeAyuda` en `senales/src/checkin.ts` |
| G2 | `AlertaDocente.motivos` admite también `'pidio_hablar'` (p. ej. `MotivoAlerta = EstadoSenalApoyo \| 'pidio_hablar'`) | Hoy `motivos` exige al menos un estado de conducta; una sugerencia que nace solo de un pedido del alumno no puede expresarse como `AlertaDocente` | `SugerenciaAcercamiento.alerta` es opcional |
| G3 | `AutorreporteMomento`: resultado alterno `no_se` / `prefiero_no_decir` / `omitido` (unión discriminada o campo `respuesta`) | `emociones` tiene `min(1)`; "No sé" y "Prefiero no decir" son respuestas de primera clase del diseño (DESIGN 10.8) | `ResultadoCheckIn` en `senales/src/checkin.ts` |
| G4 | `EmocionAutorreporte` += `dolor_cuerpo`, `sin_fuerzas`, `soledad` | DESIGN 10.8 y ECOSISTEMA 2.14 piden palabras de cuerpo y relación; hoy el enum solo tiene 12 emociones (cansancio cubre "sin fuerzas" a medias) | no se ofrecen |
| G5 | `EventoAprendizaje` += `habilidad?: string` (clave de habilidad CNEB/concepto) | "Atascado en la **habilidad** X" hoy se aproxima con `pasoId` | `pasoId` hace de habilidad |
| G6 | `SenalApoyo` += `pasoId?: string` | Para redactar "…en «medir 10 oscilaciones»" sin buscar los eventos de soporte | `pasoDeSenal` inyectable en `generarSugerencias` |
| G7 | **Reemplazar** `AgregadoSenales` (`confusion`, `frustracion`, `atencion`) por `AgregadoCurso` (participantes, pedidos de pista por bloque de 5 min, `ayudaDeseada`) | Los campos nombran emociones: contradicen la decisión del 5 nov 2026 (Guardián no infiere emociones). Cambio **rompedor**; `senales.agregado` queda sin emisor en Nivel 1 | `AgregadoCurso` en `senales/src/agregado.ts`; `AgregadoSenales` no se emite |
| G8 | `ConsentimientoGuardian` += `vigenteHasta` (o fijar el período escolar) | El diseño pide renovar cada período escolar; hoy se deriva de `hlc` (120 días) | `VIGENCIA_CONSENTIMIENTO_MS` |
| G9 | Renombrar paquete `@rikuy/senales` → `@rikuy/guardian` y bandera `VITE_FLAG_SENALES` → `VITE_FLAG_GUARDIAN_NIVEL2` | ARQUITECTURA 4.9. Toca raíz (`.dependency-cruiser.cjs`, `eslint.config.js`, workspaces): lo hace el Sprint 0 / integrador | sin renombrar |
| G10 | Regla de dependencias: añadir `mensajeria ✗→ senales` cuando exista el paquete de F6 | FUNCIONES_EXTRA 1.5 | ya existe `memoria, evidencia, reportes, cerebro, quipu ✗→ senales` |

Decisiones de producto tomadas en esta versión (revisar):

- Ninguna etiqueta emocional llega a un objeto para la docente, **tampoco el contenido de un check-in compartido**: solo paso, ayuda pedida y las palabras propias del alumno (`textoDelEstudiante`, único campo exento). Si el producto quiere mostrar las emociones compartidas, hay que cambiar el contrato de lenguaje de DESIGN 10.9.
- Un check-in `solo_yo` con `ayuda='hablar_con_docente'` **no** genera sugerencia (contradice su visibilidad). La interfaz debería ofrecer "Necesito hablar" en ese caso.
- Las escalaciones SíseVe no cuentan para el tope de 3 por semana; el resto se difiere a la semana siguiente (`planificarSemana().diferidas`).
- Un pedido dirigido a `otro_adulto` no se enruta a la docente como sugerencia (solo se cuenta).
- Nivel 2 no está construido: solo existe la compuerta cerrada (`nivel2Disponible`), apagada por defecto y bloqueada en la UE.

## 2. Quipu (`@rikuy/quipu`)

| # | Propuesta | Motivo |
|---|---|---|
| Q1 | `AyudaCerrada` (evento `ayuda.cerrada` de F5, ver FUNCIONES_EXTRA 2.4) con `aulaId`, `ayudanteGrupoId`, `pideGrupoId`, `conceptoId`, `resultado`, `juez`, `confirmacion`, `ts` | Entrada de las reglas del "Ayudante del museo" (`asientosDeAyuda`). Hoy es un tipo local |
| Q2 | `AsientoQuipu.motivo` ya trae `ayudo_a_otro_grupo`; FUNCIONES_EXTRA nombra `ayuda_a_otro_grupo`. Se usa el del contrato | Unificar el nombre |
| Q3 | ARQUITECTURA 3.11 da el nudo de ayuda "a los dos grupos"; FUNCIONES_EXTRA 2.5 lo da "al grupo ayudante + 1 al aula". Se implementó **FUNCIONES_EXTRA** (el grupo que pide no queda marcado ni recibe nada) | Decisión de producto a confirmar |
| Q4 | `AsientoQuipu` += `ts` (o ventana de emisión) | Los topes anticolusión (3 por día y grupo ayudante; 1 por (ayudante, pide, concepto) por semana) se evalúan hoy contra el historial de `AyudaCerrada` |

## 3. Reportes (`@rikuy/reportes`)

| # | Propuesta | Motivo |
|---|---|---|
| R1 | Esquemas Zod `ReporteDocente`, `ReporteCompetenciasAgregado`, `ReporteMensual` y `EntradaMensual` en `contracts` | ARQUITECTURA 4.7 pide modelos "validados por Zod". `reportes` no declara `zod` como dependencia (evita tocar el lockfile en una rama de frente), así que valida con una lista permitida propia (`validarEntradaMensual`, `validarReporteAgregado`) |
| R2 | `DudaConcepto { id, claseId, grupoId, exhibicionId, conceptoId, frase?, hlc }` y tipo de evento `duda.enviada` | Caja de dudas (EIDOS). F4 captura; `frase` nunca entra al mapa de calor |
| R3 | `Clase.cierres` y campos de continuidad/entregas (`paquetesEnviados`, `paquetesDevueltos`, `entregasPorCanal`) | El informe mensual los agrega; hoy `AulaMes` los recibe ya agregados desde la nube |
| R4 | Umbral de la Caja de dudas: 3 grupos (FUNCIONES_EXTRA, vista de la docente de su propia clase); director y UGEL: 5 | Dos umbrales distintos, ambos constantes (`MIN_GRUPOS_CELDA_DUDAS`, `K_MIN`) |

Garantías implementadas: `reportes` no importa `senales` (regla de dependencias) y `validarReporteAgregado` rechaza campos `cita`, `alias`, `grupoId`, `estudianteId`, ULIDs y vocabulario emocional o de Guardián.

## 4. Mi Cerebro Rikuy (`@rikuy/cerebro`)

| # | Propuesta | Motivo |
|---|---|---|
| C1 | `curriculum-cneb` exporta el grafo (`GrafoCurricular`: nodos con `tipo`, `padre`, `sala`) y el layout precalculado como `{ nodeId, x, y }[]` (F9, d3-force en el *build*) | `resolverLayout` ya consume esa interfaz y cae a un layout circular determinista si falta o está incompleto. No hay d3 en tiempo de ejecución |
| C2 | Convención de id de nodo de desempeño: `${nivel}-${grado}:cyt:c${competencia}:d${desempeno}` (`idNodoDesempeno`) | Une `MemoriaEntrada.competencia` con el nodo |
| C3 | `MemoriaEntrada` += `nodoIds?: string[]` o documentar que `conceptos[]` son ids de nodo | Hoy `conceptos` se interpreta como ids de nodo del grafo |
| C4 | Evento `museo.visita` con `conceptoIds?: string[]` | Para que una visita encienda "explorado" (hoy `Exploracion.nodoIds` mock) |

## 5. Cableado en la app (dueño: Sprint 0 / F1)

- `apps/web/src/app/rutas.tsx`: añadir `guardian` (y `reportes`) a `rutasDeFeatures`. `features/cerebro/rutas.ts` ya está cableado y define `/cerebro`; `features/guardian/rutas.ts` define `/guardian` (demo) pero **no** está importado.
- `apps/web/src/app/flags.ts` no existe todavía: el flag de Nivel 2 debe leerse allí y pasarse a `nivel2Disponible({ flagCompilacion })`.
- `CheckInMomento`, `NecesitoHablar`, `PulsoDelCurso`, `IndicadorGuardian`, `CajaDeDudas` son componentes de presentación que F3/F4 montan dentro de la exhibición; `GuardianDemo` es el contenedor de ejemplo con ids simulados.

# F7 (IA, Creador, mensajería y campus)

# Propuestas de contratos: F7 (capa de IA, Creador, nube y mensajería)

Esta rama no edita `packages/contracts`. Lo que sigue son cambios **aditivos** que F7 necesita o que dejó definidos localmente y conviene subir al Sprint 0.

## 1. Tipos que hoy viven en `@rikuy/ai` y `@rikuy/mensajeria` (mover a contracts)

| Tipo | Dónde está hoy | Propuesta |
|---|---|---|
| `FalloIA`, `FuenteIA` (ya existe) | `packages/ai/src/puertos.ts` | Subir `FalloIA` (`sin_red`, `timeout`, `cuota`, `esquema`, `politica`, `proveedor`) para que `@rikuy/tutor` y `@rikuy/ai` compartan el mismo tipo. |
| `MensajeSaliente`, `Destino`, `AcuseEnvio`, `Canal`, `EstadoEntrega`, `FalloEntrega`, `PuertoEntrega` | `packages/mensajeria/src/puertos.ts` (FUNCIONES_EXTRA 1.6) | Subir los esquemas Zod `MensajeSalienteSchema` y `DestinoSchema` (ya son `strictObject`); los puertos quedan en `@rikuy/mensajeria`. |
| Evento `mensaje.estado` y `consentimiento.baja` | no existe | Nuevos tipos de evento (FUNCIONES_EXTRA 1.6): el estado de entrega vuelve al hub en el siguiente sync; la baja crea `consentimiento.baja`. |
| `Consentimiento.informes` | no existe | Estado `pendiente \| sí \| no \| baja`, canal, lengua, frecuencia, variante A o B (FUNCIONES_EXTRA 1.6). |
| `AgregadoSemanal` (celdas por competencia y nivel, k >= 5) | `apps/cloud/src/almacen.ts` | Compartir con `@rikuy/reportes` (F10): hoy la nube valida y suprime con su propio esquema `strict`. Cuando `reportes` exporte `suprimirCeldas`, la nube lo usa en lugar de `suprimir()`. |

## 2. Recursos multiformato que el Creador produce y el contrato no puede guardar

`RecursoExhibicion` solo admite `video` (con `archivo` y `poster`), `audio`, `diagrama`, `holograma` y `quiz`. El Creador genera, como borrador:

- **Guion de video** (lista de escenas). Hoy viaja aparte en `PropuestaCreador.guionVideo` y no se publica. Propuesta: tipo `guion` (`escenas: string[]`, `duracionS` estimada) o dejarlo como campo opcional de `video` mientras no hay archivo.
- **Pictograma** (PNG de Muse Image, sin texto dentro). Propuesta: tipo `imagen` con `archivo`, `alt` obligatorio y `generadoPor`.

## 3. Firma del paquete (coordinar con F2)

F2 es dueño del puerto `Cripto`. Para cerrar la cadena sin esperar, F7 implementó en `packages/ai/src/firma.ts`: ECDSA P-256 / SHA-256 sobre JSON canónico (claves ordenadas, `firma` excluida), firma en base64url del valor crudo P1363 de WebCrypto, clave pública en SPKI base64url.

- Propuesta: F2 adopta este formato o dice cuál usa; en ambos casos `apps/cloud` solo verifica (`verificarPaquete`, `verificarObjeto`) y se cambia en un solo lugar.
- `Paquete.emisor` es hoy un `string` libre; la nube **no** deduce la clave pública de ahí: la recibe en el cuerpo (`clavePublica`). Propuesta: que `Clase.claveClasePub` (ya existe) sea la fuente y que el paquete de práctica lleve `kid` o la clave.

## 4. Currículo (F9)

`ai → curriculum-cneb` está permitido, pero el paquete aún es un esqueleto. F7 declaró el puerto que necesita (`CatalogoDesempenos.textoOficial(ref)` y `listar()` en `packages/ai/src/catalogo.ts`) y trae **una sola entrada de muestra** (`CATALOGO_DESEMPENOS_MINIMO`, el desempeño del fixture de contracts) marcada para contrastar con el PDF oficial.

- Propuesta: `@rikuy/curriculum-cneb` exporta `textoDesempeno(ref)` y `listarDesempenos()`; `apps/cloud/src/deps.ts` reemplaza la muestra.
- Propuesta: el contrato `Practica` ya tiene `desempeno.cita` (>= 20 caracteres): la nube la verifica con `indexOf` exacto contra el texto oficial antes de registrar un paquete (`POST /paquetes`).

## 5. Puertos del tutor

`ModeloTutor` y `ModeloJuez` los declara `@rikuy/tutor` (F4). El enrutador de F7 es genérico por capacidad (`Capacidad = generarPractica \| revisarPractica \| pictogramas \| visionTabla \| traducir`). Cuando F4 publique sus puertos, se agregan `tutor` y `juez` a `Capacidades` con política `local` por defecto (privacidad) y 6 s de tiempo.

## 6. Decisiones y verificaciones pendientes (no son contratos)

- **Nombre del modelo Gemini**: `gemini-2.5-flash` es el valor por defecto, configurable con `GEMINI_MODEL`. **Verificar** en la cuenta y las tarifas de `packages/ai/src/presupuesto.ts` (indicativas).
- **Meta `strict:true`** en `text.format`: Willay probó `strict:false`; el adaptador usa `false` y expone `estricto`. **Verificar** antes de activarlo.
- **WhatsApp Business**: el adaptador usa plantillas de utilidad con un solo parámetro de cuerpo (`WHATSAPP_TEMPLATE`, por defecto `informe_semanal`). Falta elegir proveedor, aprobar la plantilla y verificar precios (FUNCIONES_EXTRA 1.1). No se probó contra la API real.
- **Contacto cifrado en el sobre** (FUNCIONES_EXTRA 1.6): hoy viaja en claro dentro de TLS y la nube no lo guarda (solo una clave de baja con HMAC y un registro de idempotencia sin contacto). El cifrado con TTL corto queda pendiente.
- **Autenticación de la nube**: hoy hay `x-rikuy-colegio` (sin secreto) y límites por IP. Falta un token por colegio antes de producción; el presupuesto mensual por colegio depende de ello.
- **Dependencias**: `packages/ai`, `packages/mensajeria` y `apps/cloud` importan `zod` por hoisting (lo declara `@rikuy/contracts`). El integrador debe agregar `"zod"` a sus `package.json` y regenerar `package-lock.json` (esta rama no toca el lock). `apps/cloud/package.json` agrega `@rikuy/mensajeria`.
- **Reglas de dependencia** agregadas en `.dependency-cruiser.cjs`: `mensajeria` (puede importar `core`, `reportes`, `lenguas`; regla nombrada `mensajeria-never-senales`), `apps/cloud` y `apps/hub` pueden usar `mensajeria`. También está en `DOMAIN` de ESLint (sin `fetch`).

## 7. Créditos

Los reintentos (429/5xx, 2 reintentos con 1 s y 2 s, "referenced response not found"), el control de presupuesto previo a la llamada, los precios por modelo, el formato de `/v1/responses` con `json_schema` y `/images/generations` y el registro de uso solo con metadatos están adaptados de `yughiyami/willay` (`backend/willay/adapters/meta_model_api.py`, `meta_usage.py`, `docs/META_API.md`). Anotar en `docs/ATRIBUCIONES.md`.

# F5 (museo, retos y Ayudante del museo)

# Propuestas de cambio a `@rikuy/contracts`

> Los frentes no editan `packages/contracts/` (5.5). Cada frente anota aquí lo que necesita; el dueño del Sprint 0 lo aplica por PR como cambio **aditivo** (campos opcionales, tipos de evento nuevos). Mientras tanto, cada frente trabaja con tipos locales equivalentes y adaptadores simulados.

## F5. Museo Rikuy y retos

### F5-1. Eventos del Ayudante del museo (FUNCIONES_EXTRA §2.4)

Hoy viven como tipos locales en `packages/campus/src/ayudante.ts` (`EventoAyuda`) y se registran en el log en memoria de `apps/web/src/features/mundo/eventos.ts`.

```ts
// TIPOS_EVENTO += (ninguno es de autoridad docente salvo los dos de quipu.nudo.*)
'ayuda.pedida'    datos: { pedidoId, grupoPideId: Ulid, exhibicionId, nodoId, necesidad: 'otras_palabras'|'como_medir'|'revisar_dato' }
'ayuda.ofrecida'  datos: { ofertaId, pedidoId, grupoAyudaId: Ulid }
'ayuda.aceptada'  datos: { pedidoId, ofertaId, grupoAyudaId: Ulid }
'ayuda.cerrada'   datos: { pedidoId, resultado: 'nos_ayudo'|'casi'|'aun_no', nivelJuez?: 'razonado'|'explorado'|'no_evaluable' }
'quipu.nudo.confirmado' (autoridad docente cuando la regla de la clase es "docente confirma")
                  datos: { nudoId, pedidoId, motivo: 'ayudo_a_otro_grupo', nodoId,
                           beneficiarios: [{ tipo: 'grupo', grupoId }, { tipo: 'aula' }] }
'quipu.nudo.revocado'  (autoridad docente) mismos datos; F10 lo traduce en un AsientoQuipu de corrección (`corrigeA`)
```

- Todos `strictObject`: **sin texto libre** hacia otros grupos. La frase "con tus palabras" del grupo que pide **no** viaja en `ayuda.cerrada`; solo el nivel del juez. Si F4 quiere la cita, va por `respuesta.registrada` como hoy.
- Esquemas propuestos `PedidoAyuda`, `OfertaAyuda`, `CierreAyuda` = las interfaces de `ayudante.ts`.
- `MotivoQuipu` ya tiene `ayudo_a_otro_grupo`: se reutiliza (FUNCIONES_EXTRA lo escribe `ayuda_a_otro_grupo`; se propone **no** agregar el sinónimo).

### F5-2. Mensajes de tiempo real del Ayudante (`rt.*`, para F8)

```ts
// cliente → hub
| { t: 'rt.ayuda', a: AccionAyudante }   // acciones de la máquina de estados (pedir, responder, cerrar, cancelar); strict, sin texto libre
// hub → cliente
| { t: 'rt.ayuda.estado', pedidos: PedidoAyuda[] }  // solo los pedidos que le tocan a ese grupo + los abiertos (anónimos: emblema, sin integrante)
```

El hub (o el celular de la docente) es la autoridad que aplica `aplicar()` de `@rikuy/campus`.

### F5-3. Reacciones extendidas (FUNCIONES_EXTRA §2.7)

`Reaccion = z.enum(['saludar','senalar','aplaudir','ayuda','gracias','ya_entendi','ahora_no'])` (lista cerrada y versionada). La UI hoy usa solo las 4 del contrato.

### F5-4. Rutas

`RUTAS.reto = '/retos/:retoId'` y `RUTAS.museoLista = '/museo/lista'`, `RUTAS.museoAyudas = '/museo/ayudas'` (T-23). Hoy `rutaDeReto()` en `packages/campus/src/salas.ts` construye `/retos/<id>` a mano.

### F5-5. Apariencia de la piedra del grupo (FUNCIONES_EXTRA §3.2 función 1)

```ts
Grupo.piedra?: { nombre: string /* 2-16, de una lista de sílabas o validado sin enlaces ni números de teléfono */,
                 cordon: 'sol'|'grana'|'ichu'|'laguna'|'tierra', marco: 'tinta'|'sol'|'laguna' }
evento 'grupo.piedra' datos: { grupoId, piedra }   // cosmético; desbloqueos leídos del quipu (F10)
```

### F5-6. Dependencias (2.3)

`campus → cerebro` (solo lectura de estado de nodo) se evita con un puerto local (`estadoNodo` en `ContextoAyudante`); no hace falta cambiar `.dependency-cruiser.cjs`. Se pide que F10 exponga `estadoNodo(grupoId, nodoId)` agregando a nivel de grupo ("algún integrante razonado").

### F5-7. Colores de sala faltantes (DESIGN.md, no es contrato)

Taller, Patio de juegos y Auditorio no tienen color de sala en DESIGN.md. Provisionalmente: Taller = `ink-2`, Patio = `sol`, Auditorio = `ink`; glifos `taller`, `juego`, `usuarios`.
