# Rikuy — Visión de producto

> Documento de producto para diseño y frontend. Estado: propuesta del arquitecto de producto, 5 nov 2026.
> Convenciones: **(no verificado)** = cifra o afirmación que no se pudo contrastar con la fuente primaria. Las personas son **perfiles compuestos**, no personas reales.

## 1. Nombre, metáfora y promesa

| | |
|---|---|
| **Ecosistema** | **Rikuy** ("ver" en quechua) |
| **Metáfora central** | **Museo Rikuy**: un museo de ciencias interactivo y explorable en 2D. Cada **sala** es un área del CNEB (Física, Biología, Química, Tierra y ambiente, Taller de tecnología). Cada **exhibición** es un experimento: un holograma que se manipula con las manos y se comprueba con una **medición propia**. Las visitas de grupo y las reuniones de clase ocurren dentro del museo |
| **Mascota y tutor** | **Rikuy**, la piedra que mira: una piedra de río con un solo ojo grande, colgada de un cordón ámbar con un nudo (ver [DESIGN.md](DESIGN.md) §6). Es también el **péndulo del primer experimento**. Guía del museo y tutor socrático: pregunta, no sermonea. Habla castellano y quechua con **voces reales de hablantes** |
| **Promesa en una línea** | **"Un museo de ciencias que cabe en el celular de la docente: se visita sin internet, se toca con las manos y cada experimento se prueba con tu propio dato."** |
| **Frase para el jurado** | *"El kit del MINEDU lleva archivos al aula sin internet; Rikuy lleva un museo donde se experimenta, y le devuelve a la docente cómo razonó cada alumno."* |
| **Principio de cuidado** | **"Rikuy mira tu mano para que juegues; Rikuy Guardián no lee a nadie: ordena dónde debe mirar el tutor."** La cámara solo lee puntos de la mano para los gestos y no guarda imagen. **Rikuy Guardián** (acompañamiento del aprendizaje) nunca lee rostro, voz ni dinámica de teclado o toque: registra eventos de aprendizaje, escucha lo que el alumno **decide decir** y le sugiere a la docente a quién acercarse a conversar. Nunca etiqueta una emoción, nunca califica, nunca disciplina; la persona decide |
| **Diferenciador de memoria** | **"Mi Cerebro Rikuy"**: un mapa de conocimiento **real**, construido con lo que el alumno razonó (frases literales) y las competencias del CNEB; no una animación ilustrativa |
| **Frase de ética** | *"Rikuy pregunta, la docente decide y ningún dato de un menor sale del aula por defecto."* |

## 2. Manifiesto: por qué Perú, por qué ahora

