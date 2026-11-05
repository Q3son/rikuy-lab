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
