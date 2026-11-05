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
