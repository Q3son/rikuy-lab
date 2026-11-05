# Rikuy — Mapa del ecosistema

> Qué módulos forman Rikuy, cómo se conectan y de dónde viene cada idea. Pantallas por ID de [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md); procedencia completa en [CREDITOS.md](CREDITOS.md).
> Estado: **Demo** (funciona en el pitch) · **Prototipo** (pantalla real con etiqueta visible) · **Roadmap** (solo diapositiva).

## 1. Vista general: el Museo Rikuy

```
                    ┌────────────────────────────── ANTES / DESPUÉS (con red) ──────────────────────────────┐
                    │   Creador de exhibiciones (IA + verificador CNEB)     Malla y reportes (UGEL / ProFuturo)  │
                    └──────────────────▲──────────────────────────────────────────────▲──────────────────────┘
                                       │ exhibición aprobada (≈10 KB)                  │ agregados por competencia
┌──────────────────────────────────── EN EL AULA (sin internet) ────────────────────────────────────────────────┐
│  MUSEO RIKUY (campus 2D)                                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ ┌──────────────┐ ┌─────────┐ ┌────────────────┐   │
│  │ Sala     │ │ Sala     │ │ Sala     │ │ Sala Tierra y    │ │ Taller de    │ │ Patio de│ │ Auditorio      │   │
│  │ Física ★ │ │ Biología │ │ Química  │ │ ambiente         │ │ tecnología   │ │ juegos  │ │ (reuniones)    │   │
│  └────┬─────┘ └──────────┘ └──────────┘ └──────────────────┘ └──────────────┘ └─────────┘ └────────────────┘   │
│       ▼                                                                                                       │
│  EXHIBICIÓN = holograma manipulable con gestos  +  medición propia  +  Tutor Rikuy (voz es/qu)                 │
│       │ eventos de aprendizaje (frase literal, competencia, intentos)          Quipu de logros (cooperativo)   │
│       ▼                                                                                                       │
│  Rikuy Guardián (opt-in, local; sin cámara ni voz) ──► ofrece ayuda · sugiere a la docente "acercarse"        │
│  CEREBRO (memoria por alumno → "Mi Cerebro Rikuy") ◄──► HUB de la docente (wifi local; respaldo QR animado) ──► PANEL "Mi clase"    │
└──────────────────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                               ▼
                       Familia "Para llevar" (QR · WhatsApp · A4)        Lenguas (capa transversal: es + qu, extensible)
```

**Salas y competencias.** Cada sala agrupa exhibiciones de un dominio del CNEB de Ciencia y Tecnología; todas las exhibiciones trabajan la competencia **"Indaga mediante métodos científicos para construir sus conocimientos"**, las salas temáticas aportan a **"Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo"** y el Taller aporta a **"Diseña y construye soluciones tecnológicas para resolver problemas de su entorno"** (nombres a verificar letra por letra contra el JSON curricular).

| Sala | Exhibiciones (★ = demo) | Medición propia |
|---|---|---|
| **Física** | ★ Péndulo · caída libre · plano inclinado | Cronómetro, acelerómetro, regla |
| **Biología** | Lactasa: de la leche a la molécula (holograma existente) · respiración en altura | Frecuencia respiratoria propia; temperatura (roadmap con sensor) |
| **Química** | Densidad con agua y sal · indicadores de pH con col morada | Masa/volumen caseros; escala de color |
| **Tierra y ambiente** | El Niño en un vaso (agua tibia y fría) · evaporación en la chacra | Termómetro (roadmap), tiempo |
| **Taller de tecnología** | Puente de ichu · filtro de agua | Carga soportada, claridad |
| **Patio de juegos** | Retos cortos con contexto local | Evidencia de proceso |
| **Auditorio** | Reuniones de clase: la docente convoca a los grupos, muestra un holograma a todos, cierra la visita | — |

**Tres objetos de datos lo unen todo:**

| Objeto | Qué es | Viaja |
|---|---|---|
| `Exhibit` (antes `PracticePack`) | Sala, competencia y desempeño CNEB citados literalmente, escena del holograma, gestos permitidos, pregunta guía, 3 pistas, materiales, límites del modelo, audios por lengua, hash y aprobación de la docente | Creador → hub → museos de los grupos → familia |
| `LearningEvent` | `{alumno (apodo), grupo, exhibición, paso, tipo, texto literal, valor, competencia, ts}` | Grupo → hub/QR → Cerebro → malla |
| `MemoryEntry` (Cerebro) | Resumen recuperable por alumno: frases literales, competencia, intentos, pistas, conceptos confundidos | Vive en el hub de la docente; nunca sale del aula por defecto |

## 2. Módulos

### 2.1 Museo Rikuy (el hogar)

