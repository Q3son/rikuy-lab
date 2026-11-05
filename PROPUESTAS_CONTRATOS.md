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