1. **El celular llegó; la conexión y el laboratorio no.** Solo **13,2 %** de los estudiantes rurales tiene acceso a internet y **5,5 %** de los hogares rurales tiene computadora ([El Peruano / MINEDU, 4 nov 2026](https://elperuano.pe/noticia/308349-minedu-brinda-contenidos-digitales-a-estudiantes-de-zonas-rurales-que-no-cuentan-con-internet)). Rikuy es *phone-first* y *offline-first*.
2. **El laboratorio no va a llegar en edificio.** Infraestructura educativa en emergencia (DS 013-2026-MINEDU, [El Peruano, 27 ago 2026](https://elperuano.pe/noticia/303426-gobierno-declara-en-emergencia-la-infraestructura-educativa-publica-a-nivel-nacional)); ≈ **48 %** de colegios públicos con daño estructural ([Infobae, mar 2026](https://www.infobae.com/peru/2026/03/16/crisis-educativa-por-infraestructura-mas-de-26-mil-colegios-publicos-del-pais-tienen-danos-estructurales/), cifra de titular). Laboratorios modernos en ≈ 92 Escuelas Bicentenario sobre ≈ 55.000 locales ([Infobae, sep 2025](https://www.infobae.com/peru/2025/09/18/minedu-anuncia-la-pronta-entrega-de-34-escuelas-bicentenario-este-ano-y-confirma-17-mas-para-2026/)). **No hay cifra pública consolidada de colegios con laboratorio (no verificado en ESCALE): no se inventa.**
3. **Ciencias está estancada.** PISA 2025: **406** en ciencias frente a ≈ 482 de la OCDE ([Infobae, 8 sep 2026](https://www.infobae.com/peru/2026/09/08/pisa-2025-peru-cae-9-puntos-en-matematica-y-7-de-cada-10-estudiantes-no-alcanzan-el-nivel-basico/)). ENLA 2025: **8,3 %** satisfactorio en ciencia en 5.º de secundaria ([Correo](https://diariocorreo.pe/peru/evaluacion-nacional-de-logros-de-aprendizaje-nueve-de-cada-10-escolares-en-peru-no-comprenden-lo-que-leen-noticia/); **verificar en UMC**).
4. **Este año no habrá medición nacional.** ENLA 2026 cancelada (RM 550-2026-MINEDU, [Infobae](https://www.infobae.com/peru/2026/09/13/minedu-deja-sin-efecto-la-enla-2026-prueba-de-logros-de-aprendizaje-de-estudiantes-se-reprogramara-para-2027/)). La **malla curricular** de Rikuy produce evidencia por competencia que hoy no existe.
5. **El año escolar se corta.** Cierre anticipado por El Niño: Piura 27 nov … Arequipa, Tacna y Huánuco 11 dic; ≈ **13.000** escuelas expuestas; la alternativa oficial es TV y clases virtuales ([Infobae, 13 oct 2026](https://www.infobae.com/peru/2026/10/13/fenomeno-el-nino-fuerza-adelanto-de-cierre-escolar-en-nueve-regiones-de-peru-cerca-de-13-mil-escuelas-en-alerta/)). Se suman paros (SUTEP, 29 oct) y extorsiones a colegios ([Infobae](https://www.infobae.com/peru/2026/03/25/colegios-en-lima-bajo-extorsion-suspenden-clases-presenciales-en-centro-educativo-estatal-de-san-martin-de-porres/)). **La exhibición tiene que poder irse a casa.**
6. **La lengua sigue siendo barrera.** Déficit de **19.745** docentes EIB ([La República, feb 2026](https://larepublica.pe/sociedad/2026/02/20/una-brecha-que-no-cierra-faltan-mas-de-19000-maestros-de-lenguas-originarias-en-peru-578000)); solo **6,3 %** de materiales 2026 en lenguas originarias ([Infobae, ene 2026](https://www.infobae.com/peru/2026/01/22/educacion-intercultural-minedu-amplia-entrega-de-materiales-en-lenguas-originarias-y-braille-para-el-ano-escolar-2026/)).
7. **El Estado ya validó el modelo offline.** Plataforma Educativa Offline del MINEDU (4 nov; 12 colegios, 114 kits con tablet-servidor y router) con **contenido precargado** ([El Peruano](https://elperuano.pe/noticia/308349-minedu-brinda-contenidos-digitales-a-estudiantes-de-zonas-rurales-que-no-cuentan-con-internet)). Falta la capa donde se experimenta, se razona y se devuelve evidencia.

**Principios de diseño**

| Principio | Qué significa en pantalla |
|---|---|
| El museo es el hogar | No hay menús de módulos: se camina por salas; las puertas abren exhibiciones, juegos, reuniones y la casa |
| El dato es del alumno | Toda exhibición exige **predicción antes de medir** y una **medición propia** (cronómetro, sensor del celular, materiales caseros); el holograma muestra, el dato prueba |
| Las manos manipulan | Gestos de mano por la cámara (girar, acercar, soltar el péndulo), procesados en el celular, sin guardar imagen; la docente puede apagarlos; siempre hay alternativa táctil |
| La IA pregunta, no responde | Escalera de pistas; Rikuy nunca da la respuesta; la docente puede apagarlo |
| La IA trabaja antes y después; dentro del aula, reglas | El camino crítico del aula no depende de la red ni de un LLM |
| Un solo hub | Como MyLEA, todo converge en un centro: el celular de la docente (hub wifi local) y su panel |
| Offline y móvil como LumiSign | Se diseña para el celular sin wifi, no para la web con conexión |
| Memoria que sirve al alumno | El **Cerebro** recuerda lo que cada alumno razonó para que Rikuy pregunte mejor y la docente reporte con evidencia, no para etiquetar. El alumno lo ve como **Mi Cerebro Rikuy**: su mapa de conceptos y competencias, cada nodo respaldado por una frase suya |
| Muchas formas de entrar | Cada exhibición se ofrece en **varios formatos**: holograma, video corto, audio, diagrama, actividad y quiz; el dato propio sigue siendo obligatorio |
| Cooperar, no competir | El **quipu de logros** se anuda ayudando al grupo; nada se compra; sin rankings |
| Honestidad visible | Rikuy dice lo que no pudo hacer; el panel dice "no evaluable"; cada pantalla de prototipo lleva etiqueta |
| La lengua de casa cuenta | Castellano y quechua desde el día uno, extensible a cualquier lengua; voz grabada por hablantes nativos; síntesis de voz solo en castellano |
| **Rikuy Guardián: la emoción la declara el alumno; el sistema solo ordena la atención humana** | **Rikuy Guardián** reemplaza a "Señales de aprendizaje". Dos fuentes con roles distintos: (1) **eventos de aprendizaje finos y no biométricos** (pistas, intentos, cambios de respuesta, inactividad, respuestas rápidas, repeticiones, turnos con el tutor, pedidos de ayuda) que producen **estados de conducta** sin nombre emocional ("atascado en la habilidad X", "adivinación rápida", "inactivo", "abuso de pistas", "evita ayuda"); (2) un **check-in momentáneo voluntario** donde el alumno dice lo que siente. Cuando no coinciden, la docente recibe la sugerencia de **"acercarse a conversar"**; nunca una etiqueta. Opcional, con consentimiento del apoderado (menores de 14) y asentimiento del alumno (14-17), solo ve la docente responsable, agregados desde 5 alumnos, retención corta, y la confidencialidad **no es absoluta** (violencia o riesgo para la vida activan SíseVe) y se explica al alumno. Cámara y voz: solo detrás de una bandera de compilación apagada, bloqueada en la UE y con revisión legal. Detalle en [ECOSISTEMA.md](ECOSISTEMA.md) 2.14 y [PROYECCIONES.md](PROYECCIONES.md) §6.1 |

## 3. Personas (perfiles compuestos)

> Ninguna existe. Llevan la etiqueta **"Perfil compuesto"** en el pitch hasta que una entrevista real las reemplace con permiso.

| | **Rosa Quispe** (docente) | **Yeni** (estudiante) | **Hilda Mamani** (apoderada) | **Julio Ccama** (especialista UGEL / director) | **Inti** (niño de primaria) |
|---|---|---|---|---|---|
| Rol | Docente de Ciencia y Tecnología, 2.º y 3.º de secundaria; 4 secciones, ≈ 120 alumnos | Alumna de 2.º de secundaria, 14 años | Madre de Yeni; agricultora y comerciante de feria | Especialista de CyT de una UGEL rural de Arequipa; trabaja con directores | Alumno de 3.º de primaria, 8 años, hermano de Yeni |
| Lugar | IE pública rural, sierra de Arequipa (cierre escolar 11 dic) | Misma IE; camina 40 min | Comunidad a 1 h del colegio | Capital de provincia | IE multigrado de la comunidad |
| Lengua | Castellano; entiende quechua | Quechua en casa, castellano en el colegio | Quechua; lee poco castellano | Castellano | Quechua (L1) |
| Tiene | Android de gama media-baja, datos que paga ella | Comparte un celular con su grupo de cinco; cuerda y piedra | Celular básico con WhatsApp | Laptop, internet, hojas de cálculo | El celular de Hilda unas horas por semana |
| No tiene | Laboratorio, internet en aula, tiempo (paro 29 oct, ascenso 8 nov) | Materiales en su lengua; un lugar para probar su idea | Tiempo para "aprender una app" | Datos de aprendizaje este año (ENLA cancelada) | Juegos en quechua con su contexto |
| Trabajo por hacer | "Sin laboratorio, quiero guiar una indagación de 15 min con lo que tengo y saber qué razonó cada alumno, por competencia" | "Quiero probar mi idea, no copiar del pizarrón" | "Quiero saber en qué anda mi hija y ayudarla aunque no sepa física" | "Quiero saber qué colegios avanzan en qué competencia, sin pedir más papeles" | "Quiero jugar y ganar" |
| Miedo | Más trabajo administrativo; que la IA haga la tarea | Equivocarse delante de todos | Que la app cobre o pida datos | Comprar algo que no se use | — |
| Momento Rikuy | En su panel aparece la frase de Yeni, ligada a la competencia "Indaga" | Gira el péndulo holográfico con la mano y su dato confirma su predicción | Recibe un audio en quechua grabado por una hablante: "Hoy Yeni midió un péndulo; pregúntale qué descubrió" | Ve el avance por competencia CNEB de 20 IE | Ayuda a Rikuy en la sala "Tierra y ambiente" y su grupo gana un nudo del quipu |

**Hipótesis a falsar con Rosa (3 a 5 llamadas):** omite prácticas por falta de materiales o tiempo, no por desinterés; aceptaría una práctica de 15 min sin internet; pediría ver el razonamiento por competencia. Si 3 de 5 lo niegan, se declara en el pitch.

## 4. El recorrido estrella

Un usuario al centro y un eje de datos (receta MyLEA). El eje es la **exhibición** (paquete ≈ 10 KB, anclado al CNEB) que viaja de Rosa al museo de cada grupo y vuelve como **eventos de aprendizaje** que alimentan el **Cerebro** y la **malla curricular**.

```
 ANTES (con red)            EN CLASE (modo avión, hub wifi de la docente o QR)                        CIERRE / DESPUÉS
 ┌──────────────────┐   ┌─────────────────────────────────────────────────────────────────┐   ┌───────────────────────────┐
 │ Creador: IA      │ → │ Museo Rikuy → Sala Física → Exhibición "Péndulo"                  │ → │ QR / hub → Panel de Rosa   │
 │ propone, CNEB    │   │ holograma girado con la mano → predicción → Rikuy pregunta (voz,  │   │ frase literal + competencia│
 │ verificado, Rosa │   │ castellano o quechua) → medición propia → comparación → conclusión│   │ → malla y reporte CNEB     │
 │ aprueba          │   │ quipu de logros del grupo                                         │   │ → Para llevar si cierra    │
 └──────────────────┘   └─────────────────────────────────────────────────────────────────┘   └───────────────────────────┘
```

| Tramo | Rosa | Yeni y su grupo | Hilda / Inti / Julio |
|---|---|---|---|
| 1. Preparar | Elige el desempeño CNEB; el Creador redacta la exhibición; el verificador confirma la cita literal y que ninguna pista revele la respuesta; aprueba | — | — |
| 2. Visita al museo | Enciende el hub; abre la Sala Física; ve a los grupos recorrer el museo | Entran con código y apodo; caminan a la Sala Física; el péndulo aparece como holograma; lo giran y lo sueltan con gestos; predicen; Rikuy pregunta por voz; miden 10 oscilaciones con su celular y cuerda; comparan; concluyen; ganan un nudo por ayudar | — |
| 3. Cierre | Recibe por QR (o por el hub) la frase literal de cada alumno; ve la competencia CNEB y "no evaluable" donde no hay evidencia; resumen en tres partes | Muestran su QR animado | — |
| 4. Reporte | La malla actualiza el avance por competencia; exporta el registro auxiliar (ella decide los calificativos) | — | Julio ve el agregado por competencia de las IE |
| 5. Llevar | "Para llevar": la exhibición sale por QR, WhatsApp y hoja A4 si el colegio cierra por El Niño | La repiten en casa; el dato vuelve por QR | Hilda escucha el audio en quechua; Inti juega |

## 5. Diferenciación

| | Para quién y qué es | ¿Offline? | ¿Dato propio? | ¿Docente ve el razonamiento por competencia? | ¿Lenguas originarias? | Relación con Rikuy |
|---|---|---|---|---|---|---|
| **Plataforma Educativa Offline del MINEDU** ([El Peruano](https://elperuano.pe/noticia/308349-minedu-brinda-contenidos-digitales-a-estudiantes-de-zonas-rurales-que-no-cuentan-con-internet)) | Contenido precargado en tablet-servidor + router | Sí | Sin evidencia de laboratorio ni tutor (**no verificado**) | Seguimiento declarado, sin detalle | No indicado | **Validación y canal.** El museo es una PWA que, en principio, puede servirse desde ese servidor (**no probado**) |
| **TeachFlow / RimAI** (3.º Sénior Hack4Edu 2025, UNSA) | Planificación y materiales docentes con CNEB, quechua/aimara, contexto local | Declarado, no demostrado | No | No | Sí (declarado) | **Complementario.** Rimai planifica; Rikuy ejecuta el experimento y devuelve la evidencia. Rikuy adopta su seriedad curricular para la malla |
| **AulaQuipu** (Hack the Andes 2026, paoloose) | Campus 2D tipo Gather, tutores IA por voz, economía de quipus; "el colegio y el profesor no son actores" | No (voz en la nube) | Conversa, no mide | No | No | **Inspiración del museo**, con crédito. Rikuy invierte sus ejes: offline, docente en el lazo, currículo, quipu cooperativo y no de mercado |
| **Tutor IA del Banco Mundial en Lima** ([World Bank, jul 2026](https://www.worldbank.org/en/results/2026/07/02/artificial-intelligence-in-action-in-latin-america-s-schools-evidence-from-peru)) | Matemática y orientación, urbano | No indicado | No aplica | Parcial | No indicado | **Precedente** de tutores IA aceptados por el Estado; Rikuy cubre lo rural, offline y ciencias |
| **Entiendo AI** ([entiendo.ai](https://entiendo.ai)) | Convierte un tema o PDF en video, audio, diagrama, actividades y quiz; avatar para preguntar; "cerebro dinámico" 3D de temas que su propio sitio presenta como ilustrativo, no como progreso real (según el sitio, **no verificado por nosotros en uso**) | No indicado | No | No | No indicado | **Inspiración de formatos**, con crédito. Rikuy da a cada exhibición varios formatos, y su **Mi Cerebro Rikuy** es un mapa real, construido con evidencia literal y competencias CNEB |
| **HUANUCO / SENATI** (2.º Innovadora Hack4Edu 2024) | IA que lee expresiones y lenguaje corporal para que el docente detecte confusión | No indicado | No | No | No | **Precedente** de que el jurado valora apoyar a quien se confunde. Rikuy Guardián llega al mismo objetivo **sin rostro ni cuerpo**: eventos de aprendizaje, autorreporte voluntario y una sugerencia humana de acercamiento |
| **PhET** (U. de Colorado Boulder) | Simulaciones de ciencias gratuitas | Descargables (**verificar** en gama baja) | No: simula | No | Traducciones (**no verificado** quechua) | **Complementario.** En Rikuy el holograma es la vitrina; el dato propio es la prueba |

**Lo que nadie más junta:** un museo explorable sin red + hologramas manipulables con la mano + exhibiciones multiformato con dato propio obligatorio + tutor que no responde y habla quechua con voces reales + **Rikuy Guardián** (eventos de aprendizaje no biométricos + autorreporte voluntario, que terminan en una conversación humana y no en una etiqueta) + **Mi Cerebro Rikuy**, un mapa de conocimiento real + malla y reportes por competencia CNEB + paquete para llevar en emergencias.

## 6. Qué es Rikuy y qué no es

| Es | No es |
|---|---|
| Un museo de ciencias donde cada exhibición es un experimento con dato propio | Un repositorio de videos o PDFs |
| Una herramienta de la docente, que ella aprueba, apaga y usa para reportar | Un tutor autónomo que reemplaza al docente |
| Evidencia de razonamiento con la frase del alumno, por competencia | Un sistema de notas automáticas, rankings o diagnóstico |
| Una cámara que lee solo puntos de la mano para los gestos, en el celular | Una cámara que vigila, califica, castiga o guarda imágenes |
| Rikuy Guardián: eventos de aprendizaje y un check-in voluntario que ayudan a la docente a decidir a quién acercarse | Un detector de emociones, un diagnóstico psicológico automático, un semáforo de riesgo o una vigilancia emocional |
| Un mapa de conocimiento real, con evidencia | Un "cerebro" decorativo |
| Offline por diseño; la nube es opcional, antes y después | Una plataforma que exige conexión en clase |

## 7. Documentos relacionados

[ECOSISTEMA.md](ECOSISTEMA.md) · [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md) · [PROYECCIONES.md](PROYECCIONES.md) · [CREDITOS.md](CREDITOS.md)
