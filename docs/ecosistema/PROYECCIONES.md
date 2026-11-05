# Rikuy — Proyecciones

> Hoja de ruta, impacto, modelo de transferencia, costos, riesgos y ética. Todas las cifras de costo son **supuestos de cálculo, no resultados de un piloto**. **(no verificado)** marca lo que no se contrastó con fuente primaria.

## 1. Hoja de ruta a 3 años

| Fase | Periodo | Alcance | Hitos | Condición para avanzar |
|---|---|---|---|---|
| **0. Prototipo** | Nov 2026 (Hack4Edu VII) | 1 recorrido demostrable | Museo Rikuy con Sala Física; exhibición del péndulo holográfica con gestos y medición propia; tutor de reglas con voz en castellano y audios grabados en quechua; relevo QR; panel con frase literal; reporte por competencia; quipu de logros; Para llevar | Prueba en modo avión y de gestos en celular de gama media-baja |
| **0.5 Validación** | Dic 2026 – feb 2027 | 3-5 docentes de CyT de Arequipa; observación con autorización | Entrevistas (Mom Test) que falsen la hipótesis de Rosa; 1 sesión observada; grabación del repertorio quechua con hablantes de la variedad local; cartas de interés; consulta de clasificación de Rikuy Guardián al ente rector de IA y revisión legal escrita; validación del vocabulario emocional en quechua con adolescentes hablantes | ≥ 3 de 5 docentes confirman que omiten prácticas por falta de materiales/tiempo y piden ver el razonamiento |
| **1. Piloto Arequipa** | Mar – dic 2027 (año escolar) | 5 → 20 IE rurales de secundaria en la sierra de Arequipa (p. ej., Caylloma, Castilla, La Unión; **por confirmar con UGEL**) | Salas Física y Biología completas (8 exhibiciones); **hub wifi en el celular de la docente (app nativa)** con visitas multigrupo; Cerebro entre sesiones; malla de la competencia "Indaga" con registro auxiliar; pre/post en 5 IE; piloto de validación de Rikuy Guardián (2-3 aulas, 4 semanas, con etiquetas de las docentes y auditoría por subgrupo; §6.1) | Mejora medible en los observables (sección 2) y uso sostenido (≥ 1 exhibición cada 2 semanas por docente) |
| **2. Regiones** | 2028 | 100-300 IE en Arequipa, Puno, Cusco, Ayacucho (regiones del piloto offline del MINEDU) | Cinco salas con ≥ 24 exhibiciones (1.º-5.º); Auditorio; aimara con voces grabadas; tablero UGEL por competencia; integración probada con la Plataforma Offline del MINEDU; primaria EIB en el Patio | Un financiador institucional (ProFuturo, ONG o UGEL/DRE) y una evaluación externa |
| **3. LatAm / ProFuturo** | 2029 | Países de habla hispana donde opera ProFuturo (**lista por verificar**: p. ej., Ecuador, Bolivia, Colombia, Guatemala) | Museos por país: el formato `Exhibit` desacopla currículo, lengua y código; comunidad de docentes creadores; lenguas originarias locales con hablantes socios | Adaptación curricular en < 3 meses por país |

## 2. Métricas de impacto y cómo se miden

