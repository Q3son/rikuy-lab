# Rikuy — Funciones extra: informes a casa, ayuda entre pares, mini-funciones de ganadores y audio accesible

> Especificación de producto de cuatro partes. Se apoya en [ECOSISTEMA.md](ECOSISTEMA.md), [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md) (IDs `T-`, `E-`, `F-`, `D-`), [ARQUITECTURA_ECOSISTEMA.md](ARQUITECTURA_ECOSISTEMA.md) (§2.2 puertos, §5.4 frentes F1 a F10, §5.5 propiedad) y [CREDITOS.md](CREDITOS.md).
> Fecha de la investigación: 5 nov 2026. Estado de todo lo de este documento: **Roadmap / propuesta**, salvo que diga lo contrario. Los análisis legales son de no abogados.
> Esfuerzo: **S** = hasta 1 día de un frente; **M** = 2 a 5 días de un frente (estimación propia, sin medir).
> **Regla de honestidad de la investigación:** cuando una página oficial no abrió (error 403) o no se encontró evidencia, el documento lo dice. Lo no verificado lleva la marca **[no verificado]**. Ver §6.

## 0. Resumen ejecutivo

| # | Función | Qué es | Esfuerzo | Frente dueño | Estado propuesto |
|---|---|---|---|---|---|
| 1 | **Informes semanales y mensuales** (tutora, apoderado, director/UGEL) | Resúmenes generados en el hub, aprobados por la docente y enviados por correo o WhatsApp al sincronizar; puerto de entrega con adaptador simulado | M | F6 (mensajes, bandeja) con F10 (contenido) y F7 (adaptadores en nube) | Prototipo con adaptador simulado |
| 2 | **Ayudante del museo** | Un grupo pide ayuda con un concepto, otro grupo que ya lo razonó explica en persona; el nudo del quipu va al grupo ayudante | M | F5 (Museo) con F10 (quipu) y F6 (visibilidad docente) | Prototipo mínimo; hub para presencia |
| 3 | **Mini-funciones de ganadores** (10) | Ecos pequeños de MyLEA, Milo, EIDOS, LumiSign, Dinomate, BlinkMouse, TeachFlow, Nómada, PixelMAI | S a M | F1, F3, F5, F7, F9, F10 | Ver §3.4 |
| 4 | **Audio accesible** | Narración, lector de pantalla, quechua grabado, hoja de ruta de lengua de señas | S a M | F1, F3, F9 | Ver §4 |

**Prioridad de implementación (impacto para el jurado y para el aula, dividido por esfuerzo):**

1. Contexto del aula (campos de TeachFlow) — S — F6/F7/F9.
2. Buzón de dudas y mapa de calor de temas (EIDOS) — S — F10/F4.
3. Informe semanal a la familia por WhatsApp con audio, con adaptador simulado — M — F6/F10/F7/F9.
4. Ayudante del museo mínimo (reacción "ayuda" con concepto, nudo confirmado, tablero docente) — M — F5/F10/F6.
5. Nivel de acompañamiento + frases con pictogramas (Milo) — S/M — F1/F4/F7.
6. Narración audio-primero y "Dicta tu dato" (Dinomate) — M — F3/F1.
7. Piedra de Rikuy personalizable por el grupo (mascota de MyLEA) — S — F5.
8. Curador de sala, NPC con la pregunta de la sala (PixelMAI) — S — F5/F4.
9. Señas del museo, glosario en lengua de señas peruana (LumiSign) — M — F9/F3.
10. Postal sonora entre aulas (Nómada) — M — F2/F5/F9.
11. Barrido a un toque (BlinkMouse, sin cámara) — M — F1.
12. Informe mensual PDF a director y UGEL — M — F10 (se puede hacer antes que 3 si el pitch lo pide).

**Líneas que no se cruzan en ninguna de las funciones (heredadas de ECOSISTEMA):** nada de Rikuy Guardián sale de la app de la docente responsable; sin rankings; sin notas AD/A/B/C decididas por el sistema; sin chat libre entre alumnos; sin TTS quechua; un borrador de IA no se muestra como revisado; sin cámara para nada que no sea la mano del holograma.

---

## 1. Informes por correo y WhatsApp (estilo TeachFlow/RimAI)

### 1.1 Cómo lo hacen otros productos (lo verificado y lo no verificado)

Cada fila separa lo que se leyó en una página oficial de lo que solo apareció en un resultado de búsqueda o en material de colegios. **No se encontró evidencia oficial** para Kahoot!, Quizlet (correo programado), BYJU'S, Platzi, Crehana, Descomplica, Arco/Eleva, Lumni, Aprende Institute, Qué Aprendes ni ClassPoint; en esos casos solo se dice qué se encontró.

