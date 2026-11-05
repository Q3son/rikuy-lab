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
