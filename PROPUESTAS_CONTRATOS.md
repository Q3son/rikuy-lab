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