| Producto | Cadencia | Bloques de contenido | Tono / privacidad | Alta y baja | Idioma | Sin conexión | Fuente (verificación) |
|---|---|---|---|---|---|---|---|
| **Google Classroom** (resumen para tutores legales) | Semanal o diario (lunes a viernes) o ninguno; se puede fijar la zona horaria | Trabajo faltante; trabajo próximo (hoy y mañana en el diario, la semana siguiente en el semanal); actividad reciente de la clase | "No incluyen calificaciones"; sin actividad no se envía correo; solo para cuentas escolares | El docente invita (la invitación vence a los 120 días); el tutor acepta; "Cancelar suscripción" al pie: sin cuenta Google, cancelar también lo quita como tutor | La ayuda está en varios idiomas; la página no dice si los resúmenes se traducen | No aplica (correo) | [Ayuda oficial](https://support.google.com/edu/classroom/answer/6388136?hl=en) — **leída directamente** |
| **Microsoft Teams para Educación** | Semanal | Estado de entrega de la semana anterior (entregado o faltante) y vencimientos de la siguiente | Datos de cada alumno solo para sus tutores; la página no menciona notas | El TI activa la función; el docente la enciende por clase (Tareas > Configuración > Correo a padres/tutores) | No indicado | No aplica | [Soporte oficial](https://support.microsoft.com/en-US/Education/send-weekly-assignment-summaries-to-parents-and-guardians) — **leída directamente** |
| **Brightwheel** (inicial) | Un informe diario al salir el niño | Actividades registradas del día (siestas, comidas, etc.), fotos | Se excluyen las actividades "Solo personal"; no se envía si no hubo actividad ni registro de entrada/salida | La familia se suscribe en web o app; si solo tiene teléfono, debe agregar correo; el personal puede enviarlo a no suscritos | No indicado | No aplica | [Ayuda oficial](https://intercom.help/brightwheel/en/articles/1380998-send-daily-reports) — **leída directamente**; no se halló informe semanal ni "de aprendizaje" |
| **ClassDojo** | Aviso el viernes para revisar la retroalimentación del niño; informe semanal por correo según guías de colegios | Retroalimentación y puntos de conducta y habilidades; mensajes; Class Story | Los puntos se pueden ocultar de los informes a familias (sección de ayuda "Class Point Reports") | Código de invitación; familias que no usan la app reciben correo | **Traducción con un toque**, 35 idiomas al lanzarse en 2015 (Class Story, mensajes, portafolios) | App + correo | [Blog oficial](https://blog.classdojo.com/introducing-classdojo-translate/) — **leído directamente**; cadencia del viernes: [guías de colegios](https://www.anderson.kyschools.us/CLASSDOJOPARENTINFORMATION.aspx) y búsqueda (secundario); su centro de ayuda dio 403 |
| **Seesaw** (familias) | Una vez al día o nunca, por correo y por aviso en el celular | Solo el **conteo** de publicaciones o mensajes nuevos, no el contenido | Minimiza datos en la notificación | Cada familia lo ajusta en Cuenta > Notificaciones; el SMS no está disponible fuera de EE. UU. y Canadá | No indicado | App | [Ayuda oficial](https://help.seesaw.me/hc/en-us/articles/206528005) — **resumen de búsqueda** (la página dio 403 al abrirla) |
| **Khan Academy** (docente y familia) | Correo semanal de "reporte para docente y para padre/madre" | Recordatorio para revisar el progreso con enlace al tablero; Khanmigo: correo al docente si un chat es marcado por moderación | El contenido está en el tablero, no en el correo; el docente ve el historial de Khanmigo | No verificado cómo se enciende o apaga | Khanmigo puede redactar y traducir correos del docente a familias | App | [Foro oficial de ayuda](https://support.khanacademy.org/hc/fr/community/posts/4404538388237-Update-Temporary-change-to-weekly-Teacher-and-Parent-Report-email-delivery) — **resumen de búsqueda** (403 al abrirla) |
| **Remind** | Mensajes del docente (no un resumen automático) | Texto breve | La traducción viene **apagada por defecto**; quien recibe puede ver el original; usa los 90 y más idiomas de Google Translate | Quien recibe puede salirse de la clase | 90+ idiomas (traducción automática) | App y SMS | [Ayuda oficial](https://help.remind.com/hc/en-us/articles/360018283580) — **resumen de búsqueda** (403) |
| **Duolingo for Schools** | Informes semanales al docente (cobertura del lanzamiento); compartir progreso por correo con padres | Habilidades y lecciones; XP | Compartir es decisión del alumno | Alumno ingresa el correo | — | — | [Cobertura](https://appadvice.com/appnn/2015/01/duolingo-for-schools-lets-teachers-easily-track-students-language-learning-progress); un reporte aislado dice que el servicio se descontinúa tras julio de 2027 ([PiunikaWeb](https://piunikaweb.com/2026/04/24/duolingo-for-schools-is-being-discontinued-after-july-2027/)) **[no verificado]** |
| **Kahoot!** | No se halló correo programado; reportes por juego en la web | Resultados por partida | — | — | — | — | **Sin evidencia oficial** de resumen a familias |
| **Quizlet** | No se halló correo programado; "Class Progress" solo en la web (por defecto, dos semanas) | Actividad de estudio y mejores puntajes | — | — | — | — | [Ayuda oficial](https://help.quizlet.com/hc/en-us/articles/360030512432-Using-Class-Progress) — **resumen de búsqueda** |
| **BYJU'S** | No se halló documentación oficial; existe una "Parent Connect App" | "Actualizaciones en tiempo real" según un blog | — | — | — | — | **Sin evidencia oficial** ([blog de terceros](https://theblogchatter.com/blogrolls/become-a-companion-in-your-childs-progress-with-the-byjus-parent-connect-app)) |
| **Platzi, Crehana, Descomplica** | No se halló resumen semanal a responsables; son productos para adultos o preuniversitarios | Descomplica: calendario semanal de estudio y seguimiento de progreso | — | — | — | — | **Sin evidencia** de informes a familias ([Descomplica](https://descomplica.com.br/blog/plano-de-estudos-personalizado/)) |
| **Arco / Eleva** (Brasil) | No se halló informe de desempeño por WhatsApp o Plurall | App "Meu Arco": avisos, chat con docentes y coordinación, agenda | — | — | portugués | App | [App Store](https://apps.apple.com/app/id6450907090) — descripción de la ficha; **sin evidencia** de informes |
| **Lumni, Aprende Institute, Qué Aprendes, ClassPoint** | Búsquedas sin resultados útiles | — | — | — | — | — | **Sin evidencia** |
| **Perú (Minedu)** | Aprendo en Casa (2020) se apoyó en grupos de WhatsApp de docentes con audios y videos; SIAGIE es para docentes y directivos; la familia consulta la Constancia de Logros en constancia.minedu.gob.pe; Minedu lanzó una app para que familias de los COAR sigan a sus hijos | — | Datos de alumnos bajo Ley 29733 | — | — | — | [La República](https://larepublica.pe/sociedad/2020/04/08/coronavirus-en-peru-estudiar-en-casa-en-tiempos-de-covid-19), [Trámites Perú](https://tramitesperu.com/minedu/siagie/) (no oficial), [Otras Voces](https://otrasvoceseneducacion.org/archivos/tag/seguimiento-escolar) — **secundario**; no se halló norma de Minedu sobre WhatsApp con familias |
| **TeachFlow/RimAI** (Perú, 3.º Sénior 2025) | Es herramienta para el docente (planificación y materiales), no informe a familias | Campos de región, zona, festividades, flora y fauna; fichas en quechua, aimara e inglés | — | — | es, qu, ay | Afirma interfaz "ligera, offline" (una frase, sin demo) | [Notas de pitch](D:/proyectos/PROYECTO_GLM/research_notes/Funciones%20Rikuy%20Lab%20ganadoras/pitches_senior.md), [Final VI 5:03:57](https://www.youtube.com/watch?v=rHC13qfwR-c&t=5h3m57s) |

**Contexto de conectividad rural.** Un resultado de búsqueda sobre notas del INEI reporta, para el primer trimestre de 2024, 18,1 % de hogares rurales con internet y que cerca del 90 % de quienes usan internet lo hacen desde el celular ([INEI, nota de prensa 050-2024](https://m.inei.gob.pe/media/MenuRecursivo/noticias/nota-de-prensa-n-050-2024-inei-002.pdf), PDF que no se pudo leer; cifra **[no verificada]**). No se halló un porcentaje de uso de WhatsApp en familias rurales; Osiptel reporta que mensajería y redes son el uso principal de internet móvil, sin desglose rural ([DPL News](https://dplnews.com/?p=254681)).

### 1.2 Lecciones que se adoptan

1. **Semanal como máximo, viernes por defecto, y silencio sin novedades.** Google y Brightwheel no envían si no hubo actividad. Seesaw ofrece diario o nunca; para una familia con datos pagados, diario es demasiado.
2. **Sin notas en el resumen.** Google lo dice expresamente. Rikuy además no califica: no hay AD/A/B/C ni porcentajes por niño.
3. **El correo avisa y el detalle vive en otro lado.** Khan y Seesaw ponen poco en el correo y llevan al tablero. Rikuy lleva a la página ligera "Para llevar" (< 200 KB) o a la PWA de la docente, que funciona sin red porque el dato ya está en el hub.
4. **Alta consciente y baja en un toque, sin perder otros derechos.** La trampa de Google (cancelar sin cuenta lo quita como tutor) se evita: dejar de recibir informes **no** retira a la familia de la clase ni de "Para llevar".
5. **Traducción:** ClassDojo traduce con un toque y Remind la deja apagada y muestra el original. Rikuy **no usa traducción automática al quechua**: usa textos revisados y audio grabado por hablantes; si falta, cae a castellano con un aviso.
6. **Una sola acción para la familia:** "pregúntenle…". El formato F-01 ya lo hace; el informe lo repite.
7. **Estado honesto de entrega** ("registrar no es entregar", Tándem): en cola, enviado al proveedor, entregado, fallido, baja.
8. **Sin rastreo de lectura hacia el docente por defecto.** ClassDojo permite al docente ver si una familia abrió una traducción. En Rikuy presionar a las familias por "no leyó" va contra el lazo de confianza; el estado "leído" no se muestra a la docente.

### 1.3 Restricciones propias que moldean el diseño

- **Los datos individuales viven en el hub** (Cerebro, `padron`); la nube recibe solo agregados (ECOSISTEMA 2.8). Por eso los mensajes **se componen en el hub o en el celular de la docente** y la nube actúa como transporte, no como dueña del dato. El `padron` (contactos de familias) nunca aparece en exportes ni en `DELTA` (puerta de F2).
- **Offline normal:** el informe se genera siempre (a las 17:00 del viernes o al cierre de la última sesión); el envío espera a la red. Mientras tanto, la docente tiene siempre el camino manual: enlace `wa.me` prellenado y A4 (F-05 hoy es manual).
- **Consentimiento (Ley 29733, DS 016-2024-JUS):** menores de 14, consentimiento del apoderado; de 14 a 17, el propio alumno con información comprensible, y el colegio informa al apoderado ([COMEXPERU](https://comexperu.org.pe/upload/articles/proyectos-de-ley/carta-mujer_menores-de-edad-digital_feb2025-1.pdf), resumen secundario; el texto del artículo 28 no se leyó). Los informes llevan datos de menores identificables solo en el nivel 2 (§1.5) y con alta explícita.
- **Correo comercial:** la Ley 28493 y su reglamento (DS 031-2005-MTC) regulan el correo comercial **no solicitado** (obligan, por ejemplo, a la palabra "PUBLICIDAD" en el asunto y a un mecanismo de baja) ([OSIPTEL](https://www.osiptel.gob.pe/media/0hyfzp1a/ley-28493-correo-electronico-comercial-no-solicitado-spam-osiptel.pdf)). Los informes de Rikuy son informativos y con alta previa; **no pueden mezclar promoción alguna** (ni planes de pago ni otros productos). Revisión legal pendiente.
- **WhatsApp Business Platform:** exige consentimiento previo; fuera de las 24 horas posteriores al último mensaje de la familia solo se permiten **plantillas aprobadas**; una respuesta a una plantilla abre una ventana de 24 horas ([resumen de proveedores](https://bird.com/docs/knowledge-base/whatsapp/customer-service-window)). El precio de las plantillas de utilidad cambia según la fuente (gratis dentro de la ventana hasta el 30 sep 2026 o desde el 1 jul 2025); **verificar en la página de precios de Meta** antes de presupuestar. Que una plantilla admita audio en el encabezado **[no verificado]**; el diseño no depende de ello (§1.6).
- **Cierres escolares y calendario regional:** el informe sabe si la región cierra (T-01 ya muestra la fecha) y cambia el bloque "próxima semana".

### 1.4 Diseño de los tres informes

#### 1.4.1 Resumen semanal a la docente-tutora (correo y WhatsApp)

| Campo | Definición |
|---|---|
| Propósito | Cerrar la semana en 2 minutos y decidir qué hacer el lunes; reenviable al director sin editar |
| Cadencia | Semanal. Se compone el viernes al cierre; se envía en la primera sincronización con red; **vigencia hasta el miércoles** (después se fusiona con la semana siguiente en "dos semanas") |
| Canales | Correo (principal) y WhatsApp (mensaje corto + enlace a la PWA) |
| Idioma | Castellano (la docente puede elegir quechua para la interfaz, pero el informe de la docente va en castellano por defecto) |
| Destinatario | La docente responsable de la clase (T-00 guarda su correo y su número) |
| Qué lleva el asunto | `Rikuy · 2.º B · semana del 3 al 7 de noviembre` (sin nombres de alumnos) |

**Estructura del correo (orden fijo, una acción principal):**

1. **En una línea:** "Esta semana: 3 exhibiciones, 5 de 6 grupos entregaron evidencia."
2. **Competencia que avanzó:** "Indaga mediante métodos científicos…" — capacidades con evidencia / capacidades trabajadas, barra con texto (no solo color); "sin evidencia aún" en gris, nunca como cero.
3. **Lo que les costó** (conceptos de `MemoriaEntrada`, agregados por clase): "Longitud → periodo: 4 de 6 grupos tuvieron una predicción por revisar." Sin nombres y sin frases literales en el correo.
4. **Mapa de dudas** (si el Buzón de dudas está activo, §3.2 función 2): los 3 temas con más dudas.
5. **Ayuda entre pares** (si el Ayudante está activo): "7 pedidos, 6 cerrados, 4 nudos por confirmar" (solo números por clase; no quién pidió).
6. **Pendientes de la docente:** grupos que faltan por entregar (QR), nudos por confirmar, vitrinas por abrir, mensajes a familias por aprobar, aviso de cierre escolar con fuente.
7. **Próxima exhibición sugerida** (una).
8. **Botón:** "Abrir Mi clase de hoy" (enlace a la PWA; funciona sin red tras la primera carga).
9. **Pie:** "Orienta, no califica." Cómo pausar los correos. Estado de la sincronización ("datos hasta el viernes 17:00").

**Datos que usa:** `Evidencia` (conteos), `Competencia`, `MemoriaEntrada` (conceptos agregados), `AsientoQuipu` (nudos pendientes), `PedidoAyuda` (conteos), `Clase.cierres`.

**Nunca aparece:** nada de Rikuy Guardián (ni check-ins, ni estados de conducta, ni "para acercarse", ni el **conteo** de sugerencias, ni que Guardián esté activo); frases literales de alumnos; nombres reales o apodos de alumnos; orden de grupos por puntaje o por avance; comparaciones con otras secciones; calificativos AD/A/B/C; saldo individual del quipu.

> Decisión: la lista "para acercarse" de Guardián vive solo en T-06c, aunque la destinataria sea la misma docente. Un correo se reenvía, se guarda en la nube del proveedor de correo y se lee en celulares compartidos; no es un canal para datos sensibles (ECOSISTEMA 2.14 limita la visibilidad a la docente responsable dentro de la app).

#### 1.4.2 Resumen semanal al apoderado (WhatsApp principal, correo opcional)

| Campo | Definición |
|---|---|
| Propósito | Mostrar que el hijo o hija **hizo ciencia** y dar **una pregunta para conversar en casa** (continuidad con F-01 y F-05) |
| Cadencia | Semanal (viernes por la tarde) o quincenal o nunca, por familia. Nunca diario. Sin novedades, no se envía |
| Canal | **WhatsApp primero** (la mayoría de familias rurales tiene celular básico con WhatsApp, no correo; en Brightwheel una familia sin correo no recibe nada, lección que no se repite). Correo solo si la familia lo pide |
| Idioma | Castellano o quechua (variedad elegida en T-00); texto quechua solo si está **revisado**; audio solo grabado por hablante |
| Formato | Texto corto (≤ 40 palabras), una imagen con 3 pictogramas (≤ 30 KB), audio (≤ 35 s), un enlace a la página ligera |
| Aprobación | La docente aprueba el **lote** con un toque en T-16 antes de enviar (humano en el lazo). Los mensajes con nombre del niño se revisan uno por uno |

**Dos variantes:**

- **A. Del grupo (por defecto, sin nombre de menores).** Igual para todas las familias del grupo; se puede enviar como difusión.
- **B. Individual (alta aparte de la familia, aprobación una por una).** Agrega el primer nombre del niño y **una** línea positiva elegida por la docente entre: la frase propia que el alumno decidió compartir, o "ayudó a otro grupo a entender". Va 1:1, nunca en difusión (regla ya fijada en F-05).

**Texto de la plantilla (castellano), variante A:**

```
Rikuy · semana del {fecha_ini} al {fecha_fin}
Esta semana su hijo o hija y su grupo {verbo_exhibicion} {exhibicion_corta}.
Pregúntenle: {pregunta_casa}
Toque "Escuchar" para oír esto en {lengua_casa}.
Actividad para hacer juntos: {enlace_ligero}
Para no recibir más mensajes, responda BAJA.
```

Ejemplo: "Esta semana su hijo o hija y su grupo midieron un péndulo con una piedra y una cuerda. Pregúntenle: ¿de qué depende lo que tarda en ir y volver?"

**Guion del audio (≈ 25 s, compuesto por bloques pregrabados, sin TTS quechua):**

| Bloque | Duración | Origen |
|---|---|---|
| Saludo fijo en la lengua de casa | 3 s | Grabación fija (F9) |
| "Esta semana su grupo…" + exhibición | 8 s | Grabación por exhibición (ya existe como "audio por lengua" del `Exhibit`) |
| Pregunta para casa | 8 s | Grabación por exhibición |
| Cierre fijo ("Gracias por escucharnos") | 3 s | Grabación fija |

El bloque por exhibición se graba **una vez** junto con la exhibición, así que el informe no exige grabar cada semana. Si el audio quechua de esa exhibición aún no existe: texto castellano + "El audio en quechua llega pronto", nunca voz sintética en quechua.

**Datos que usa:** nombre corto de la exhibición, pregunta para casa del `Exhibit`, fecha, lengua de la familia, consentimiento. Variante B suma: primer nombre, la línea elegida.

**Nunca aparece:** Rikuy Guardián en cualquier forma (ni que "hubo un check-in", ni que "estuvo atascado"); que el hijo **pidió** ayuda (sí puede decir que **ayudó**, con la alta B; nunca a quién ayudó ni quién pidió); número de pistas, intentos o errores; "sin evidencia" o "no logró"; notas, AD/A/B/C, porcentajes; comparaciones con otros niños o con "la clase"; rankings o posición del grupo; saldo del quipu como puntaje; deudas; promoción de cualquier tipo; datos de otros niños.

#### 1.4.3 Informe mensual a director y UGEL (PDF)

| Campo | Definición |
|---|---|
| Propósito | Cobertura de competencias, continuidad y brechas, sin identificar alumnos; exportable (D-01, D-02, D-04) |
| Cadencia | Mensual, el primer día hábil; versión del director por IE, versión de la UGEL por ámbito |
| Canal | Correo institucional con PDF adjunto (4 páginas A4 máximo para director; 6 para UGEL); descarga también desde el tablero. Un WhatsApp con enlace es opcional |
| Quién lo compone | La nube, a partir de **agregados** sincronizados (el director y la UGEL no tienen acceso a datos individuales). Sin sincronización de un aula, el PDF lo dice ("3 de 5 aulas sincronizaron") |
| Generación | Puerto `GeneradorPdf`: adaptador de **HTML imprimible** (sin red, ya previsto en F10) y, opcional, adaptador de servidor para el envío automático |

**Estructura (director):**

1. **Cinco cifras:** exhibiciones realizadas, secciones activas, % de sesiones con evidencia recibida, días de cierre cubiertos con "Para llevar", cobertura de datos.
2. **Cobertura de competencias por sección** (D-01): capacidades con evidencia; "sin evidencia aún" en gris.
3. **Conceptos que más costaron** y exhibiciones sugeridas para reforzar.
4. **Continuidad en cierres:** días de cierre, paquetes enviados y devueltos por QR, entregas por canal.
5. **Brechas por lengua y conectividad:** sesiones sin red, horas de audio en quechua usadas (agregado).
6. **Ayuda entre pares:** pedidos y cierres como conteos por sección.
7. **Método y límites:** supresión de celdas con menos de 5; "orienta, no califica"; cobertura de datos; fecha de la última sincronización.

La versión UGEL agrega una tabla territorial por IE **ordenada por código modular, sin colores de semáforo** y sin ordenar por resultado (D-03: "sin ranking de docentes").

**Datos que usa:** `ReporteCompetencia` agregado, `AsientoQuipu` agregado (solo conteos), eventos de entrega, `Clase.cierres`, estado de la sincronización.

**Nunca aparece:** alumnos, apodos, frases literales, alias de grupo; nada de Guardián (el ECOSISTEMA lo limita a la docente responsable, ni el director ni la UGEL; tampoco agregados "del curso"); ranking de alumnos, docentes, secciones o IE; semáforos o categorías de "riesgo"; celdas con menos de 5 alumnos; calificativos; comparaciones con metas externas no verificadas.

### 1.5 Reglas de contenido y cómo se hacen cumplir

**Niveles de dato:**

| Nivel | Qué contiene | Quién lo recibe | Condición |
|---|---|---|---|
| 0 | Agregados con n ≥ 5 | Director, UGEL | Supresión en `@rikuy/reportes` |
| 1 | Conteos por grupo o clase, sin nombres | Docente; familia (variante A) | Alta de la familia |
| 2 | Primer nombre y una línea positiva | Familia (variante B) | Alta aparte + aprobación de la docente, una por una |

**Cómo no se cuela lo prohibido (diseño por contrato, no por revisión):**

1. Cada plantilla declara un **esquema de entrada con lista permitida** (Zod `.strict()`): el compositor solo recibe los campos de arriba; un campo extra falla en compilación y en ejecución.
2. La regla de dependencia ya existente (`memoria, evidencia, reportes, cerebro, quipu ✗→ senales`) impide que el código de informes importe Guardián; se agrega `mensajeria ✗→ senales`.
3. Pruebas de contrato (TDD estricto, la prueba primero):
   - Dado un fixture con eventos de Guardián, el informe resultante es idéntico al de un fixture sin ellos (como la puerta de F4).
   - Ninguna plantilla renderizada contiene `AD|A|B|C` como calificativo, ni palabras de la lista de afecto, ni dos nombres de niños distintos.
   - Ningún orden depende de un puntaje (se prueba con permutaciones).
   - La variante A no contiene ninguna cadena del `padron`.
   - Un párrafo quechua `revisado:false` nunca llega a un mensaje real (puerta de F9 extendida).
   - El PDF suprime celdas con n < 5 y no contiene alias.
4. Cada mensaje guarda un **acta**: plantilla, versión, hash del contenido, consentimiento vigente y quién aprobó. No guarda el texto del hijo.

### 1.6 Entrega al sincronizar: puerto de adaptadores con simulado

**Paquete nuevo propuesto:** `packages/mensajeria/` (`@rikuy/mensajeria`), dominio puro (plantillas, cola, estados, política de reintentos). Los adaptadores que tocan la red viven en `apps/cloud` (F7) y en `apps/web` (adaptador `wa.me`). Requiere un PR a `contracts` (Sprint 0) y una fila en el mapa de propiedad §5.5.

```ts
// packages/mensajeria/src/puertos.ts
export type Canal = 'whatsapp' | 'correo' | 'enlace_wame' | 'pdf';
export type EstadoEntrega =
  | 'en_cola' | 'enviado_proveedor' | 'entregado' | 'fallido' | 'rebotado' | 'baja';
// 'leido' existe en el adaptador pero NO se muestra a la docente por defecto.

export interface MensajeSaliente {
  id: string;                     // ULID
  claveIdempotencia: string;      // hash(periodo, destinatario, plantilla)
  plantilla: 'tutora_semanal' | 'familia_semanal_a' | 'familia_semanal_b' | 'director_mensual' | 'ugel_mensual';
  version: number;
  lengua: 'es' | 'quy';
  cuerpo: CuerpoRenderizado;      // ya compuesto en el hub
  adjuntos: { tipo: 'audio' | 'imagen' | 'pdf'; hash: string }[];
  vigenteHasta: string;           // ISO; pasado ese momento se descarta o se fusiona
  consentimientoRef: string;
}

export interface PuertoEntrega {
  readonly canal: Canal;
  capacidades(): { plantillasAprobadas: boolean; audioAdjunto: boolean; estadoEntrega: boolean };
  enviar(msg: MensajeSaliente, destino: Destino): Promise<Result<AcuseEnvio, FalloEntrega>>;
  estado(acuseId: string): Promise<EstadoEntrega>;
}
export type FalloEntrega = { tipo: 'sin_red' | 'cuota' | 'plantilla_rechazada' | 'sin_consentimiento' | 'rebote' | 'proveedor'; detalle: string };
```

**Adaptadores previstos:**

| Adaptador | Dónde vive | Para qué | Estado |
|---|---|---|---|
| `AdaptadorEntregaSimulado` | `packages/mensajeria` | Demo, pruebas y desarrollo. Escribe en una bandeja local con vista previa HTML. Inyecta fallos deterministas (`fallarNVeces`, `rebote`, `sinRed`) para probar reintentos y estados. Etiqueta visible "Datos simulados" | **Primero** |
| `AdaptadorWhatsAppNube` | `apps/cloud` | API de WhatsApp Business: plantillas de utilidad con botones de respuesta rápida ("Escuchar", "Pausar") | Roadmap, tras elegir proveedor y verificar precios |
| `AdaptadorCorreo` | `apps/cloud` | Proveedor transaccional a evaluar (Amazon SES, Resend, Postmark o Brevo; no se comparó costo ni entregabilidad en esta investigación) | Roadmap |
| `AdaptadorEnlaceWame` | `apps/web` | Sin pasarela: abre WhatsApp con texto prellenado y la docente toca enviar (hoy "WhatsApp sin pasarela") | Prototipo existente |
| `AdaptadorPdfLocal` | `apps/web` | HTML imprimible a PDF sin red (F10) | Roadmap |

**Flujo al recuperar la red (todo con cola persistente en Dexie, tabla `salida_mensajes`, excluida de la sincronización de eventos de aprendizaje):**

```
Viernes 17:00 o cierre de la última sesión
  └─ F10: compone ResumenSemanal (funciones puras sobre eventos locales)
      └─ F6: renderiza plantillas ─► salida_mensajes {estado: en_cola, vigenteHasta}
          └─ T-16: la docente aprueba el lote (un toque)
              └─ T-19: detecta red real (HEAD /sync/ping; navigator.onLine no basta)
                  └─ drenarSalida(): por cada mensaje vigente
                       POST /mensajes  (sobre firmado: HMAC de clase / ECDSA de la docente;
                                        clave de idempotencia; destino cifrado con TTL corto)
                         ├─ nube valida esquema y lista permitida, consentimiento y límite de envío
                         ├─ elige adaptador por canal; envía; devuelve acuse
                         └─ webhook del proveedor ─► estado guardado ─► vuelve en el próximo sync
                              como evento mensaje.estado ─► T-16 muestra el estado
```

- **Reintentos:** retroceso exponencial con tope de 5 intentos y 48 h; luego `fallido` y la docente ve el botón "Enviar yo por WhatsApp" (adaptador `wa.me`).
- **Vigencia:** un mensaje semanal vencido no se envía "tarde" como si fuera de esta semana; se fusiona en un resumen de dos semanas con las fechas explícitas.
- **Idempotencia:** dos sincronizaciones seguidas no duplican envíos.
- **Contactos:** el número o correo viaja cifrado en el sobre y la nube no lo conserva después del acuse (TTL); el `padron` no sale de la docente.
- **Baja:** la palabra BAJA por WhatsApp, o el enlace al pie del correo, crea el evento `consentimiento.baja`; el adaptador no vuelve a enviar y el estado en T-16 es `baja`.
- **Horario:** ventana 17:00 a 20:00 hora local; no domingos; sin envíos nocturnos.

**Alta, baja y ajustes por familia (T-00 y T-21 del lado de la docente; texto en el mensaje de F-01):** estado `pendiente | sí | no | baja`; canal; lengua; frecuencia; variante A o B. El alta se pide una vez, por escrito y en castellano o quechua con audio, junto con el consentimiento ya previsto en T-00; los informes **no** dependen del consentimiento de Guardián y viceversa.

### 1.7 Frentes, pantallas e historias de aceptación

| Frente | Qué hace |
|---|---|
| F10 | `ResumenSemanal`, `ResumenMensual` (modelos puros), supresión n ≥ 5, HTML imprimible/CSV |
| F6 | Compositor de plantillas (es/qu), bandeja de salida T-22, aprobación por lote en T-16, estados de entrega, variante B |
| F7 | `POST /mensajes`, adaptadores de WhatsApp y correo, límites de envío; PDF de servidor opcional |
| F2 | Tabla `salida_mensajes` y reglas de cola en el protocolo de sincronización |
| F9 | Textos revisados, bloques de audio fijos, preguntas para casa grabadas por exhibición |
| F8 | Disparador de `drenarSalida()` cuando el hub vuelve a tener red |
| F1 | Pantallas T-22 y el ajuste de familias; accesibilidad (§4) |

**Pantallas nuevas propuestas (IDs siguientes a los existentes):** T-22 *Bandeja de mensajes* (lote, vista previa, estados honestos), T-23 *Ajustes de informes* (cadencia, destinatarios, pausa), F-06 *Página de baja y preferencias* (< 100 KB), D-06 *Informe mensual* (vista previa y descarga).

**Aceptación (prototipo con adaptador simulado):** la docente recibe en el celular el borrador del viernes en modo avión; lo aprueba; al activar la red simulada el estado pasa de `en_cola` a `entregado`; con `rebote` simulado aparece el botón "Enviar yo por WhatsApp"; la vista previa de la familia nunca contiene nada de la lista de exclusión.

---

## 2. Ayuda entre pares: "Ayudante del museo"

### 2.1 Evidencia sobre tutoría entre pares y enseñanza recíproca

| Fuente | Qué dice | Límite |
|---|---|---|
| **EEF Teaching and Learning Toolkit — Peer tutoring** | Impacto alto con costo muy bajo; unos **+6 meses** de progreso en promedio (otras versiones del toolkit dicen +5); **+7 en secundaria**, +5 en primaria; los alumnos de menor rendimiento ganan algo más (+6); evidencia de 127 estudios, con un candado menos porque muchos no fueron evaluados de forma independiente; funciona mejor si se **apoya la calidad de la interacción** y se entrena a quienes ayudan ([EEF](https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/peer-tutoring)) | La página dio 403 al abrirla; las cifras son del resumen de búsqueda. Programas concretos no siguen el promedio: PALS-UK dio unos +2 meses; un ensayo de lectura emparejada en secundaria no mostró beneficio ([EEF PALS-UK](https://educationendowmentfoundation.org.uk/projects-and-evaluation/promising-programmes/pals-uk), [Paired Reading](https://educationendowmentfoundation.org.uk/projects-and-evaluation/projects/paired-reading)) |
| **Rosenshine y Meister (1994)**, enseñanza recíproca | Revisión de 16 estudios: mediana de tamaño del efecto **0,32** en pruebas estandarizadas y **0,88** en pruebas diseñadas por los investigadores ([resumen](https://formapex.com/barak-rosenshine/1069-reciprocal-teaching-a-review-of-the-research)) | Dos tercios del efecto parecen venir de pruebas hechas a medida; Rikuy no debe prometer 0,88 |
| **Topping (2005)**, "Trends in Peer Learning" | Marco de tutoría, aprendizaje cooperativo y evaluación entre pares; investigación sobre todo en escuelas ([Educational Psychology 25(6)](https://typeset.io/pdf/trends-in-peer-learning-101zpr6v7g.pdf)) | Solo el resumen se consultó |
| **Roscoe y Chi (2008)**; **Fiorella y Mayer (2013)** | Aprender enseñando incluye preparar, explicar y **responder las preguntas del que aprende**; enseñar sin interacción puede dar efecto nulo o negativo; la expectativa de tener que enseñar ya mejora el aprendizaje, aunque con réplicas dispares ([revisión en Educational Psychology Review, 2021](https://link.springer.com/10.1007/s10648-021-09643-4)) | Lectura de resúmenes secundarios; verificar los artículos originales |
| **Hattie (2009)**, tutoría entre pares ≈ 0,55 | Cifra de un recurso docente secundario ([flipeducation.ai](https://flipeducation.ai/teaching-wiki/peer-tutoring)) | **[No verificado]** contra el libro |
| **Evidencia que citó KoEduko en su código** | Revisión sistemática de tutoría estructurada en matemática de primaria (Alegre 2019); la conveniencia de una composición depende de la tarea (Fuchs 1998); un experimento aleatorio donde las parejas alto-bajo mejoraron la matemática de quienes tenían menor rendimiento (Wang 2023, parejas de pupitre en primaria de China); tres algoritmos de agrupamiento con datos reales de álgebra (Lechuga 2022). KoEduko anota con sus propios límites que **ninguno valida su puntuación multicriterio** (`src/features/matching/data/matchingEvidence.js`) | Estudios en otros contextos y edades |

**Conclusiones de diseño (inferencias propias):**

1. La ayuda debe ser **estructurada y de dos vías**: la guía del ayudante lo obliga a preguntar y a hacer que el otro explique con sus palabras (ese es el mecanismo de la enseñanza recíproca y de "responder preguntas" de Roscoe y Chi).
2. Quien ayuda debe **saber de verdad**: el criterio es la evidencia del Cerebro (nodo "razonado" con cita literal), no la popularidad ni la nota.
3. Los roles **rotan por concepto**: nadie es "el tutor" ni "el atrasado" de forma fija (estigma y desgaste).
4. La ayuda vale más en **secundaria y para quien va más lento** según EEF, que es justo el público de Rikuy; aun así se valida en el piloto, no se promete.

### 2.2 Qué se toma, qué se transforma y qué se rechaza

| Proyecto | Se toma | Se transforma | Se rechaza |
|---|---|---|---|
| **AulaQuipu** (`docs/superpowers/specs/2026-10-17-aulaquipu-design.md`) | Normalizar "no entiendo X" y "sé enseñar X" al **mismo tema**; saldo derivado de un libro contable; resumen al cierre de la ayuda; la lección de su limpieza de chat: **chat apagado por defecto para menores, mismo salón, filtro, bloqueo, límite de caracteres, sin enlaces ni teléfonos** (`odd/tasks/campus-chat-cleanup.md`) | El nudo se **confirma** (la docente o el grupo ayudado) y es **cooperativo**; el tema sale de los nodos del Cerebro y no de texto libre | Pagar con quipus por una sesión; tutores de **otros colegios**; videollamada en vivo; tutores de IA de pago; estrellas y reseñas (son un ranking); conversión a dinero |
| **KoEduko** (`README.md`, `src/features/matching/`, `docs/SESSIONS_AGENT.md`) | Perfiles **por habilidad**, no por persona global; umbral de ayudante y brecha mínima (`MIN_HELPER_SCORE = 0.75`, `MIN_SUPPORT_GAP = 0.25`); "evidencia insuficiente" no es cero; el sistema nunca califica, lo hace el docente; la IA propone y la regla decide | Emparejar **grupos** (Rikuy trabaja con un celular por grupo de 4 a 5) con el nodo "razonado" como señal; el algoritmo de Edmonds no hace falta para ≤ 10 grupos por clase: basta una asignación simple con la docente como árbitro. Se deja la **formación de grupos** al inicio de unidad como Roadmap (§2.7) | Bot en Google Meet con grabación y voz; perfiles de personalidad inferidos; sesiones remotas |

### 2.3 Flujo

```
GRUPO QUE PIDE            RIKUY / HUB                       GRUPO AYUDANTE                  DOCENTE
E-26 Pedir ayuda  ──►  crea PedidoAyuda               
 (concepto + qué            (cola del hub; sin hub:      
  necesita, chips)          tarjeta "levanta la mano")
                          elige 2 grupos elegibles    ──►  E-27 "Grupo X necesita ayuda
                          al azar entre los que tienen      con 'longitud → periodo'".
                          el nodo "razonado"                [Vamos] [Ahora no]
                                                             │ Vamos
                          muestra Guía del ayudante   ◄──────┘
                          (3 pasos) al ayudante        
                                  ┌── en persona, en la mesa del grupo que pide, 3 a 5 min ──┐
                                  │ 1 Pregunta qué ven en su dato                           │
                                  │ 2 Muestra cómo midieron, no la respuesta                │
                                  │ 3 Pide que lo digan con sus palabras                    │
                                  └──────────────────────────────────────────────────────────┘
 "¿Lo puedes decir con tus palabras?" ──► frase del grupo ──► juez normal (cita literal)
 [Nos ayudó] [Casi] [Aún no] (botón fijo)  
                          cierra PedidoAyuda          ──► AsientoQuipu "ayuda_a_otro_grupo"   ──► T-23 pendiente
                          nudo al grupo ayudante            (confirmado por [Nos ayudó] o por   de confirmar / revocar
                          nudo al quipu de la clase         la docente)
```

**Reglas del flujo:**

- **Rikuy primero, sin obligar:** si el grupo no vio ninguna pista, Rikuy ofrece la pista 1 con un toque para saltarla. La ayuda de pares no reemplaza la escalera de pistas.
- **Pedido cerrado, sin texto libre (v1):** concepto (los nodos de la exhibición) y necesidad entre opciones fijas: "que me lo expliquen con otras palabras", "que me muestren cómo lo midieron", "revisar mi dato".
- **Elegibilidad por evidencia:** grupos con un miembro cuyo nodo del concepto está en estado **razonado** (frase evaluada con cita) en el Cerebro; se elige al azar entre elegibles de otros grupos; si no hay elegibles, el pedido va a la docente. Ninguna pantalla muestra una lista ordenada de "mejores ayudantes".
- **Carga máxima:** un grupo no recibe más de 2 ofertas por hora ni más de 1 ayuda activa a la vez, para proteger su propio tiempo de aprender.
- **Sin respuesta en 3 minutos:** Rikuy ofrece otra pista y la tarjeta sube a la docente ("tu docente va para allá").
- **El pedido es anónimo para el resto de la clase:** los grupos elegibles ven el concepto y el emblema del grupo, no al integrante; la reacción "ayuda" de E-21 (Punto de encuentro) se extiende con ese chip de concepto.
- **Sin ayuda de IA entre grupos:** el tutor de reglas no responde por el ayudante.

### 2.4 Datos y contratos

```ts
// @rikuy/contracts (propuesto; cambio aditivo en el Sprint 0)
PedidoAyuda { id, grupoPideId, exhibicionId, pasoId, nodoId, necesidad: 'otras_palabras'|'como_medir'|'revisar_dato',
              estado: 'abierto'|'ofrecido'|'en_curso'|'cerrado'|'escalado'|'cancelado', ts }
OfertaAyuda { id, pedidoId, grupoAyudaId, estado: 'enviada'|'aceptada'|'rechazada'|'vencida' }
CierreAyuda { pedidoId, resultado: 'nos_ayudo'|'casi'|'aun_no', fraseGrupo?: citaLiteral, ts }
AsientoQuipu.motivo += 'ayuda_a_otro_grupo'   // referencia al CierreAyuda; evidencia enlazada
```

Eventos nuevos: `ayuda.pedida`, `ayuda.ofrecida`, `ayuda.aceptada`, `ayuda.cerrada`, `quipu.nudo.confirmado`, `quipu.nudo.revocado`. Viajan por la envoltura de eventos de §3.3 de la arquitectura y por QR cuando no hay hub.

### 2.5 El nudo del quipu

- **Va al grupo ayudante** (`AsientoQuipu` con motivo `ayuda_a_otro_grupo`) y **suma uno al quipu de la clase** ("el aula se ayudó"). El grupo que pidió no pierde nada y no queda marcado: pedir ayuda a tiempo es una conducta que se quiere promover (en los pitches de EIDOS y en el estudio Lumilo los alumnos piden poder pedir ayuda sin perder prestigio, ver CREDITOS §4b).
- **Confirmación doble y límites anticolusión:** se emite al pulsar [Nos ayudó] y se mantiene "por confirmar" hasta que la docente lo vea en T-23 si la regla de la clase es "docente confirma". Máximo 3 nudos de ayuda por grupo ayudante por día; solo uno por (grupo ayudante, grupo que pide, concepto) por semana; la docente puede revocar (corrección en el libro, no borrado).
- **Condición de calidad:** el nudo exige la **frase del grupo que pidió** evaluada por el juez con cita literal ("razonado" o "explorado" con cita); si el juez dice "no evaluable", se confirma solo con la docente.
- **Nombre del integrante:** el asiento guarda el avatar del integrante que ayudó para la visibilidad de la docente; no hay puntaje individual ni tabla de posiciones. Con alta de la familia (variante B del informe) puede aparecer "ayudó a un compañero".
- **Lo que desbloquea no cambia:** solo cosas colectivas y cosméticas, sin ventaja en exhibiciones.

### 2.6 Visibilidad de la docente

- **T-23 Tablero de ayudas** (nueva): pedidos abiertos, en curso y cerrados; concepto; qué grupo ayudó; confirmaciones pendientes; botones "yo ayudo", "revocar", "pausar el Ayudante" y "silenciar a un grupo". Sin hub, esta pantalla se alimenta con los eventos que llegan por QR (T-08).
- **Señal pedagógica:** los conceptos con más pedidos alimentan "Lo que les costó" (T-11), el mapa de calor (§3.2 función 2) y el resumen semanal de la tutora (§1.4.1). Es el mismo dato que ya genera el Cerebro, no un perfil de alumno.
- **Qué NO ve:** Guardián no alimenta el emparejamiento ni se muestra aquí; el tablero no ordena grupos por cantidad de ayudas.
- **Interruptor:** "Ayudante del museo" en T-07, **apagado por defecto**, con aviso en E-01 cuando se enciende.

### 2.7 Seguridad (lista de comprobación)

| Riesgo | Control |
|---|---|
| Contacto con desconocidos | No existen: solo grupos de la **misma clase**, que entra con el código de la docente; sin chat entre colegios en v1 |
| Chat libre | **No hay.** El pedido es un par de chips; la respuesta es un botón; las reacciones son un conjunto fijo y versionado (saludar, señalar, aplaudir, ayuda, gracias, ya entendí, ahora no) |
| Mensajes privados 1 a 1 | No existen; la ayuda es **en persona**, en la mesa del grupo, con la docente en el salón |
| Solo grupos | Los pedidos y ofertas son de grupo a grupo; el integrante se identifica con su avatar al firmar, no con nombre |
| Etiquetas de "fuerte" y "débil" | No se muestran; elegibilidad por concepto y rotativa |
| Bullying por pedidos ignorados o burlas | La docente ve los pedidos sin respuesta y las revocaciones; el pedido es anónimo para el resto; el tablero no tiene ranking de pedidos |
| Colusión por nudos | Doble confirmación, límites diarios y por pareja, revocación (§2.5) |
| Fuga de datos | El Ayudante usa solo el Cerebro por concepto; no usa Guardián ni emociones; no guarda audio ni texto libre |
| Abuso de la función | Interruptor de la docente, pausa por grupo, registro de auditoría de eventos |
| Menores y consentimiento | Datos de grupo, no sensibles; se agregan al consentimiento general de T-00. Si más adelante se permite texto libre, se aplicará el patrón de AulaQuipu (apagado por defecto, filtro en emisor y receptor, 140 caracteres, sin enlaces ni teléfonos) y se vuelve a revisar |

Antecedente de diseño de "chat seguro" para niños: el modo de menú cerrado de Club Penguin ("Ultimate Safe Chat"), donde no se puede escribir y solo se eligen frases aprobadas ([descripciones de terceros](https://gameyum.com/disney-club-penguin/104336-club-penguin-chat-options); no se leyó documentación oficial de Disney).

### 2.8 Sin hub y con hub

| Situación | Qué pasa |
|---|---|
| **Hub activo** | Presencia en tiempo real (`rt.*` de F8): pedido, oferta y cierre en vivo |
| **Sin hub** | El grupo ve "Levanta la mano; tu docente verá tu pedido" y se guarda el evento; la docente, con los eventos recibidos por QR, ve en T-06 una lista de **"hoy pueden ayudar en 'longitud → periodo': grupo Cóndores y grupo Wayra"** y ella hace de enrutadora. El Ayudante nunca bloquea la exhibición |

### 2.9 Formación de grupos al estilo KoEduko (Roadmap, no v1)

Sugerencia en T-00/T-06 para armar grupos al inicio de unidad: cada grupo con al menos un integrante "razonado" en cada concepto clave, usando solo evidencia del Cerebro por concepto y tratando "evidencia insuficiente" como desconocido (no cero). La docente acepta, cambia o ignora la propuesta; se rechaza cualquier rasgo social inferido (KoEduko lo marca como predictor excluido). Esfuerzo M a L; depende de que el Cerebro tenga datos entre sesiones.

### 2.10 Medición del piloto y riesgos

- **Medir:** pedidos resueltos, tiempo hasta el primer ayudante, estado del nodo del grupo que pidió en la sesión siguiente, uso de la escalera de pistas antes y después, tiempo de la docente, y la opinión de docentes y alumnos (cualitativa). Reportar sin atribuir causalidad (diseño sin grupo de control).
- **Riesgos:** el ayudante da la respuesta (mitigación: guía de tres pasos y juez con la frase del que pidió); los grupos fuertes se cansan (carga máxima y rotación); aula con un solo grupo que entiende (va a la docente); poco tiempo de clase (3 a 5 min con aviso suave).
- **Esfuerzo:** M para el prototipo (pedido, oferta por hub, cierre, nudo, T-23); la ruta sin hub es S.
- **Frentes:** F5 (E-26, E-27, Punto de encuentro, desbloqueos), F10 (`AsientoQuipu`, reglas del nudo), F6 (T-23, interruptor), F8 (mensajes `rt.*`), F4 (consulta del Cerebro y juez), F2 (eventos), F9 (textos, audios y guía en es/qu).

---

## 3. Mini-funciones de los ganadores de Hack4Edu

### 3.1 Fuentes de este capítulo

Notas de pitch internas ([innovación](D:/proyectos/PROYECTO_GLM/research_notes/Funciones%20Rikuy%20Lab%20ganadoras/pitches_innovacion.md), [sénior](D:/proyectos/PROYECTO_GLM/research_notes/Funciones%20Rikuy%20Lab%20ganadoras/pitches_senior.md)) e informe [Ganadores Hack4Edu y lecciones](D:/proyectos/PROYECTO_GLM/reports/Ganadores%20Hack4Edu%20y%20lecciones.md). Los pitches se vieron con muestreo de 20 a 40 s; lo que decían las diapositivas distingue "mostrado" de "afirmado". Podios oficiales: [ProFuturo V](https://profuturo.education/noticias/celebramos-la-v-edicion-de-hack4edu-un-exito-de-innovacion-educativa/) y [ProFuturo VI](https://profuturo.education/noticias/hack4edu-2025-un-impulso-al-uso-etico-y-social-de-la-ia-en-educacion/).

### 3.2 Funciones, una por una

Cada función indica: qué hizo el ganador, qué hace Rikuy, esfuerzo, frente dueño y crédito.

**Función 1 — Piedra de Rikuy personalizable (mascota de MyLEA)**
- *Ganador:* MyLEA (INNOVANI, UNIR; 1.º Innovación 2025) mostró una mascota virtual con nombre y tipo elegibles para motivar la finalización de tareas ([Final VI, 1:35 del pitch](https://www.youtube.com/watch?v=rHC13qfwR-c&t=4398s)).
- *Rikuy:* cada grupo **le pone nombre a su piedra** y elige cordón y marco entre opciones cosméticas desbloqueadas por el quipu de la clase. No hay hambre ni racha que se pierda (se evita la culpa por no entrar). La piedra **no reacciona a Guardián**: sus 4 expresiones se disparan solo por eventos de la app (regla de DESIGN.md §6 y ECOSISTEMA 2.4).
- *Esfuerzo:* S. *Frente:* F5 (avatar y cosméticos), con F10 para el desbloqueo. *Crédito:* MyLEA / INNOVANI, UNIR (Carmen Witsman García).

**Función 2 — Buzón de dudas y mapa de calor de temas (EIDOS)**
- *Ganador:* EIDOS (UNIE; 3.º Innovación 2025): el alumno pregunta a la IA, la pregunta se categoriza y el docente ve las dudas por tema y los temas por reforzar ([Final VI, 1:03:08](https://www.youtube.com/watch?v=rHC13qfwR-c&t=3788s)). La categorización y el tablero se vieron como maqueta; no hubo demostración en vivo.
- *Rikuy:* el botón "Tengo una duda" en cada exhibición elige un **concepto de la lista** (más una frase corta opcional) y lo envía como evento. La docente ve un **mapa de calor concepto por exhibición** en T-09/T-11 y en el resumen semanal. **Anonimato honesto:** en una clase de 10 a 15 la anonimia real es imposible; la pantalla lo dice y las celdas se muestran con 3 o más grupos. La duda de grupo cuenta como la de un alumno y no se guarda en el Cerebro con nombre. Se combina con los pedidos del Ayudante (§2).
- *Esfuerzo:* S con conceptos fijos; M si después se categoriza texto libre con LLM. *Frente:* F10 (mapa de calor en `reportes`), F4 (captura desde Rikuy). *Crédito:* EIDOS, UNIE (Marc Santibáñez, Marta Sánchez, Iván Evangelista, Pablo Vázquez) y MyLEA (sugerencias anónimas por asignatura).

**Función 3 — Nivel de acompañamiento y constructor de frases con pictogramas (Milo)**
- *Ganador:* Milo (LALOO-UMB; 2.º Innovación 2025) abre con una **puerta de nivel de comunicación** (con apoyo, verbal, fluida) que personaliza las seis actividades, más un comunicador con pictogramas ([Final VI, 7:34:06](https://www.youtube.com/watch?v=rHC13qfwR-c&t=27246s)).
- *Rikuy:* en E-00b el grupo elige "cómo queremos trabajar hoy": **con apoyo** (más pictogramas, audio activado, pistas más cortas), **normal** o **desafío** (una pista menos, más preguntas abiertas). La docente puede fijar un nivel por defecto. **No es un diagnóstico y no se guarda como etiqueta del alumno**, no entra al Cerebro ni a ningún informe. El **constructor de frases** permite armar la predicción y la conclusión tocando pictogramas (y se usa en los pedidos del Ayudante); ayuda a quienes escriben poco, a quienes hablan quechua y a quienes tienen dificultades de comunicación. No se copia el "tablero de emociones" de Milo: la capa emocional ya es el check-in voluntario de Guardián (ECOSISTEMA 2.14).
- *Esfuerzo:* S el nivel; M los pictogramas (el puerto `Pictogramas` de F7 ya existe en la arquitectura). *Frente:* F1 (UI y E-00b), F4 (densidad de pistas), F7 (pictogramas), F9 (revisión). *Crédito:* Milo, LALOO-UMB (Eduardo Salinas).

**Función 4 — Contexto del aula (campos regionales de TeachFlow)**
- *Ganador:* TeachFlow/RimAI (UNSA Arequipa; 3.º Sénior 2025) mostró un formulario real con región, zona urbana o rural, **festividades locales**, flora y fauna, usado para generar materiales ([Final VI, 5:03:57](https://www.youtube.com/watch?v=rHC13qfwR-c&t=5h3m57s)).
- *Rikuy:* un bloque **"Contexto del aula"** en T-00 (región, zona, lengua de la comunidad, festividades del año, cultivos y fauna, clima/estación, materiales caseros disponibles) que (a) alimenta el Creador en T-03, (b) elige ejemplos de los juegos del Patio, (c) personaliza el cierre escolar de T-01 y (d) pone una frase local en los informes ("falta poco para el Yaku Raymi"). Editable y sin datos personales.
- *Esfuerzo:* S. *Frente:* F6 (T-00), F7 (prompt del Creador), F9 (calendario regional y festividades). *Crédito:* TeachFlow/RimAI, UNSA Arequipa. Ya figura en CREDITOS §4; esto amplía el uso a informes.

**Función 5 — Narración audio-primero y "Dicta tu dato" (Dinomate)**
- *Ganador:* Dinomate (Edutech, UTP Panamá; 2.º Sénior 2024), tutor de matemática por voz para primer grado con discapacidad visual ([Final V, 6:57:48](https://www.youtube.com/watch?v=GSCGcqNkLHA&t=6h57m48s)).
- *Rikuy:* modo **audio-primero** (Rikuy lee la pregunta guía, las pistas y la tabla en voz alta), y **"Dicta tu dato"**: el alumno dice "diez coma tres" y el sistema lo escribe en la tabla, con teclado numérico grande con eco de audio como alternativa. El reconocimiento de voz del navegador puede usar la nube (aviso ya previsto en ECOSISTEMA 2.4); **sin ASR en quechua**, por eso el teclado con eco es el camino principal en quechua. El péndulo real ya es una actividad táctil; se agregan **pitidos y vibración** cada oscilación (§4.1).
- *Esfuerzo:* M. *Frente:* F3 (voz y sensores), F1 (accesibilidad). *Crédito:* Dinomate / Edutech, UTP Panamá (Emmanuel Herrera, Arland Barera, José Camarena).

**Función 6 — Barrido a un toque (BlinkMouse)**
- *Ganador:* VisualUD / BlinkMouse (U. Distrital, Colombia; 3.º Innovadora 2024): control del puntero por parpadeo con cámara web para personas con discapacidad motora severa ([Final V, 6:13:33](https://www.youtube.com/watch?v=GSCGcqNkLHA&t=22413s)).
- *Rikuy:* **modo de barrido con un solo toque o tecla**: el foco recorre los controles y un toque selecciona; sirve para quien no puede usar gestos ni pantalla táctil con precisión. **El parpadeo por cámara no entra en v1:** la cámara de Rikuy solo ve la mano y el reconocimiento facial está restringido por ECOSISTEMA 2.14 (el Nivel 2 con rostro está apagado y bloqueado en la UE). Si se explora, será un módulo aislado con consentimiento propio, solo investigación.
- *Esfuerzo:* M (barrido), L el parpadeo (fuera de alcance). *Frente:* F1. *Crédito:* VisualUD / BlinkMouse, U. Distrital F. J. de Caldas (mentor Roberto Ferro Escobar).

**Función 7 — Señas del museo (LumiSign)**
- *Ganador:* LumiSign (UPSA; 1.º Sénior 2025): traducción bidireccional entre lengua de señas, voz y texto; pasó de web a app móvil "para poder funcionar sin wifi" según [La Razón](https://www.larazon.es/economia/lumisign-app-que-rompe-barrera-voz-lengua-signos_202512196942d924ea66eb7353161efb.html) (cita tomada del informe interno y de CREDITOS §4; **no se pudo reabrir** en esta investigación). Pitch: [Final VI, 7:42:04](https://www.youtube.com/watch?v=rHC13qfwR-c&t=7h42m4s).
- *Rikuy:* un **glosario en lengua de señas peruana** de 12 a 20 términos del museo (péndulo, longitud, tiempo, medir, predecir, dato, comparar…) como videos cortos en bucle en cada placa; ver hoja de ruta en §4.4. **No** se promete traducción en vivo ni reconocimiento de señas.
- *Esfuerzo:* M (contenido con personas sordas, no código). *Frente:* F9 (contenido y validación), F3 (el visor de video ya existe como formato). *Crédito:* LumiSign, UPSA (Lucía de la Vega Encinas y equipo); además Hear4All (USAL) y Signspa (UTP Panamá) en la misma línea ([ProFuturo II](https://profuturo.education/en/news/award-winning-projects-hack4edu-2021/)).

**Función 8 — Postal sonora entre aulas (Nómada)**
- *Ganador:* Nómada (UTP Panamá; Impacto Social 2025): hacer del "sin internet" el mecanismo, un robot que **lleva historias y sonidos** de escuela en escuela y sincroniza cuando hay red ([Final VI, 4:46:39](https://www.youtube.com/watch?v=rHC13qfwR-c&t=4h46m39s)). Se mostró un prototipo de software; el robot físico fue solo renders.
- *Rikuy:* **"Postal sonora"**: cada grupo graba una nota de voz de 30 s con su conclusión (en la lengua que quiera) que la docente revisa y que viaja con el paquete exportable `.rikuy.json` o por el hub a otra aula ("Museo hermano"). Ayuda a niños que hablan mejor de lo que escriben y a quienes hablan quechua. **Sin rostros, sin nombres, con consentimiento y revisión de la docente.** El audio no cabe en el relevo QR; viaja por hub, USB o archivo.
- *Esfuerzo:* M. *Frente:* F2 (exportar e importar), F5 (sala "Museo hermano"), F9 (formato y consentimiento de audio). *Crédito:* Nómada / AlFrAI, UTP Panamá.

**Función 9 — Curador de sala (PixelMAI)**
- *Ganador:* PixelMAI (UT Nezahualcóyotl; 1.º Innovadora 2024): **profesor de IA dentro del mundo** de Minecraft con búsquedas y retroalimentación en tiempo real ([Final V, 6:19:39](https://www.youtube.com/watch?v=GSCGcqNkLHA&t=22779s)); y Hack4Minecraft (USAL; 1.º Sénior 2024) con actividades que se desbloquean al validarse otras.
- *Rikuy:* un **curador** en cada sala (un personaje del mapa) que da la **pregunta de la sala** y abre la puerta cuando el grupo la responde, usando el director de reglas ya previsto. No es un segundo tutor: pasa por el mismo `rulesAgent` y las mismas guardas anti-respuesta.
- *Esfuerzo:* S. *Frente:* F5 (personaje y puertas), F4 (reglas). *Crédito:* PixelMAI (UT Nezahualcóyotl) y AulaQuipu (patrón director).

**Función 10 — Ensayo de indagación (simulador de exámenes de MyLEA)**
- *Ganador:* MyLEA: configuración de materia, número de preguntas, dificultad y tiempo, corregida "como si fuera el docente" ([Final VI, 3:47 del pitch](https://www.youtube.com/watch?v=rHC13qfwR-c&t=4398s)); en el pitch fue una maqueta.
- *Rikuy:* un **ensayo de 10 minutos** de 5 ítems de la exhibición (el formato quiz de ECOSISTEMA 2.2) sin nota: devuelve qué conceptos revisar y sugiere una exhibición. La clave queda fuera del dispositivo del alumno y se corrige en el hub.
- *Esfuerzo:* M. *Frente:* F9 (ítems) y F3 (visor de quiz). *Crédito:* MyLEA / INNOVANI, UNIR.

### 3.3 Funciones descartadas y por qué

| Idea ganadora | Por qué no |
|---|---|
| HUANUCO/SENATI (lectura de rostros) | Guardián llega al objetivo sin rostro ni cuerpo (ECOSISTEMA 2.14) |
| Milo: tablero de emociones | La capa emocional es el check-in voluntario de Guardián; duplicarla crea una segunda vía no consentida |
| Ubuntu Project: "inteligencia sensorial" con diario corporal | Mismo motivo; además modelos locales y cifrado no se demostraron en su pitch |
| E-WASTE / robot físico, Nómada (robot) | Hardware fuera del alcance; se rescata el mecanismo (Postal sonora) |
| LumiSign: reconocimiento en vivo de señas | Sin evidencia de precisión en aulas rurales; vigilancia por cámara a menores |

### 3.4 Tabla de decisión

| # | Función | Ganador (crédito) | Esfuerzo | Frente |
|---|---|---|---|---|
| 1 | Piedra de Rikuy personalizable | MyLEA (INNOVANI, UNIR) | S | F5 (+F10) |
| 2 | Buzón de dudas y mapa de calor | EIDOS (UNIE) | S | F10 (+F4) |
| 3 | Nivel de acompañamiento y pictogramas | Milo (LALOO-UMB) | S / M | F1 (+F4, F7, F9) |
| 4 | Contexto del aula | TeachFlow/RimAI (UNSA) | S | F6 (+F7, F9) |
| 5 | Audio-primero y Dicta tu dato | Dinomate (Edutech, UTP) | M | F3 (+F1) |
| 6 | Barrido a un toque | BlinkMouse (U. Distrital) | M | F1 |
| 7 | Señas del museo | LumiSign (UPSA) | M | F9 (+F3) |
| 8 | Postal sonora | Nómada (UTP) | M | F2 (+F5, F9) |
| 9 | Curador de sala | PixelMAI (UTN) | S | F5 (+F4) |
| 10 | Ensayo de indagación | MyLEA (INNOVANI) | M | F9 (+F3) |

**Para el pitch:** la regla de los ganadores es una sola historia con una sola pantalla de inicio; estas funciones se muestran como **pestañas o tarjetas del mismo Museo**, no como un menú de módulos. La que más cuesta de verificar en el momento es la que se ve en 5 segundos: la piedra con nombre del grupo, el mapa de calor y la reacción "ayuda" con concepto.

---

## 4. Accesibilidad de audio

> Objetivo: que lo esencial de cada exhibición pueda **oírse**, **leerse con un lector de pantalla** y **verse sin sonido**, en castellano y quechua. Meta de conformidad: WCAG 2.2 nivel AA (ya es puerta de F1: axe sin violaciones serias). Los criterios de medios temporales (guía 1.2) no cambian entre WCAG 2.1 y 2.2: alternativa de transcripción para audio solo (1.2.1, A), subtítulos para video grabado (1.2.2, A) y audiodescripción (1.2.5, AA) ([resumen](https://www.getstark.co/wcag-explained/perceivable/time-based-media/), [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/UNDERSTANDING/)). El marco legal peruano relevante es la Ley 29973 (acceso y libertad de elección entre formatos y medios) y la Ley 29535 (lengua de señas peruana oficial, reglamento DS 006-2017-MIMP) ([LP Derecho](https://lpderecho.pe/ley-general-persona-discapacidad-ley-29973-actualizada), [Andina](https://andina.pe/ingles/noticia-ministerio-educacion-ofrece-servicio-interprete-lengua-senas-peruana-624145.aspx)); sin análisis legal.

### 4.1 Narración (castellano)

- **Texto siempre presente, audio siempre opcional.** Cada bloque de la exhibición (pregunta guía, pistas, conclusión, tabla) tiene un botón "Escuchar" y **sigue la lectura con resaltado**; velocidades 0,75x, 1x, 1,25x.
- **Orden de preferencia de la voz:** (1) audio **pregrabado** de la exhibición (`audios por lengua` del `Exhibit`); (2) voz del dispositivo (`speechSynthesis`), solo si la voz es local. En Chrome para Android, `getVoices()` llega después de cargar la página (hay que esperar el evento `voiceschanged`), puede mostrar idiomas sin voz instalada y solo las voces con `localService` funcionan sin red ([Readium: SpeechSynthesis en navegadores](https://readium.org/speech/docs/WebSpeech.html)). Probar en los celulares del kit y, si no hay voz local, usar el pregrabado o mostrar solo texto con aviso, sin bloquear.
- **Aviso de nube** cuando la voz del navegador pueda salir a internet (ya previsto en ECOSISTEMA 2.4).
- **Lectura de datos:** Rikuy lee la tabla de mediciones fila por fila y el resultado de comparar con el modelo ("tu dato está cerca de la curva, error de 4 por ciento").
- **Audio para el cronómetro:** pitido por cada oscilación y vibración (`navigator.vibrate` donde exista; sin ella, solo sonido) para quien no ve el reloj; botón grande de inicio y parada.
- **Video:** subtítulos siempre; la narración describe lo que se ve (audiodescripción incluida en el guion) para cumplir 1.2.5 sin una segunda pista.
- **Sordera y baja audición:** todo mensaje de audio tiene su equivalente visual (texto, subtítulo, pictogramas, vibración); ningún paso exige oír.

### 4.2 Lector de pantalla (TalkBack y teclado)

- **Semántica real:** HTML con encabezados, botones y listas; los controles táctiles ≥ 48 px (ya pedido en el IA §1).
- **Museo Canvas:** el canvas no es accesible por sí mismo. Se entrega el **modo lista accesible** ya previsto en F5 (toda puerta y exhibición alcanzable por teclado y por lista), con el mismo orden que el mapa y un anuncio al cambiar de sala.
- **Holograma y gestos:** el holograma es un `role="img"` con descripción textual que se actualiza con el estado ("el péndulo mide 50 cm y oscila"); cada gesto tiene su botón (giro, acercar, soltar, pausa).
- **Regiones vivas (`aria-live`) con mesura:** "medición guardada", "pista 2 disponible", "el grupo X pide ayuda con longitud a periodo". No anunciar cada tic del cronómetro.
- **Evitar la doble voz:** ajuste en Yo > Lengua y audio (E-18): "Usar solo mi lector de pantalla" apaga la voz de Rikuy. No hay forma confiable de detectar TalkBack desde el navegador, así que es una opción manual.
- **Pruebas:** axe en CI (puerta de F1), guion manual con TalkBack y teclado en 3 celulares gama baja, y una sesión con una docente de educación especial o de un CEBE **[a coordinar]**.

### 4.3 Audio en quechua (grabado, nunca sintético)

- **Principio ya fijado:** quechua solo con voces reales de hablantes nativos para un repertorio cerrado; sin TTS quechua (modelos no validados y algunos con licencia no comercial). No se encontró una voz quechua confirmada en la API de voz del navegador; **[no verificado]**, probar en dispositivos.
- **Pipeline (F9, ya definido):** guion, grabación nativa, `loudnorm`, Opus, hash, manifiesto con consentimiento. Se agrega:
  - **Variedad declarada** (por ejemplo quechua sureño, Cusco-Collao o Ayacucho-Chanka, según el piloto) y **revisión por un segundo hablante** antes de pasar de `grabado` a `revisado`.
  - **Consentimiento de voz** por escrito (uso, plazo, derecho a retirarla) y pago justo.
  - **Números compuestos:** grabar los dígitos, decenas, "coma", "segundos", "centímetros" y componer las lecturas del cronómetro y de la tabla sin voz sintética.
- **Repertorio por prioridad:** (1) navegación y avisos del sistema; (2) Rikuy: saludo, felicitación, "no pude hacerlo", ofrecimiento de pista; (3) por exhibición: pregunta guía, 3 pistas, pregunta para casa (reutilizada en el informe a la familia, §1.4.2); (4) números y unidades; (5) bloques fijos del informe semanal.
- **Presupuesto estimado** (cálculo propio): Opus mono a 16 kbps ≈ 2 KB por segundo; 300 clips de 6 s ≈ 3,6 MB. La puerta de F9 de 4 MB por práctica alcanza para el repertorio por exhibición, pero no para toda la biblioteca de números y avisos del sistema; esos van en un paquete aparte compartido.
- **Estado visible:** cada clip lleva `estado` (`borrador`, `grabado`, `revisado`); en pantalla, "Grabado por hablante (variedad)" o "sin audio revisado" y caída a castellano; nunca se muestra como revisado un borrador.
- **WhatsApp:** los audios del informe se envían como notas de voz Opus; que la API acepte ese formato exacto **[no verificado]**; se prueba en el prototipo antes de comprometer el diseño.

### 4.4 Hoja de ruta de lengua de señas

La lengua de señas peruana (LSP) es oficial desde la Ley 29535 (2010) y su reglamento es de 2017; el Minedu ofrece intérpretes y trabaja con CONADIS en su formación ([Andina](https://andina.pe/agencia/noticia-minedu-y-conadis-unen-esfuerzos-para-fortalecer-formacion-interpretes-lengua-sena-1046891.aspx)). Rikuy no tiene hoy ninguna función en LSP.

| Fase | Qué se entrega | Cómo se valida | Esfuerzo |
|---|---|---|---|
| **0 (ahora)** | Todo con subtítulos y descripciones; ningún paso depende del sonido; pictogramas | Lista de comprobación de §4.1 | S |
| **1** | **Glosario LSP** de 12 a 20 términos como videos en bucle de 5 a 10 s (fondo liso, intérprete sordo), sin conexión | Grabado y revisado por personas sordas usuarias de LSP y una asociación local; consentimiento de imagen; **no** se usan videos de otros países | M |
| **2** | **Exhibición bilingüe**: pregunta guía y pistas de una exhibición en LSP, junto al texto y al audio | Prueba con estudiantes sordos y su docente; ajuste del tamaño de los videos al presupuesto de 4 MB | M |
| **3 (investigación)** | Explorar reconocimiento de señas o avatares con LumiSign/UPSA como referencia; solo en entorno controlado, sin cámara sobre menores en clase | Convenio, evaluación independiente, revisión de privacidad | L |

- **Referencias de ganadores:** LumiSign (UPSA, 1.º Sénior 2025), Hear4All (USAL, 1.º Innovadora 2021, avatar de lengua de señas) y Signspa (UTP, prototipo web de traducción de señas panameñas) ([ProFuturo II](https://profuturo.education/en/news/award-winning-projects-hack4edu-2021/), [nota de prensa de Telefónica](https://www.telefonica.es/es/wp-content/uploads/sites/10/2021/12/Hack4Edu-II-Nota-prensa-ganadores.pdf)).
- **Técnica (si se llega a la fase 3):** la parte de landmarks de manos puede ejecutarse en el navegador, y para uso sin conexión hay que **empaquetar** los archivos `.wasm` y `.task` en lugar de cargarlos desde una CDN, como ya anota ECOSISTEMA 2.3 sobre MediaPipe ([ejemplo de lector de señas en el navegador](https://dev.to/dev48v/i-built-a-webcam-sign-language-reader-in-the-browser-no-cloud-11hg); la precisión del reconocimiento no se evaluó).
- **Riesgo principal:** hacer LSP sin personas sordas en el equipo. La fase 1 no se publica sin ellas.

### 4.5 Frentes y esfuerzo de la parte 4

| Entrega | Frente | Esfuerzo |
|---|---|---|
| Botón "Escuchar", resaltado, velocidades, aviso de nube | F3 (voz), F1 (UI) | S |
| Pitido y vibración del cronómetro; lectura de tabla; Dicta tu dato | F3 | M |
| Modo lista del Museo, `aria-live`, "solo mi lector" | F1, F5 | M |
| Repertorio de audio quechua, números compuestos, estado de revisión | F9 | M (contenido) |
| Glosario LSP (fase 1) | F9, F3 | M |
| Pruebas con TalkBack y usuarios | F1 | S |

---

## 5. Mapa de dependencias y pantallas nuevas

**Pantallas nuevas propuestas:** T-22 Bandeja de mensajes · T-23 Tablero de ayudas · T-24 Ajustes de informes · E-26 Pedir ayuda · E-27 Ayudar (guía del ayudante) · E-28 Tengo una duda · F-06 Preferencias y baja · D-06 Informe mensual.

**Cambios de contrato (PR al Sprint 0, aditivos):** `MensajeSaliente`, `Plantilla`, `PuertoEntrega`, `EstadoEntrega`, `PedidoAyuda`, `OfertaAyuda`, `CierreAyuda`, `AsientoQuipu.motivo = 'ayuda_a_otro_grupo'`, `Consentimiento.informes`, `Clase.contexto`.

**Reglas de dependencia nuevas:** `mensajeria → reportes, core, lenguas`; `mensajeria ✗→ senales`; `campus (ayudante) → cerebro (solo lectura de estado de nodo), quipu`; `apps/cloud` aloja adaptadores de entrega; las llaves de proveedor solo existen en `apps/cloud`.

**Orden sugerido:** (1) Contexto del aula, Buzón de dudas, Curador y Piedra (S, visibles en el pitch) · (2) Informe semanal con adaptador simulado y bandeja T-22 · (3) Ayudante mínimo con tablero T-23 · (4) Audio-primero y Nivel de acompañamiento · (5) Informe mensual PDF · (6) contenido en quechua y LSP según llegue la grabación.

## 6. Límites de esta investigación y decisiones abiertas

**Qué no se pudo verificar:**
- Los centros de ayuda de Seesaw, Khan Academy, Remind, ClassDojo y la página de EEF respondieron 403 al abrirlos; lo dicho de ellos viene de resúmenes de búsqueda, no de la página (marcado en §1.1 y §2.1).
- No hay evidencia oficial de informes a familias de Kahoot!, Quizlet (correo), BYJU'S, Platzi, Crehana, Descomplica, Arco/Eleva, Lumni, Aprende Institute, Qué Aprendes ni ClassPoint. Que no existan no está demostrado.
- Duolingo for Schools: la descontinuación tras julio de 2027 viene de un solo medio.
- Cifras del INEI (internet rural), Hattie (0,55), la compatibilidad exacta de WhatsApp con notas de voz Opus y audio en encabezados de plantilla, el precio de las plantillas de WhatsApp y la existencia de voces quechuas en Android.
- Del lado de los ganadores: el muestreo de los pitches fue de 20 a 40 s; los pitches de MyLEA, EIDOS y Milo mostraron maquetas, no flujos reales; Ubuntu Project y TutorIA no se localizaron en el stream.
- Todo el análisis legal es de no abogados (Ley 29733 y DS 016-2024-JUS, Ley 28493, Ley 29973, Ley 29535).

**Decisiones abiertas (para el equipo):**
1. ¿La docente aprueba siempre el lote del apoderado, o solo la variante B? (Propuesta: siempre en v1.)
2. ¿Qué proveedor de correo y de WhatsApp? Comparar costo, entregabilidad y reglas de plantillas antes de elegir.
3. ¿El Ayudante exige la confirmación de la docente para cada nudo, o solo cuando el juez dice "no evaluable"? (Propuesta: ambas reglas como ajuste de la clase.)
4. ¿Qué variedad de quechua grabar primero?
5. ¿Con quién se coordina la validación de LSP (asociación de sordos local, CEBE, Minedu)?

## 7. Fuentes consultadas

**Productos y ayuda oficial:** [Google Classroom: resúmenes por correo](https://support.google.com/edu/classroom/answer/6388136?hl=en) · [Microsoft Teams: resúmenes semanales](https://support.microsoft.com/en-US/Education/send-weekly-assignment-summaries-to-parents-and-guardians) · [Brightwheel: informes diarios](https://intercom.help/brightwheel/en/articles/1380998-send-daily-reports) · [ClassDojo Translate](https://blog.classdojo.com/introducing-classdojo-translate/) · [Seesaw: notificaciones de familias](https://help.seesaw.me/hc/en-us/articles/206528005) · [Khan Academy: correo semanal](https://support.khanacademy.org/hc/fr/community/posts/4404538388237-Update-Temporary-change-to-weekly-Teacher-and-Parent-Report-email-delivery) · [Remind: traducción](https://help.remind.com/hc/en-us/articles/360018283580) · [Quizlet: Class Progress](https://help.quizlet.com/hc/en-us/articles/360030512432-Using-Class-Progress) · [Duolingo for Schools (2015)](https://appadvice.com/appnn/2015/01/duolingo-for-schools-lets-teachers-easily-track-students-language-learning-progress) · [Meu Arco](https://apps.apple.com/app/id6450907090).

**Evidencia educativa:** [EEF: tutoría entre pares](https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/peer-tutoring) · [EEF: apéndice técnico](https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/peer-tutoring/technical-appendix) · [Rosenshine y Meister 1994 (resumen)](https://formapex.com/barak-rosenshine/1069-reciprocal-teaching-a-review-of-the-research) · [Topping 2005](https://typeset.io/pdf/trends-in-peer-learning-101zpr6v7g.pdf) · [Aprender enseñando, revisión 2021](https://link.springer.com/10.1007/s10648-021-09643-4) · [Alegre 2019](https://doi.org/10.1080/00131911.2018.1474176) · [Lechuga 2022](https://doi.org/10.1007/s40593-022-00309-y) · [Wang 2023](https://doi.org/10.1257/pol.20200563) (los tres últimos, tal como los cita KoEduko).

**Marco legal y técnico:** [OSIPTEL: Ley 28493](https://www.osiptel.gob.pe/media/0hyfzp1a/ley-28493-correo-electronico-comercial-no-solicitado-spam-osiptel.pdf) · [COMEXPERU: menores y datos](https://comexperu.org.pe/upload/articles/proyectos-de-ley/carta-mujer_menores-de-edad-digital_feb2025-1.pdf) · [Ley 29973](https://lpderecho.pe/ley-general-persona-discapacidad-ley-29973-actualizada) · [Minedu e intérpretes de LSP](https://andina.pe/ingles/noticia-ministerio-educacion-ofrece-servicio-interprete-lengua-senas-peruana-624145.aspx) · [WCAG 2.2: Understanding](https://www.w3.org/WAI/WCAG22/UNDERSTANDING/) · [SpeechSynthesis en navegadores (Readium)](https://readium.org/speech/docs/WebSpeech.html) · [WhatsApp: ventana de 24 h (Bird)](https://bird.com/docs/knowledge-base/whatsapp/customer-service-window).

**Ganadores de Hack4Edu:** [ProFuturo V](https://profuturo.education/noticias/celebramos-la-v-edicion-de-hack4edu-un-exito-de-innovacion-educativa/) · [ProFuturo VI](https://profuturo.education/noticias/hack4edu-2025-un-impulso-al-uso-etico-y-social-de-la-ia-en-educacion/) · [Final V](https://www.youtube.com/watch?v=GSCGcqNkLHA) · [Final VI](https://www.youtube.com/watch?v=rHC13qfwR-c) · [ProFuturo II](https://profuturo.education/en/news/award-winning-projects-hack4edu-2021/) · notas internas en `D:/proyectos/PROYECTO_GLM/research_notes/Funciones Rikuy Lab ganadoras/` y `D:/proyectos/PROYECTO_GLM/reports/`.

**Proyectos pares (clones locales, sin LICENSE; solo patrón):** `D:/proyectos/hacktheandes-projects/paoloose__aulaquipu/` (`docs/superpowers/specs/2026-10-17-aulaquipu-design.md`, `odd/tasks/campus-chat-cleanup.md`) · `D:/proyectos/hacktheandes-projects/Favio-coder__Koeduko-hackandes/` (`README.md`, `src/features/matching/`, `docs/SESSIONS_AGENT.md`).
