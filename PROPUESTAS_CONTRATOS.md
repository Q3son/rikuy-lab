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