| Campo | Detalle |
|---|---|
| Propósito | Hacer del aprendizaje una **visita**: un museo andino en 2D, explorable, donde las salas son áreas del CNEB y las puertas abren exhibiciones, juegos, reuniones y la casa |
| Usuario | Grupos de secundaria (Yeni) y niños de primaria (Inti); la docente como anfitriona |
| Pantallas | E-00 a E-04, E-21 (punto de encuentro), T-07 |
| Interacciones clave | Caminar tocando el piso o con flechas; Rikuy (la piedra de un ojo que cuelga de su cordón ámbar) guía y traza el camino a la sala pedida; vitrinas con candado (la docente las abre); placa de cada exhibición con su competencia; check en lo completado |
| Visitas de grupo | **Multijugador sobre el hub wifi de la docente, sin internet**: cada grupo ve a los demás grupos (avatares de grupo) en el museo; la docente convoca al Auditorio para una reunión y proyecta un holograma a todos. Sin hub, cada grupo recorre su museo solo y entrega por QR |
| Sin chat libre | En v1 no hay chat abierto entre alumnos; reacciones predefinidas ("¡ven a ver!", "ayuda") |
| Offline | Mapa de tiles y sprites precacheados en la PWA (objetivo < 1,5 MB); presencia por WebSocket local del hub |
| Produce / consume | Eventos de navegación mínimos / estado de salas y vitrinas desde la docente |
| Distila | **AulaQuipu** (paoloose): campus 2D tipo Gather, salas de un solo propósito, puertas como clases, mascota guía que traza el camino, presencia en tiempo real. Se invierte: offline, la docente abre y cierra, museo de currículo |
| Estado | **Demo**: museo con Sala Física activa y 3 salas visibles · Prototipo: presencia multigrupo vía laptop-hub · Roadmap: hub en el celular de la docente (app nativa), Auditorio |

### 2.2 ★ Exhibición (holograma + medición propia): el corazón