| Nivel | Métrica | Cómo se mide | Fuente del dato | Meta del piloto (hipótesis) |
|---|---|---|---|---|
| Uso | Prácticas por docente al mes | Eventos `práctica_iniciada` agregados | App (T-15) | ≥ 2 |
| Uso | % de grupos que completan el ciclo | Eventos predicción + medición + conclusión | App | ≥ 70 % |
| Proceso (observable) | % de grupos que **predicen antes de medir** con variable explícita | Juez de reglas sobre E-05, con cita literal | App | De línea base a +30 pp |
| Proceso | % de conclusiones que **citan su propio dato** | Juez sobre E-10 | App | +25 pp |
| Proceso | Profundidad de pistas usadas (1/2/3) | Eventos de pista | App | Bajar con el tiempo |
| Aprendizaje | Ganancia en indagación (control de variables, interpretación de datos) | **Pre/post** con ítems liberados de evaluaciones públicas (PISA/TIMSS/ENLA, **por seleccionar y validar**) en IE piloto y de comparación | Prueba en papel, aplicada por la docente | Efecto medible; sin promesa de causalidad sin grupo de comparación |
| Docente | Minutos de preparación por práctica | Registro en el Creador + encuesta | App + encuesta | ≤ 20 min |
| Docente | Prácticas experimentales por bimestre antes vs. después | Encuesta y bitácora | Docente | ×2 |
| Continuidad | Paquetes "Para llevar" devueltos durante cierres | QR de vuelta | App | ≥ 40 % |
| Equidad | % de uso en lengua originaria; IE sin conectividad alcanzadas | Ajustes y estado de red agregados | App | Reportar, sin meta |
| Currículo | % de alumnos con evidencia en cada capacidad de "Indaga" | Malla (T-12) | App | Cobertura ≥ 80 % por bimestre |
| Cooperación | Nudos por ayuda entre grupos confirmados | Quipu de logros | App | Reportar, sin meta (no se incentiva inflarlo) |
| Apoyo oportuno (Guardián) | % de ofertas de ayuda aceptadas y si el grupo avanzó después; % de sugerencias de acercamiento que la docente marcó como necesarias (kappa contra sus etiquetas); tasa de check-ins omitidos o "prefiero no decir" | Eventos locales agregados (solo tasas de aceptación, nunca de emociones ni de conducta por alumno) | App | Reportar en el piloto (D-05, nunca en D-02); base para ajustar o retirar la función |
| Mi Cerebro Rikuy | Nodos "por revisar" que pasan a "razonado" en el bimestre | Cerebro | App | Reportar |
| Accesibilidad | % de sesiones con gestos vs. táctil; FPS en gama baja | Telemetría local agregada | App | Gestos usables ≥ 15 FPS en el celular de referencia |
| Ética | Incidentes de privacidad; % de clases con IA en línea activada | Auditoría (A-04) | App | 0 incidentes |