| Campo | Detalle |
|---|---|
| Propósito | Ver lo invisible y **probarlo con el propio dato**: el holograma muestra el fenómeno; la medición casera lo demuestra |
| Usuario | Grupo de 4-5 alumnos con un celular compartido |
| Pantallas | E-22 (inicio de la pestaña Lab), E-05 a E-12, T-18 |
| Ciclo | Holograma aparece en la vitrina → exploración con gestos (los formatos están disponibles desde el inicio) → **predicción obligatoria antes de medir** → Rikuy pregunta → **medición propia** (10 oscilaciones a 25/50/100 cm, cronómetro o acelerómetro) → tabla → gráfica con sus puntos sobre el modelo, error % → conclusión con sus palabras |
| Multiformato | Cada exhibición ofrece **cinco puertas de entrada** al mismo fenómeno, elegibles en la vitrina: **holograma** (por defecto) · **video corto** (≤ 60 s, precacheado, con subtítulos) · **audio** (castellano TTS o quechua grabado) · **diagrama** (SVG anotado) · **actividad/quiz** (3-5 ítems con la clave fuera del dispositivo del alumno, corregidos en el hub). **Orden de los formatos:** todos están disponibles desde que se entra a la vitrina (E-05) y se pueden ver antes de predecir; lo que la predicción desbloquea es la **medición** (E-09), no la visualización. Ningún formato reemplaza la **medición propia**: la predicción y el dato siguen siendo obligatorios para cerrar la exhibición. Los formatos se generan una vez por exhibición en el Creador y la docente los aprueba |
| Holograma | Tres modos del renderer existente: **en pantalla** (por defecto), **pirámide** de acetato (4 vistas) o **cajita** a 45° (Pepper's ghost). La pirámide es opcional (< S/ 3, **no verificado**) |
| Gestos | Ver 2.3 |
| Produce / consume | `LearningEvent` de cada paso / `Exhibit` aprobado |
| Distila | Rikuy Lab original (Edson Subia): `HoloRenderer`, `Morph`, escenas, `physics.ts`, prácticas; Reto 17 (hipótesis, experimento, observación); "predecir antes de"; **Entiendo AI** (un tema en varios formatos: video, audio, diagrama, actividades, quiz); **AulaQuipu** (clave del quiz fuera del navegador del alumno) |
| Estado | **Demo**: péndulo holográfico + cronómetro + comparación; lactasa visual · Prototipo: acelerómetro · Roadmap: medición por video, sensores baratos, 12+ exhibiciones |

### 2.3 Gestos de mano

| Campo | Detalle |
|---|---|
| Propósito | Manipular el holograma con las manos: el cuerpo entra al experimento |
| Gestos v1 | Mano abierta y arrastre → **girar** · pellizco → **acercar/alejar** · puño que se abre → **soltar el péndulo** · pulgar arriba → **confirmar** · palma quieta 1 s → **pausar** |
| Técnica | Reconocimiento de manos en el dispositivo (MediaPipe Tasks Vision; **el modelo se empaqueta en la PWA**, hoy se carga desde CDN: hay que mover el archivo local para que funcione sin red). Solo se procesan puntos de la mano; **no se guarda ni se transmite imagen**. Esta cámara **nunca** alimenta a Rikuy Guardián (2.14): Guardián no usa rostro ni voz (el Nivel 2 con cámara y voz existe solo detrás de una bandera de compilación apagada, bloqueada en la UE y sujeta a revisión legal) |
| Control | Interruptor de la docente (T-07); indicador de cámara activa siempre visible; alternativa táctil idéntica |
| Distila | Rikuy Lab (`gestures.ts`); **RoboLab** (gestos de mano en el navegador sin grabar video, para Inicial) |
| Estado | **Demo** (girar y soltar; ya existe `gestures.ts`) · Prototipo: resto de gestos · Riesgo: rendimiento en gama baja (medir FPS; caer a táctil) |

### 2.4 Tutor socrático "Rikuy"

| Campo | Detalle |
|---|---|
| Propósito | Hacer pensar: responde con preguntas, **escalera de pistas**, nunca da la respuesta |
| Usuario | Grupo (texto, toque o voz); la docente lo supervisa |
| Pantallas | E-08 (capa en exhibiciones y juegos), T-07 |
| Voz | **Castellano**: síntesis de voz (TTS) del dispositivo, con texto en pantalla. **Quechua**: **solo voces reales grabadas por hablantes nativos** para un repertorio cerrado (pregunta guía, pistas, preguntas socráticas frecuentes, felicitaciones); no se usa TTS quechua (modelos no validados y en parte con licencia no comercial). Entrada del alumno: texto o voz en castellano, o botones de respuesta en quechua |
| Memoria | Consulta el **Cerebro** (2.5): "la semana pasada dijiste que la masa cambiaba el periodo; ¿qué crees ahora?" |
| Honestidad | Cada acción sobre la vitrina devuelve OK o ERROR; si falla, Rikuy lo dice ("no pude soltar el péndulo") y nunca afirma algo que no pasó. Con LLM, un **director** propone acciones en JSON estricto y el código las valida (escena, variable, rangos) |
| Motores | En el aula: **agente de reglas** en el dispositivo (`rulesAgent.ts`) · Modo laptop/kit: Llama 3.2 3B local (Ollama) · En línea (apagado por defecto): LLM con herramientas (`llm.ts`) |
| Guardián | Si **Rikuy Guardián** está activo, Rikuy recibe solo un aviso de estado de conducta (p. ej., "atascado en la habilidad X") o el pedido del alumno, y responde con apoyo: ofrece una pista, propone ir más lento o una pausa; nunca comenta el estado emocional del alumno ni cambia su expresión según Guardián |
| Guardas | Filtro anti-respuesta; aviso cuando la voz del navegador pueda usar la nube, con escritura como alternativa |
| Distila | Rikuy Lab (`rulesAgent.ts`, `tools.ts`); **AulaQuipu** (director + contrato de honestidad; tutores con voz); guarda anti-respuesta y pista de plantilla del equipo; **RoboLab** (hasta 3 pistas); ZenZen; Reto 04 |
| Estado | **Demo**: reglas + pistas + voz en castellano + 3 audios en quechua grabados (si llegan; si no, etiqueta) · Prototipo: Ollama · Roadmap: repertorio quechua amplio, aimara |

### 2.5 Cerebro (memoria de aprendizaje)

| Campo | Detalle |
|---|---|
| Propósito | Recordar **lo que cada alumno razonó** para que Rikuy pregunte mejor y la docente reporte con evidencia |
| Usuario | Indirecto: Tutor, Panel, Malla. La docente lo ve en T-10 |
| Qué guarda | Por alumno (apodo dentro del grupo): frases literales con fecha y exhibición, competencia y capacidad CNEB, nivel del juez con cita o "no evaluable", intentos, pistas usadas, conceptos confundidos (p. ej., masa ↔ periodo) |
| Identidad en celular compartido | Antes de predecir o concluir, el alumno toca su avatar en la barra del grupo; si no, el evento queda a nombre del grupo |
| Cómo recupera (tipo RAG) | Índice local por concepto, competencia y exhibición + búsqueda léxica sobre frases; el tutor recibe los 3 recuerdos más relevantes como contexto. Funciona sin LLM; con LLM local/en línea se usan como contexto citado |
| Dónde vive | En el hub de la docente (IndexedDB); los celulares de grupo solo guardan su sesión hasta entregarla. No sale a la nube por defecto |
| Gobierno | La docente ve, corrige y borra; retención por año escolar; exportable; el alumno puede ver lo que Rikuy recuerda de él. **El Cerebro nunca guarda datos de Rikuy Guardián** (ni eventos de conducta, ni check-ins, ni emociones declaradas) |
| **Mi Cerebro Rikuy** (vista del alumno, E-19) | **Mapa de conocimiento real**: nodos = conceptos y capacidades CNEB; aristas = relaciones del currículo (p. ej., longitud → periodo; masa ↛ periodo). Cada nodo se enciende **solo con evidencia**: al tocarlo muestra la frase literal del alumno, la exhibición y la fecha. Estados honestos (vocabulario de la IA): **sin explorar** (nodo en contorno) · **explorado** (vio la exhibición) · **razonado** (frase evaluada con cita) · **por revisar** (concepto confundido, con sugerencia de exhibición); "?" marca una pregunta abierta. Equivalencia con la arquitectura ([ARQUITECTURA_ECOSISTEMA.md](ARQUITECTURA_ECOSISTEMA.md) 3.12): `sin_explorar` = sin explorar · `explorado` = explorado · `en_camino` = por revisar · `logrado` = razonado · `pregunta_abierta` = "?". La interfaz y los textos usan los nombres de la IA; los identificadores de código pueden conservar los de la arquitectura Vista 2D por defecto (gama baja); vista 3D opcional. Lema: *"Cada luz de tu cerebro es algo que tú dijiste"* |
| Diferencia con Entiendo AI | Su "cerebro dinámico" 3D es, según su propio sitio, ilustrativo y no refleja progreso real; Mi Cerebro Rikuy se construye con la memoria del alumno y las competencias CNEB, y es el mismo dato que ve la docente en la malla |
| Juez | Reglas en el dispositivo; con LLM opcional, 3 corridas y mayoría; desacuerdo = "dudoso" para la docente; sin cita literal, el criterio no cuenta |
| Distila | **AulaQuipu** (memoria por alumno entre sesiones con AtomicMemory); juez del equipo (cita literal, "no evaluable", mayoría de corridas); **KoEduko** (no tratar lo no evaluado como cero) |
| Estado | **Demo**: memoria de la sesión, una cita recordada y Mi Cerebro Rikuy con los nodos del péndulo encendidos · Prototipo: recuperación entre sesiones · Roadmap: memoria multianual con consentimiento, vista 3D |

### 2.6 Malla curricular y reportes

| Campo | Detalle |
|---|---|
| Propósito | Seguimiento serio por **competencia, capacidad y desempeño del CNEB** para docente, director y UGEL, con evidencia literal |
| Usuarios | Rosa (aula), director (IE), Julio (UGEL), financiador (ProFuturo) |
| Pantallas | T-12, T-13, T-17, D-01 a D-05 |
| Vista docente | Matriz alumnos × capacidades con evidencia por celda (frase, exhibición, fecha); "sin evidencia aún" distinto de "no logrado"; sugerencia de próxima exhibición; exportación al **registro auxiliar** (Excel) donde **la docente elige** los calificativos AD/A/B/C |
| Vista director | Cobertura de competencias por sección; exhibiciones realizadas; continuidad durante cierres |
| Vista UGEL / ProFuturo | Mapa de IE; avance agregado por competencia; conceptos que más cuestan; brechas por lengua y conectividad; solo agregados (n ≥ 5); reglas de alerta configurables por ámbito y explicables |
| Produce / consume | Informes PDF/CSV / Cerebro y eventos |
| Distila | **TeachFlow/RimAI** (seriedad curricular CNEB); **KoEduko** (exportar registro auxiliar con calificativos decididos por la docente); **GiomarDev / Alerta Escuela** (quién usa, quién responde, quién paga; reglas por territorio); **Supermentes** (CNEB estructurado); Retos 10 y 13 |
| Estado | **Demo**: reporte de competencia de la clase (T-13) · Prototipo: tablero UGEL con datos simulados · Roadmap: exportes oficiales |

### 2.7 Panel docente "Mi clase de hoy" (el hub visible)

| Campo | Detalle |
|---|---|
| Propósito | **Un solo centro** (como MyLEA): preparar, abrir el museo, recibir evidencia, reportar y enviar a casa, sin administración extra |
| Pantallas | T-00 a T-11, T-19 |
| Interacciones | Barra inferior **Hoy · Clase · Evidencia · Reportes · Ajustes**; en **Hoy** (T-01) el *stepper* de los 4 tramos del día (Preparar · Museo · Cierre · Para llevar); dentro de **Clase** un control segmentado Preparar · Museo · Para llevar (Cierre vive en **Evidencia**); aprobar antes de que el grupo vea; interruptores (tutor, gestos, IA en línea, salas); escáner QR; frase literal por alumno; resumen en tres partes |
| Distila | Rikuy Lab (`panel.ts`, `analytics.ts`); **MyLEA** (un hub con módulos como pestañas); **AulaQuipu** (resumen en tres partes); **RoboLab** ("solo lo observable"); **EIDOS** (la pregunta del alumno es el dato del docente); **GiomarDev** (cero fricción) |
| Estado | **Demo** |

### 2.8 Red / hub offline

| Campo | Detalle |
|---|---|
| Propósito | Que el museo sea multijugador y la evidencia llegue **sin internet** |
| Camino principal: **hub wifi de la docente** | El celular de la docente comparte su punto de acceso y sirve la PWA y un WebSocket local; los grupos se conectan a esa red sin datos. **Requiere app nativa** (Capacitor/TWA con servidor embebido): un navegador no acepta conexiones entrantes. Alternativas: laptop con `apps/server` (existe) o tablet-servidor del kit MINEDU (**no probado**) |
| Respaldo: **relevo QR** | QR animado; JSON posicional + deflate + CRC32 + base45; cuadros de ≈ 450 caracteres cada 650 ms; IDs por hash (duplicados y cuadros dañados no rompen nada); lectura desde foto |
| Sync a la nube | Cola persistente que sube **solo agregados** cuando la docente tiene red (T-16) |
| Seguridad | Avisos de la docente/UGEL firmados (ECDSA); la sala de hub exige el código de clase |
| Distila | **Yaku** (relevo QR); **MyLEA** (un hub); **LumiSign** (pasar a móvil para funcionar sin wifi); **Nómada** (offline como mecanismo); NEXTIA; MINEDU Plataforma Offline; Rikuy Lab (`relay.ts`, `bus.ts`) |
| Estado | **Demo**: QR · Prototipo: laptop-hub · Roadmap: hub en el celular de la docente, kit MINEDU |

### 2.9 Juegos contextuales (Patio)

| Campo | Detalle |
|---|---|
| Propósito | Retos de 2-4 min con contexto local que refuerzan una exhibición y llegan a primaria |
| Ejemplos | Feria de Chivay (proporciones, primaria, quechua) · Riego en la chacra · Puente de ichu · Columpio (predecir antes de soltar) · Cuenta alpacas |
| Reglas | Puntaje por proceso (primer intento, ayuda, racha independiente), nunca por velocidad; sin ranking; región elegible |
| Distila | **Amautai** (contexto regional, puntaje por independencia); **Supermentes** (juegos reutilizables por tema, cita CNEB visible, enlace sin cuenta); **RoboLab** (pistas y métricas observables); **PixelMAI**, **Hack4Minecraft** (ganadores 2024 con gamificación) |
| Estado | Prototipo: 1 juego · Roadmap: catálogo |

### 2.10 Quipu de logros (economía cooperativa)

| Campo | Detalle |
|---|---|
| Propósito | Premiar **cooperar y razonar**, no competir ni comprar |
| Cómo se anuda | Cada grupo tiene un quipu; cada clase tiene un quipu grande. Nudos por: predecir antes de medir, citar el propio dato, explicar a otro grupo (la docente o el grupo ayudado lo confirma), repetir una medición dudosa, completar "Para llevar" en casa |
| Qué desbloquea | Solo cosas **colectivas y cosméticas**: nuevas luces y decoraciones del museo de la clase, una exhibición sorpresa que la docente libera, el estandarte del grupo. **Nada se compra; ninguna ventaja en exhibiciones ni juegos; sin rankings; sin conversión a dinero** |
| Técnica | Saldo derivado de un libro de eventos (no un número editable); cada nudo enlaza a su evidencia |
| Distila | **AulaQuipu** (economía de quipus y saldo derivado de un libro contable), invertida: cooperativa y sin mercado |
| Estado | **Demo**: nudo por ayudar al grupo · Roadmap: quipu de clase y decoraciones |

### 2.11 Familia "Para llevar"

| Campo | Detalle |
|---|---|
| Propósito | Continuidad cuando el colegio cierra (El Niño, paro, extorsión) y lazo con el hogar |
| Pantallas | T-14 a T-16, E-16, F-01 a F-04 |
| Canales | QR de celular a celular · hoja A4 con pictogramas y QR de vuelta · WhatsApp con texto corto y **audio en quechua grabado** · página ligera sin instalar |
| Reglas | Sin cuenta para el niño; token en el fragmento de la URL; estados de entrega honestos ("registrar no es entregar"); la exhibición viaja dentro del enlace si no hay servidor |
| Distila | **Amautai** (docente → WhatsApp → actividad → progreso); **Supermentes** (enviar a familias con código); **Yaku** (relevo en emergencias de El Niño); Tándem; Willay (pictogramas revisados) |
| Estado | **Demo**: QR y A4 · Prototipo: WhatsApp sin pasarela · Roadmap: pasarela con estados |

### 2.12 Lenguas (capa transversal)

| Campo | Detalle |
|---|---|
| Propósito | Castellano y quechua **desde el día uno**, extensible a cualquier lengua sin tocar código |
| Diseño | Todos los textos y audios viven en el `Exhibit` y en archivos de idioma por clave; cada lengua declara **variedad**, **revisor hablante**, **estado** (borrador IA / revisado / grabado); añadir aimara, asháninka o awajún = añadir un archivo y sus audios |
| Voz | Castellano: TTS del dispositivo. Quechua y otras lenguas originarias: **grabaciones de hablantes nativos** (repertorio cerrado); **sin TTS** hasta que exista un modelo validado y con licencia comercial |
| Regla | Un borrador de IA nunca se muestra como revisado |
| Distila | **Amautai** (interfaz en quechua chanka y aimara, aviso de revisión pendiente); **TeachFlow/RimAI** (contexto lingüístico y local); Ñawinchay (revisión por hablante) |
| Estado | **Demo**: interfaz del recorrido en es/qu + audios grabados de la exhibición del péndulo (con etiqueta de revisión) · Roadmap: aimara y más |

### 2.13 Creador de exhibiciones

| Campo | Detalle |
|---|---|
| Propósito | Una exhibición nueva en 20 min, **anclada al CNEB**, generada por IA y aprobada por la docente |
| Pantallas | T-02 a T-05, A-01, A-04 |
| Pipeline | Desempeño + contexto local → LLM genera `Exhibit` con esquema → **verificador de reglas** (cita literal, pistas sin respuesta, límites) → segundo revisor → docente edita y aprueba → se firma y guarda. Generar una vez por tema y servir a todos |
| Distila | **Supermentes** (CNEB estructurado, verificación literal en CI); **TeachFlow/RimAI** (contexto local); **Willay** (IA propone, regla decide, humano confirma); NEXTIA |
| Estado | Prototipo: exhibición pregenerada · Roadmap: interfaz en celular |

### 2.14 Rikuy Guardián (suite de acompañamiento del aprendizaje; reemplaza a "Señales de aprendizaje")

> Cambio de nombre y de modelo (5 nov 2026). El módulo ya no se llama "Señales de aprendizaje" ni se presenta como "detección de confusión". Se fundamenta en las notas de investigación sobre autorreporte válido, detección sin sensores y herramientas en Perú/LatAm (ver [CREDITOS.md](CREDITOS.md) §4b). **Todo el análisis legal es de no abogados y está pendiente de revisión por un asesor** (ver [PROYECCIONES.md](PROYECCIONES.md) §6.1).

| Campo | Detalle |
|---|---|
| Propósito | Ayudar a la docente-tutora a decidir **a quién acercarse a conversar esta semana**, y ofrecer al grupo ayuda a tiempo. La emoción solo entra al sistema porque **el alumno la declara**; los algoritmos solo producen estados de conducta pedagógicos sin nombre emocional. Nunca califica, ordena, diagnostica ni disciplina |
| Usuario | El alumno (check-in y ofertas de ayuda); la docente responsable (sugerencias y agregados); la familia (consiente) |
| Pantallas | Alumno: E-00d (aviso), E-00e (permiso de la familia), E-20 (indicador y oferta de ayuda), E-20b (ajustes y pausa), E-20c (check-in momentáneo) y E-20d ("necesito hablar con alguien"), con sus ajustes dentro de **Yo** (E-23). Docente: T-06c (vista "del curso" y vista "para acercarse"), T-07 (interruptor), T-21 (consentimientos y nivel), T-21x (apagado o Nivel 2 denegado) |
| **Capa 1: eventos de aprendizaje finos, no biométricos** | Cada pista pedida (peldaño 1/2/3), intento (correcto o no), cambio de respuesta, tramo de inactividad (en cubos gruesos), respuesta rápida, repetición de una medición o ítem, turno con el tutor y pedido de ayuda. Son eventos del propio uso de la exhibición y viven en el dispositivo. **Excluido de forma expresa:** dinámica de teclado y de toques (ritmo, presión, deslizamiento), rostro y voz. El acelerómetro del experimento (E-09) mide el péndulo y **nunca** alimenta Guardián |
| **Capa 2: autorreporte momentáneo rico** | Check-in voluntario de 10-15 s al terminar un paso o una actividad (no más de uno por sesión; omisible; ventana de respuesta limitada; no se repite si se saltó). El alumno elige **una o varias emociones con su intensidad** (poco / medio / mucho) en un vocabulario que mezcla logro (aburrimiento, ansiedad por equivocarme, disfrute), **cuerpo** ("me duele el cuerpo", "sin fuerzas") y **relación** ("me sentí solo/a"), más "no sé" y "prefiero no decir". El check-in queda **anclado al paso exacto** ("en: medir 10 oscilaciones") y pregunta **"¿qué te ayudaría ahora?"** (una pista · ir más despacio · una pausa · hablar con alguien · nada). Texto libre **opcional**, sin análisis automático. **Elección de visibilidad** en el momento: "solo yo" (alimenta solo agregados) o "compartir con mi profe". La pantalla no deja ver la respuesta anterior (celular compartido) |
| Vocabulario en quechua | Se ofrecen como términos opcionales *llaki* (pena), *ñakary* (sufrimiento) y *pinsamiento* (pensamientos que preocupan), documentados en la literatura sobre quechuahablantes andinos; **ninguno está validado como instrumento adolescente**. Se validan con hablantes y adolescentes (entrevistas cognitivas, retrotraducción) antes de mostrarse como revisados; mientras tanto llevan sello "[qu] por validar". No se imponen y no se usa TTS quechua. Las opciones de fatiga y cuerpo entran por defecto (en quechuahablantes la depresión se expresa más por fatiga que por tristeza) |
| Línea base propia | Cada alumno se compara **consigo mismo**, nunca con el grupo ni con normas externas (en ESM escolar el 58 % de la varianza es intra-persona). Ventana corta (propuesta: 4-6 semanas) y mínimo de check-ins antes de usarla. Los patrones de respuesta descuidada solo excluyen datos de las tendencias; nunca señalan al alumno |
| **Estados de conducta (única salida del sistema)** | `atascado_en_habilidad` ("sin avance en la habilidad X tras N intentos") · `adivinacion_rapida` · `inactivo` · `abuso_de_pistas` (pistas seguidas sin intentar; en pantalla se redacta en términos pedagógicos) · `evita_ayuda` (muchos errores sin pedir pistas). Reglas simples y explicables al estilo Lumilo (inactividad de 2 min o más; tasa de error menor al 30 % o mayor al 80 % en los últimos 10 intentos; errores tras agotar las pistas), **sin aprendizaje automático** hasta tener etiquetas locales. Nunca "confundido", "frustrado", "aburrido" ni "en riesgo" |
| **Triangulación** | Autorreporte y conducta son dos señales débiles e independientes: ninguna invalida a la otra. **Cuando no coinciden** (dice "todo bien" pero lleva tres sesiones sin avanzar; dice "mal" pero avanza) se muestran ambas a la docente con la sugerencia de **"acercarse a conversar"**, sin resolverlas ni etiquetar. Si el alumno enmascara su emoción, igual llega la señal de conducta |
| Qué ve la docente | **Solo la docente responsable** (ni pares, ni director, ni UGEL). (1) Vista **"del curso"**: agregados por grupo y por actividad solo desde **5 alumnos o más** (en multigrado de 10-15 el anonimato real es imposible y se les dice). (2) Vista **"para acercarse"**: **máximo 3 sugerencias por semana por tutor** (anti fatiga de alertas), en términos pedagógicos y con incertidumbre ("lleva 3 sesiones sin avanzar en la habilidad X; pidió hablar con usted"), con una guía breve de conversación. El contenido de un check-in individual solo aparece si el alumno eligió compartirlo. Sin puntajes, semáforos, rankings ni perfil persistente. La docente **decide**: botón "ya conversé / no era necesario / no aplica" |
| Qué ofrece al alumno | Rikuy ofrece (no impone): "¿Quieres una pista?" · "¿Vamos más despacio?" · "¿Una pausa de un minuto?"; se puede decir "No, gracias". Rikuy no comenta jamás el estado emocional del alumno y sus expresiones se disparan por eventos de la app, no por Guardián |
| Retención corta | Eventos crudos purgados al cerrar la semana; derivados (línea base y tendencias) máximo 4-6 semanas; los check-ins compartidos con la docente, la misma ventana. Todo es local en el celular y se sincroniza al equipo de la docente sin internet. Cifras a calibrar en el piloto |
| Consentimiento (Ley 29733, DS 016-2024-JUS) | Las emociones declaradas de una persona identificable son **dato sensible** ("datos morales o emocionales"; salud mental). **Menores de 14: consentimiento del apoderado (patria potestad) + asentimiento del alumno. De 14 a 17: el alumno puede consentir si la información está en un lenguaje que entienda; el colegio igualmente informa al apoderado.** Consentimiento por escrito (firma digital válida) para datos sensibles, libre, previo, informado y revocable; castellano y quechua con audio. Desactivado por defecto; interruptor de la docente; indicador siempre visible ("Guardián activo"); pausa y retiro pesan lo mismo que activar |
| **Escalamiento (SíseVe)** | **La confidencialidad no es absoluta y se explica al alumno antes de su primer check-in** (E-00d y E-20c): lo que comparte queda con su docente, salvo que cuente que alguien le hace daño o que está en peligro; entonces la docente debe activar la ruta de SíseVe con el director y la persona de convivencia (protocolos de 20 a 30 días hábiles) y el alumno lo sabe de antemano. Riesgo para la vida: protocolo del colegio y derivación a salud. Educación Te Escucha: requiere consentimiento familiar y que el alumno no esté ya en atención; no es terapia. Las conversaciones individuales ocurren en espacios visibles para otros adultos (RVM 212-2020). Rikuy **no duplica** el Libro de Registro de Incidencias ni abre un sistema de casos paralelo: ayuda a la docente a decidir si abre uno. Sin ítems clínicos de riesgo suicida en v1 |
| Nivel 2 (cámara y voz) | **No se usa en Guardián.** Existe solo como código aislado detrás de una **bandera de compilación apagada por defecto**, con compuertas múltiples (clase, consentimiento de todos los usuarios del dispositivo, interruptor, indicador), **bloqueado en la UE** (`VITE_REGION=eu` fuerza la bandera a 0), excluido de la demo y condicionado a revisión legal escrita y prueba de sesgos |
| Encaje con retos y normas (no abogados) | **Reto 18 de Hack4Edu VII** (según el enunciado que recibimos; falta contrastarlo con las bases oficiales): expresión voluntaria = check-in omisible; autoevaluación = rejilla y pulso; análisis de tendencias = línea base y vista del curso; confidencialidad e intervención humana = escalamiento y decisión de la docente; excluye diagnóstico automático, vigilancia emocional y reconocimiento facial = nada de eso existe en el Nivel 1. **Reglamento de IA de la UE:** el art. 3(39) define "reconocimiento de emociones" como inferencia **sobre datos biométricos**; las directrices de la Comisión (C(2025) 5052) dejan fuera la inferencia no biométrica pero tratan la dinámica de teclado y los gestos como biometría, por eso se excluyen. **Perú, DS 115-2025-PCM (art. 24.1):** "inferir emociones en centros educativos" es **alto riesgo** (no prohibido) y el texto no trae el limitador biométrico: Guardián evita inferir emociones y aun así aplica los controles de alto riesgo (transparencia previa, registro, supervisión humana capaz de detener, corregir o invalidar, evaluación de impacto, consulta de clasificación al ente rector). Detalle y reservas en [PROYECCIONES.md](PROYECCIONES.md) §6.1 |
| Validación del piloto | Las etiquetas de la docente ("ya conversé / no era necesario / no aplica") son la verdad local para medir si las sugerencias sirvieron (se reporta kappa, no solo exactitud); auditoría por género, lengua materna, grado y dispositivo. **Riesgo de equidad rural:** no existe un detector de afecto por registros validado para estudiantes andinos, los modelos entrenados con alumnos urbanos no generalizan a los rurales, y la inactividad o la respuesta rápida dependen de celulares compartidos, conectividad e idioma; por eso se parte de reglas calibradas por ítem y población y se presenta como **validación, no como resultado** |
| Distila | Evidencia: BROMP y detectores sin sensores (Baker, Pardos, Botelho), dinámica del afecto (D'Mello), emociones de logro (Pekrun), Lumilo (Holstein), RULER y How We Feel (vocabulario y Mood Meter solo como andamio, no como instrumento validado), tutoría del MINEDU (RVM 212-2020, SíseVe, Educación Te Escucha). Producto: **HUANUCO / SENATI** (2.º Innovadora Hack4Edu 2024) como precedente de que el jurado valora apoyar al que se confunde; Guardián llega al objetivo sin rostro ni cuerpo. Detalle en [CREDITOS.md](CREDITOS.md) §4b |
| **Frase para el jurado** | ***"Rikuy Guardián no lee a los estudiantes: ordena dónde debe mirar el tutor."*** Y una diapositiva de lo que no hacemos: cámara, voz, teclado, diagnósticos, rankings |
| Estado | Prototipo: Nivel 1 (eventos de aprendizaje, check-in, estados de conducta y sugerencias) con indicador y oferta de ayuda · Roadmap: línea base y triangulación calibradas con etiquetas locales, vocabulario en quechua validado · Nivel 2 (cámara y voz): fuera del producto y de cualquier despliegue UE; solo investigación con revisión legal |

## 3. Matriz módulo × persona

| Módulo | Rosa | Yeni | Hilda | Julio | Inti |
|---|---|---|---|---|---|
| Museo | Anfitriona, abre salas | **Visita** | — | — | Visita |
| Exhibición + gestos | Proyecta, apaga gestos | **Usa** | — | — | — |
| Tutor Rikuy | Supervisa | **Usa** | — | — | Usa en juegos |
| Cerebro | Revisa y borra | Ve "lo que recuerda" | — | — | — |
| Malla y reportes | **Usa** | — | — | **Usa** | — |
| Panel / hub | **Usa** | Se conecta | — | — | — |
| Juegos | Asigna | Usa | — | — | **Usa** |
| Quipu de logros | Confirma ayudas | **Anuda** | — | — | Anuda |
| Familia | Envía | Recibe | **Recibe** | — | Recibe |
| Lenguas | Elige | Usa | **Escucha** | — | **Usa** |
| Creador | **Usa** | — | — | — | — |
| Mi Cerebro Rikuy | Ve la misma evidencia en la malla | **Explora su mapa** | — | — | Ve su mapa simple |
| Rikuy Guardián | Interruptor; ve el curso (n ≥ 5) y hasta 3 sugerencias de acercamiento por semana | Check-in voluntario y ofertas de ayuda (si consintió) | **Consiente o no** (menores de 14) | — | Recibe ayuda (si consintieron) |

## 4. Qué se demuestra y qué no

| Demo (en vivo) | Prototipo (etiquetado) | Roadmap (diapositiva) |
|---|---|---|
| Museo con Sala Física · exhibición del péndulo como holograma (con selector de formatos: holograma, diagrama, audio) · Mi Cerebro Rikuy con nodos encendidos por su frase · giro y "soltar" con gestos · medición propia con cronómetro · Rikuy con voz en castellano y audios en quechua grabados · relevo QR con frase literal · panel con competencia CNEB y resumen en 3 partes · reporte de competencia de la clase · nudo del quipu · Para llevar (QR y A4) | Rikuy Guardián Nivel 1 (eventos de aprendizaje, check-in y sugerencias, sin cámara ni voz) con indicador y oferta de pista · video y quiz de la exhibición · Visita multigrupo con laptop-hub · acelerómetro · Cerebro entre sesiones · tablero UGEL con datos simulados · Creador con exhibición pregenerada · juego "Feria" · WhatsApp sin pasarela · Ollama en laptop | Guardián Nivel 2 (cámara y voz: solo investigación, bandera apagada, bloqueado en la UE, tras revisión legal) · Hub en el celular de la docente · kit MINEDU · Auditorio · aimara y más lenguas · 12+ exhibiciones · exportes oficiales · pre/post en IE piloto |