**Reglas de evaluación:** las métricas de proceso se presentan como tales, no como aprendizaje. Sin grupo de comparación no se afirma causalidad. La ENLA 2026 fue cancelada ([Infobae](https://www.infobae.com/peru/2026/09/13/minedu-deja-sin-efecto-la-enla-2026-prueba-de-logros-de-aprendizaje-de-estudiantes-se-reprogramara-para-2027/)): la ENLA 2027 sirve como referencia externa si se aplica en las IE piloto.

## 3. Modelo de transferencia (open-core)

| Capa | Qué es | Licencia / precio | Quién paga |
|---|---|---|---|
| Núcleo | PWA del Museo, exhibiciones, gestos, tutor de reglas, Cerebro local, panel, relevo QR, formato `Exhibit` | **MIT, gratis** (Base 9 de Hack4Edu exige licencia OSI) | Nadie |
| Contenido curado | Biblioteca de exhibiciones verificadas contra el CNEB, revisadas por pedagogos, con **voces grabadas por hablantes** (pagados por su trabajo) | Abierto (CC BY-SA sugerido) para docentes; el valor está en la curaduría continua | Financiador por región/país |
| Hub nativo | App de la docente que sirve el museo por wifi local | MIT; soporte de despliegue por IE | Financiador |
| Despliegue y formación | Acompañamiento docente, instalación de hubs, kits (pirámide, sensores baratos) | Por IE/año | ProFuturo, ONG, RSE, UGEL/DRE |
| Analítica institucional | Tablero UGEL/DRE, informes para financiadores, evaluación de impacto | Por territorio/año | UGEL/DRE, ProFuturo, financiadores |
| Creador con IA | Generación y revisión con modelos en la nube | Créditos incluidos en el paquete institucional | Mismo financiador |

**Orden de pagadores (hipótesis):**
1. **Programa de ProFuturo** o **ONG/fundación** que financie formación y acompañamiento por IE (ProFuturo reporta 3.609 escuelas en 30 países, **no verificado**).
2. **RSE** de empresas con presencia en zonas rurales de Arequipa; mecanismo de **Obras por Impuestos** como vía a explorar (**no verificado** su aplicabilidad a software y formación).
3. **UGEL/DRE** (compras públicas lentas; entrada vía programas de MINEDU como los 205 colegios rurales con IA para planificación, [gob.pe](https://www.gob.pe/institucion/minedu/noticias/1304191-minedu-implementara-uso-de-inteligencia-artificial-para-fortalecer-aprendizajes-de-27-000-estudiantes-del-ambito-rural)).
4. Docentes individuales: no se les cobra (Supermentes registró S/ 10-15/mes en entrevistas, pero el segmento rural no debe pagar).

**Qué es defendible:** no el código (MIT, copiable), sino la biblioteca verificada contra el CNEB, la red de docentes y hablantes revisores, y la evidencia de impacto.

## 4. Costos por colegio

Supuestos: 1 docente, 4 secciones, 120 alumnos, 8 prácticas al año; precios de referencia de modelos en la nube tomados del repo propio Willay (`docs/META_API.md`) y **no verificados para Gemini**; tipo de cambio S/ 3,5 por US$ (**no verificado**).

| Partida | US$/año | Nota |
|---|---|---|
| IA en la nube (generar y revisar 8 prácticas, pulido de resúmenes, pictogramas), con margen ×2 | ≈ 2 | Solo antes y después de clase |
| Alojamiento (sitio estático + funciones gratuitas) | 0 | A escala: estimar aparte |
| Celulares | 0 | Ya existen (docente y grupos) |
| Materiales (cuerda, piedra) e impresión de hojas A4 | ≈ 1 | |
| **Total variable por colegio** | **≈ 3** | < US$ 0,03 por alumno |
| Opcional: router portátil o laptop hub | ≈ 10-14 (amortizado a 3 años) | Precio **no verificado**; innecesario si llega el kit MINEDU |
| Opcional: pirámide de acetato | < 1 | < S/ 3 según el Reporte de Rikuy (**no verificado**) |
| **Formación y acompañamiento docente** | **No cuantificado** | Es el costo real a escala; se estimará en el piloto |

Referencia: Nómada (Impacto Social Hack4Edu 2025) presentó ≈ US$ 130 por unidad de hardware.

## 5. Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| La hipótesis de Rosa no se confirma (los docentes no omiten prácticas por falta de materiales) | Media | Alto | Validación 0.5 antes del piloto; replantear si 3 de 5 lo niegan |
| Sobredeclarar (quechua, offline total, impacto) | Alta | Alto | Etiquetas Demo/Prototipo/Roadmap en pantalla; tabla "verificado / no verificado" en el README |
| Celulares de gama baja no leen el QR, no corren el museo o los gestos | Media | Alto | Cuadros pequeños, lectura desde foto; museo < 1,5 MB; modo "lista" sin mapa; gestos con alternativa táctil y caída automática si FPS < 15 |
| El hub en el celular de la docente exige app nativa (el navegador no acepta conexiones entrantes) | Alta | Medio | v1 con QR y laptop-hub; app nativa en el piloto |
| Modelo de gestos cargado por CDN rompe el offline | Alta | Medio | Empaquetar el modelo en la PWA; medir tamaño |
| Rikuy Guardián: rechazo de familias, jurado o financiador; clasificación como alto riesgo (DS 115-2025-PCM art. 24.1) o como emoción sensible (DS 016-2024-JUS) | Alta | Muy alto | Sin sensores biométricos, sin etiquetas emocionales, opt-in por franja de edad, solo la docente responsable, retención corta, consulta de clasificación y revisión legal antes del piloto; Nivel 2 (cámara y voz) compilado apagado y bloqueado en la UE; la demo muestra solo el Nivel 1 |
| Falsos positivos, falta de equidad rural y fatiga de alertas en Guardián | Alta | Alto | Estados de conducta con reglas explicables (sin aprendizaje automático hasta tener etiquetas locales), umbrales calibrados por ítem y población, máximo 3 sugerencias por semana por tutor, "ya conversé / no era necesario" como etiqueta, auditoría por subgrupo; no alimenta notas, Cerebro ni reportes |
| Confidencialidad prometida de más: un check-in provoca una revelación de violencia o riesgo | Media | Muy alto | La pantalla explica que la confidencialidad no es absoluta (SíseVe); la docente sigue la ruta existente; sin ítems clínicos en v1; guía de cuidado ante una revelación |
| Los alumnos enmascaran o dejan de responder por sentirse vigilados | Media | Alto | Check-in omisible y privado por defecto, "prefiero no decir", visibilidad elegida por el alumno, ninguna consecuencia disciplinaria ni de notas, tasa de omisión como métrica de confianza |
| El Cerebro se percibe como perfilamiento de menores | Media | Muy alto | Solo frases y competencias, nunca rasgos; local; la docente lo ve y borra; el alumno ve lo que se recuerda; retención anual |
| Grabaciones en quechua de una sola variedad | Alta | Medio | Declarar la variedad; grabar con hablantes de la variedad local en el piloto |
| Sobrecarga docente (paro, ascenso, evaluaciones) | Alta | Alto | Cero administración: aprobar, mirar, decidir; prácticas listas |
| El MINEDU amplía su kit con contenido interactivo propio | Media | Medio | Ser la capa que se aloja en el kit (formato abierto) en vez de competir |
| Dependencia de proveedores de IA o fin de créditos | Media | Bajo | IA fuera del camino crítico; paquetes pregenerados; modelos locales |
| Traducciones de baja calidad | Media | Alto | Solo se publica lo revisado por hablante, con variedad declarada |
| Código reutilizado sin licencia explícita | Media | Medio | Créditos completos (CREDITOS.md) y permiso escrito de cada autor; reimplementación si no llega |
| Historial del repositorio percibido como no orgánico | Alta | Alto | Modalidad Sénior, `HISTORIAL.md` del responsable, commits pequeños y reales |
| Uso indebido de datos de menores | Baja | Muy alto | Ver sección 6 |

## 6. Ética para menores

| Compromiso | Cómo se cumple |
|---|---|
| **"Rikuy mira tu mano para que juegues; Rikuy Guardián no lee a nadie"** | Principio rector de todo uso de cámara, micrófono y memoria |
| **Rikuy Guardián** (acompañamiento; reemplaza a "Señales de aprendizaje") | Sin cámara, voz ni dinámica de teclado o toques; eventos de aprendizaje y autorreporte voluntario; solo la docente responsable; decisión humana; ver §6.1 |
| Cámara para gestos de mano | Procesamiento en el dispositivo; solo puntos de la mano; sin guardar ni transmitir imagen; indicador visible; interruptor de la docente; alternativa táctil |
| Cerebro acotado | Guarda frases literales, competencias, intentos y pistas; nunca rasgos de personalidad, emociones ni predicciones de riesgo; vive en el hub de la docente; visible para el alumno; borrable; retención por año escolar |
| Quipu sin mercado | Nada se compra; sin ventajas; sin rankings; sin dinero |
| Voces reales y con consentimiento | Grabaciones de hablantes nativos con consentimiento y crédito; sin TTS quechua (modelos no validados y en parte con licencia no comercial) |
| Sin cuentas ni datos personales | Código de clase + apodo de grupo; nada de nombres, DNI, imágenes de rostros ni ubicación |
| La nube no recibe texto de alumnos por defecto | "IA en línea" apagada; solo frases anonimizadas y con interruptor de la docente |
| Sin audio guardado | Voz del navegador con aviso ("puede usar un servicio en la nube; si no quieres, escribe") |
| Sin notas, rankings ni diagnósticos automáticos | "Orienta, no califica"; "no evaluable" no penaliza; la docente decide |
| Docente en el lazo | Aprueba cada práctica; interruptor del tutor; puede borrar la clase |
| Datos locales y portables | IndexedDB en el celular de la docente; exportación JSON; agregados con n mínimo para la UGEL |
| Consentimiento | Texto para familias desde la Guía de campo de Rikuy, leído en voz alta y en la lengua de casa |
| Transparencia de la IA | Etiqueta "generado con IA, aprobado por la docente"; auditoría de generaciones (A-04) |
| Marco | Ley 29733 de Protección de Datos Personales del Perú y su reglamento (**verificar** obligaciones para menores con asesoría legal); Reglamento de la Ley 31814 sobre IA (DS 115-2025-PCM), cuyo texto oficial (art. 24.1) clasifica como **alto riesgo** inferir emociones en centros educativos y evaluar a menores en educación (lectura del equipo de investigación, **no abogados**; detalle en §6.1; resumen jurídico complementario: [Dentons](https://www.dentons.com/es/insights/articles/2025/september/19/peru-aprueba-el-reglamento-que-regula-el-uso-de-la-inteligencia-artificial)); declaración de ministros en UNESCO del 8 sep 2026 sobre IA adecuada a la edad, supervisable y auditable ([Infobae/EFE](https://www.infobae.com/america/agencias/2026/09/08/paises-de-unesco-se-comprometen-a-vigilar-el-uso-de-ia-en-educacion-en-interes-del-menor/)) |

### 6.1 Rikuy Guardián: análisis ético y legal (**análisis de no abogados; pendiente de revisión por un asesor legal**)

**Decisión del equipo (5 nov 2026):** "Señales de aprendizaje" y su lectura de confusión por cámara y voz se reemplazan por **Rikuy Guardián**, una suite de acompañamiento que **no detecta emociones**: registra eventos de aprendizaje no biométricos, recoge lo que el alumno decide declarar y entrega a la docente una lista corta de *sugerencias de acercamiento*. Módulo y diseño en [ECOSISTEMA.md](ECOSISTEMA.md) 2.14; técnica en [ARQUITECTURA_ECOSISTEMA.md](ARQUITECTURA_ECOSISTEMA.md) 4.9. Evidencia en [CREDITOS.md](CREDITOS.md) §4b.

**Por qué este diseño y no un detector.** Los detectores de afecto basados en registros rinden de forma modesta contra la observación de campo (AUC de 0,63 a 0,80 y kappa de 0,1 a 0,36; confusión y frustración son los más débiles), no generalizan de población urbana a rural, y no hay ninguno validado con estudiantes andinos. En cambio, las conductas pedagógicas (sin avance en una habilidad, respuesta demasiado rápida, inactividad, pistas seguidas, evitar la ayuda) se detectan mejor, tienen una acción docente clara y son la única señal con beneficio experimental documentado en el aula (Lumilo, un solo experimento de una semana). El autorreporte privado del estado actual sigue siendo la fuente más válida de lo que siente la persona. Por eso: **la emoción solo entra porque el alumno la declara; el sistema solo calcula estados de conducta sin nombre emocional; y la decisión es humana.**

| Marco | Qué dice (según nuestra lectura) | Consecuencia de diseño |
|---|---|---|
| **Reto 18 de Hack4Edu VII** (según el enunciado que recibimos; **contrastar con las bases oficiales**) | Pide expresión voluntaria, dinámicas interactivas, autoevaluación y análisis de tendencias; excluye diagnóstico psicológico automatizado, vigilancia emocional e inferencia por reconocimiento facial; exige confidencialidad e intervención humana | Check-in omisible (expresión voluntaria y autoevaluación); actividad del museo como dinámica; línea base y vista del curso (tendencias); escalamiento y decisión de la docente (confidencialidad e intervención humana). Sin cámara, sin voz y sin etiquetas emocionales en el Nivel 1 |
| **Reglamento de IA de la UE, art. 3(39) y art. 5(1)(f)** | El art. 5(1)(f) prohíbe inferir emociones en centros educativos (salvo razones médicas o de seguridad), pero el art. 3(39) define el reconocimiento de emociones como inferencia **sobre datos biométricos**. Las directrices de la Comisión (C(2025) 5052 final, 29 jul 2025; no vinculantes) dicen que la inferencia **no biométrica** queda fuera, y que inferir emociones por **dinámica de pulsación de teclas, expresiones faciales, posturas o movimientos** sí está dentro. Detectar bienestar general, motivación o satisfacción de aprendizaje no cabe en la excepción médica o de seguridad | Se excluyen dinámica de teclado y de toques, cámara y voz. **Zona gris:** el tiempo de respuesta por ítem no está tratado en las directrices; se usa solo en cubos gruesos (rápida/normal/lenta) calibrados por ítem. El Nivel 2 (cámara y voz) no se ofrece en la UE ni a financiadores que exijan cumplimiento europeo; ProFuturo es una fundación española: **verificar** si su política lo exige. Aparte de las emociones, un sistema que evalúe resultados de aprendizaje para guiar el aprendizaje es de alto riesgo (Anexo III, punto 3(b); obligaciones desde el 2 dic 2027), lo que alcanzaría al tutor adaptativo si se comercializara en la UE. Siguen aplicando los arts. 5(1)(a)-(b) (manipulación y vulnerabilidades de menores) y el RGPD |
| **Perú: Ley 31814 y su reglamento (DS 115-2025-PCM)** | Texto oficial leído por el equipo de investigación (no abogados). Art. 24.1: es **alto riesgo** (no prohibido) "inferir las emociones de una persona física en los entornos de trabajo y en los centros educativos", salvo motivos médicos o de seguridad, **sin el limitador biométrico europeo**; también es alto riesgo evaluar a niños y adolescentes en educación, salvo que la función sea complementaria y no reemplace la evaluación pedagógica humana. Art. 23.1.d prohíbe clasificar personas, con independencia del dato de entrada, si el resultado es discriminatorio o desproporcionado. La redacción del art. 24.1 es torpe (la frase está pegada al literal de salud) y el art. 24.2 permite consultar al ente rector para clasificar un sistema. Los plazos del sector privado educativo vencieron el 10 sep 2026 | Guardián **evita inferir emociones**, pero se trata como alto riesgo por prudencia, con los controles: transparencia previa al alumno y a la familia (art. 25), registro, **supervisión humana** capaz de detener, corregir o invalidar (interruptor y descarte de sugerencias), evaluación de impacto, **consulta de clasificación al ente rector (art. 24.2) antes del piloto**, función complementaria (nunca reemplaza la evaluación pedagógica) y auditoría de sesgos por subgrupo para no caer en el art. 23.1.d |
| **Ley 29733 y DS 016-2024-JUS** | Los "datos morales o emocionales" y la salud mental son **datos sensibles**. Menores: consentimiento de quienes ejercen la patria potestad; los mayores de 14 pueden consentir si la información está en un lenguaje que comprendan (arts. 22 y 25 según nuestra lectura; **re-verificar numeración**). Datos sensibles: consentimiento por escrito (firma digital válida), libre, previo, informado; la carga de la prueba es del responsable. Los colegios deben analizar necesidad y proporcionalidad del tratamiento de información psicológica de menores (multas de 5 a 50 UIT en infracciones graves). No verificamos cómo aplica la autoridad esto a emociones declaradas frente a inferidas | **Menores de 14: consentimiento del apoderado + asentimiento del alumno. De 14 a 17: consentimiento del alumno con información comprensible y aviso al apoderado.** Consentimiento por escrito, revocable, con fecha y canal (T-21, E-00e), en castellano y quechua con audio. Datos locales, retención corta, sin sincronizar contenido individual salvo que el alumno elija compartirlo. Quién recoge el permiso de apoderados (papel, WhatsApp o F-01) sigue abierto |
| **Tutoría del MINEDU (RVM 212-2020) y SíseVe** | La TOE es "acompañamiento socioafectivo y cognitivo": el tutor detecta señales de alerta y deriva. La tutoría individual ocurre en espacios visibles para otros adultos y se comunica al coordinador, al director y a la familia. Una revelación de violencia activa la ruta de SíseVe (protocolos de 20 a 30 días hábiles) y el Libro de Registro de Incidencias es confidencial y está a cargo de la dirección. Educación Te Escucha requiere consentimiento familiar y no es terapia. El 98 % de los colegios públicos no tiene psicólogo | Guardián **se enchufa a la ruta existente** (docente, coordinador, director, familia, ETE o posta de salud) y no abre un sistema de casos paralelo ni duplica el Libro. **La confidencialidad no es absoluta y se explica al alumno antes de su primer check-in.** Sin ítems clínicos de riesgo suicida en v1 |
| **Declaración UNESCO, 8 sep 2026** | IA adecuada a la edad, supervisable y auditable | Auditoría (A-04) y documentación pública de las reglas usadas |

**Salvaguardas obligatorias (no negociables):**
1. **Sin sensores biométricos:** ni rostro, ni voz, ni dinámica de teclado o de toques. El acelerómetro del experimento mide el péndulo y nunca alimenta Guardián. El Nivel 2 (cámara y voz) vive solo detrás de una bandera de compilación apagada, bloqueada en la UE (`VITE_REGION=eu`), excluida de la demo y sujeta a revisión legal escrita y prueba de sesgos.
2. **Consentimiento** por franja de edad (arriba), por escrito, revocable en cualquier momento por el alumno (E-20b), la familia o la docente (T-21); desactivado por defecto; pausar pesa lo mismo que activar.
3. **Solo la docente responsable** ve alertas; ni pares, ni director, ni UGEL. Agregados desde **5 alumnos**; en grupos menores no hay agregado y se les dice a los alumnos. Máximo **3 sugerencias por semana por tutor**.
4. **Decisión humana:** la salida es "acercarse a conversar" con una guía breve; la docente la descarta o la atiende y lo registra ("ya conversé / no era necesario / no aplica"). Nunca se usa para notas, malla, reportes, Cerebro, disciplina ni ranking.
5. **Nunca una etiqueta emocional ni de riesgo.** El sistema emite estados de conducta (`atascado_en_habilidad`, `adivinacion_rapida`, `inactivo`, `abuso_de_pistas`, `evita_ayuda`); las emociones que se ven son las que el alumno declaró y solo si eligió compartirlas.
6. **Retención corta:** eventos crudos purgados al cerrar la semana; derivados de 4 a 6 semanas (propuestas a calibrar). Procesamiento local; sin red.
7. **Transparencia:** indicador "Guardián activo" siempre visible; el alumno ve qué se registra y puede borrarlo; lenguaje simple en castellano y quechua con audio.
8. **Confidencialidad con límites explícitos (SíseVe):** violencia o riesgo para la vida activan los protocolos del colegio y el alumno lo sabe de antemano.

**Triangulación, línea base y desacuerdos.** Cada alumno se compara consigo mismo (ventana corta). Cuando autorreporte y conducta no coinciden, la docente ve ambos y la sugerencia de acercarse a conversar; el sistema nunca decide cuál es "verdad" ni asume que el alumno miente. Una sugerencia aparece cuando el alumno pidió hablar o cuando dos canales independientes coinciden de forma sostenida (umbrales a calibrar en el piloto).

**Validación del piloto y riesgo de equidad rural.** Piloto propuesto: 2-3 aulas de secundaria, 4 semanas, al menos una con estudiantes quechuahablantes. Debe responder: (1) *viabilidad* (finalización, "prefiero no decir" y omisión, contra el 75-80 % típico de la literatura y la alarma de 34 % de un estudio con jóvenes holandeses); (2) *validez convergente* (ítems únicos contra un subconjunto corto de AEQ y PANAS-C-SF en papel, solo como criterio de validación, no como instrumentos de la app); (3) *utilidad* (qué proporción de sugerencias la docente marcó como necesarias, carga semanal, casos que la docente identificó por otras vías y Rikuy no señaló; con kappa y no solo exactitud); (4) *daño y confianza* (percepción de seguridad y honestidad, y auditoría por género, lengua materna, grado y dispositivo). Las etiquetas de las docentes son la verdad local. **Riesgo de equidad rural:** los detectores entrenados con estudiantes urbanos no generalizan a rurales, las respuestas rápidas o la inactividad dependen de celulares compartidos, conectividad y lengua de instrucción, y en aulas multigrado de 10-15 alumnos el anonimato es imposible. Mitigación: reglas explicables sin aprendizaje automático, umbrales calibrados por ítem y población, aprendizaje automático solo con etiquetas locales, y un marco de "cuidarnos", no de déficit (los estudiantes rurales destacan en afrontamiento, confianza y motivación de logro en las evaluaciones socioemocionales peruanas). Los criterios de continuidad son propuestas del equipo, no estándares publicados; ningún dato de eficacia independiente existe para apps de check-in con sugerencias en la región, por lo que el piloto se presenta como **validación, no como resultado**.

**Incertidumbres que se declaran:** (a) clasificación de Guardián bajo el art. 24.1 del DS 115-2025-PCM (lectura de "inferir emociones" y riesgo de "clasificación de personas"); (b) numeración y alcance de los artículos del DS 016-2024-JUS para menores y para emociones declaradas; (c) vocabulario emocional adolescente en quechua sin validar; (d) texto oficial del Reto 18; (e) política de ProFuturo sobre el art. 5(1)(f).

**Mensaje para el jurado:** *"Rikuy Guardián no lee a los estudiantes: ordena dónde debe mirar el tutor."* Una diapositiva de **lo que no hacemos** (cámara, voz, teclado, diagnósticos, rankings) y una de cumplimiento que mapee cada criterio del Reto 18 a un componente. Vocabulario: "sugerencia de acercamiento", "acompañamiento", "cuidarnos"; evitar "alerta temprana", "detección" y "salud mental". Preguntas previsibles: *¿y si el estudiante miente?* (no pretendemos detectar mentiras: reducimos el incentivo, ofrecemos vocabulario más rico y una señal de conducta independiente); *¿por qué no cámara?* (AUC de 0,63 a 0,80, ninguna validación andina, y el reto la excluye); *¿qué evidencia tienen?* (la base sale de estudios de EMA, aprendizaje y práctica tutorial; el piloto es la validación local).

## 7. Lo que sigue sin verificar

1. Porcentaje de colegios públicos con laboratorio (ESCALE).
2. ENLA 2025: 8,3 % satisfactorio en ciencia (confirmar en la UMC).
3. Que la Plataforma Offline del MINEDU no incluya laboratorios ni tutor, y que Rikuy pueda alojarse en su servidor.
4. Clasificación de Rikuy Guardián bajo el art. 24.1 del DS 115-2025-PCM (texto oficial leído por no abogados; falta consulta al ente rector y revisión legal), numeración de los artículos del DS 016-2024-JUS para menores y texto oficial del Reto 18.
5. Países y cifras de ProFuturo; aplicabilidad de Obras por Impuestos.
6. Precio de Gemini, tipo de cambio, precio de routers y pirámides.
7. Licencia de PhET y disponibilidad en quechua.
8. Funcionamiento de sensores, voz sin red, gestos y lectura de QR en los celulares objetivo; disponibilidad de voces TTS en castellano sin red en Android de gama baja.
9. Nombres literales de las competencias CNEB citadas (contrastar con el JSON curricular).
