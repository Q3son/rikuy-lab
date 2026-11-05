# Rikuy — Arquitectura de información

> Para diseño y frontend. IDs estables: `T-` docente, `E-` estudiante/grupo, `F-` familia, `D-` director/UGEL, `A-` administración de contenido. Módulos en [ECOSISTEMA.md](ECOSISTEMA.md).
> Estado: **Demo** (funciona en el pitch) · **Prototipo** (pantalla real con etiqueta "Prototipo") · **Roadmap** (maqueta o diapositiva).
> Reconciliado el 5 nov 2026 con los wireframes ([estudiante](wireframes/estudiante/notes.md) y [docente](wireframes/docente/notes.md)): barras inferiores de 5 pestañas, IDs nuevos E-21 a E-25, E-00d/E-00e y F-05, **Rikuy Guardián** (reemplaza a "Señales de aprendizaje") y mascota nueva (piedra de río con un ojo; ver [DESIGN.md](DESIGN.md) §6).

## 1. Dispositivos y roles

| Rol | Dispositivo | Contexto | Regla de diseño |
|---|---|---|---|
| Docente (Rosa) | Su Android de gama media-baja; es también el **hub** | De pie, interrupciones, 45 min | Una acción principal por pantalla; todo a un pulgar; nada que escribir en clase |
| Grupo (Yeni + 4) | Un celular compartido por grupo | Cinco personas, ruido, luz variable para la cámara | Texto grande, botones ≥ 48 px, audio opcional, avatares del grupo siempre visibles, alternativa táctil a cada gesto |
| Niño de primaria (Inti) | Celular de la familia | Casa o multigrado | Sin lectura obligatoria: íconos, audio grabado en quechua |
| Apoderada (Hilda) | Celular básico con WhatsApp | Fuera de la app | No instala nada: mensaje, audio, página ligera o papel |
| Director / UGEL (Julio) | Laptop con internet | Oficina, semanal | Agregados por competencia; exportable; sin alumnos identificables |
| Curador / revisor de lengua | Laptop | Antes del despliegue | Aprobación con trazabilidad |

## 2. Mapa del sitio por rol

### 2.1 Docente

```
T-00 Bienvenida / crear clase
└─ Barra inferior fija: HOY · CLASE · EVIDENCIA · REPORTES · AJUSTES   ← encabezado fijo: clase · estado del hub/red · interruptores rápidos
   ├─ HOY → T-01 Inicio "Mi clase de hoy"  (stepper de 4 tramos: Preparar · Museo · Cierre · Para llevar; cada tramo abre su pantalla)
   ├─ CLASE  (control segmentado: Preparar · Museo · Para llevar)
   │   ├─ Preparar: T-02 Biblioteca · T-03 Creador: desempeño · T-04 Creador: borrador + verificador · T-05 Revisar y aprobar
   │   ├─ Museo: T-06 Visita en vivo (código y QR; mapa del museo con los grupos; Guardián: vista del curso y "para acercarse")
   │   │         · T-07 Supervisión (salas y vitrinas, tutor, gestos, IA en línea, Guardián) · T-18 Proyectar holograma / convocar al Auditorio
   │   └─ Para llevar: T-14 Compartir exhibición (QR · WhatsApp · imprimir) · T-15 Hoja A4 · T-16 Mensaje a familias
   ├─ EVIDENCIA  (= tramo Cierre): T-08 Recibir (QR o hub) · T-09 Evidencias por alumno y grupo · T-10 Ficha del alumno (Cerebro) · T-11 Resumen de clase en tres partes
   ├─ REPORTES: T-12 Malla curricular · T-13 Reporte por competencia · T-17 Registro auxiliar (exportar)
   └─ AJUSTES: T-19 Hub y sincronización · T-20 Ajustes, lenguas y privacidad · T-21 Consentimientos y Rikuy Guardián
```

### 2.2 Estudiante (celular del grupo)

```
E-00 Entrar  (a código/QR · b grupo y avatares · c cámara de manos · d aviso de Guardián · e permiso de la familia · f código no encontrado)
└─ E-01 Vestíbulo del Museo Rikuy (mapa)   ← barra inferior (oculta solo en E-00): MUSEO · LAB · CEREBRO · QUIPU · YO
   ├─ MUSEO: E-01 Vestíbulo · E-02 Sala (Física, Biología, Química, Tierra y ambiente, Taller) → E-03 Placa · E-13 Patio de juegos → reto
   │         · E-21 Punto de encuentro (presencia, sin chat libre) · E-04 Auditorio (reunión convocada por la docente)
   ├─ LAB: E-22 Lab (inicio: continuar y datos propios) → Exhibición
   │         E-05 Vitrina holográfica (gestos; selector de formatos) · E-06 Pregunta guía y materiales · E-07 Predicción (obligatoria antes de medir)
   │         · E-08 Rikuy (capa del tutor, voz es/qu) · E-09 Medición propia · E-10 Tabla de datos · E-11 Comparar con el modelo · E-12 Conclusión
   ├─ CEREBRO: E-19 Mi Cerebro Rikuy (mapa de conocimiento real) · E-14 Cuaderno de campo (dentro; incluye "lo que Rikuy recuerda de mí")
   ├─ QUIPU: E-15 Quipu de logros del grupo y de la clase
   └─ YO: E-23 Yo → E-17 Mi QR (entrega animada) · E-18 Lengua y audio (castellano · quechua · …) · E-20b Guardián: ajustes y pausa
              · E-24 Red y pendientes · E-16 Recibir "Para llevar"
   Capas que aparecen donde hace falta: E-20 Rikuy Guardián (indicador y oferta de ayuda; solo si hay consentimiento) · E-20c check-in momentáneo
              · E-20d "necesito hablar con alguien" · E-25 Error real
```

### 2.3 Familia (fuera de la app)

```
F-01 Mensaje de WhatsApp (texto + audio grabado en la lengua de casa + enlace/QR)
└─ F-02 Página ligera "Para llevar" (sin instalar, < 200 KB)
   └─ F-04 "Lo hicimos" (Roadmap)
F-03 Hoja A4 impresa con pictogramas
F-05 Mensaje semanal a la familia (WhatsApp: texto corto + audio + enlace; sin notas, comparaciones ni datos de Guardián)
```

### 2.4 Director / UGEL / financiador

```
D-01 Tablero de la IE (director): cobertura de competencias por sección
D-02 Tablero territorial (UGEL): mapa, avance por competencia, conceptos difíciles, continuidad, brechas
   └─ D-03 Detalle de IE
D-04 Exportar informe (PDF/CSV)
D-05 Medición de impacto (cohortes pre/post)
```

### 2.5 Administración de contenido

```
A-01 Biblioteca curada de exhibiciones · A-02 Revisión lingüística y grabaciones · A-03 Colegios y hubs · A-04 Auditoría de IA
```

## 3. Inventario de pantallas

### 3.1 Docente

| ID | Nombre | Propósito | Contenido clave | Acción principal | Módulo | Estado |
|---|---|---|---|---|---|---|
| T-00 | Bienvenida | Crear clase sin cuenta en la nube | Grado, secciones, lengua de la comunidad, consentimiento para familias | Crear clase (código `CYT-2B-482`) | Panel | Demo |
| **T-01** | **Inicio "Mi clase de hoy"** | Pantalla única del día | Exhibición del día; **stepper de los 4 tramos** (Preparar · Museo · Cierre · Para llevar) sobre la barra de 5 pestañas (Hoy · Clase · Evidencia · Reportes · Ajustes); chip del hub; aviso de cierre escolar por región | Ir al tramo que toca | Panel | **Demo** |
| T-02 | Biblioteca | Elegir exhibición lista | Tarjetas por sala y competencia; filtros "materiales caseros", "con audio en quechua"; sello "cita verificada" | Usar | Creador | Demo (péndulo, lactasa, respiración) |
| T-03 | Creador: desempeño | Anclar al CNEB | Buscador de desempeños; texto literal; contexto local | Generar | Creador | Prototipo |
| T-04 | Creador: borrador | Ver propuesta y verificación | Pregunta guía, 3 pistas, materiales, límites, escena del holograma; semáforo del verificador; segundo revisor | Editar / regenerar | Creador | Prototipo |
| T-05 | Revisar y aprobar | Docente en el lazo | Vista previa de la vitrina; edición; etiqueta "generado con IA, aprobado por [docente]" | **Aprobar** | Creador | Demo |
| T-06 | Visita en vivo | Abrir el museo | Código gigante + QR (T-06a); mapa con avatares de grupo y su paso, con hub (T-06b); sin hub: "llegará por QR"; **Guardián** (T-06c): vista "del curso" (agregados desde 5 alumnos) y vista "para acercarse" (hasta 3 sugerencias por semana, solo la docente responsable) | Abrir sala | Museo / Red | Demo (sin hub) / Prototipo (hub) |
| T-07 | Supervisión | Control | Salas y vitrinas abiertas; **tutor on/off; gestos on/off; IA en línea** (apagada por defecto); **Guardián on/off** (apagado por defecto; "Apagar" siempre visible) | Encender/apagar | Panel | Demo |
| T-08 | Recibir | Evidencia sin internet | Visor QR con anillo de progreso; o lista "recibido por hub" | Escanear siguiente | Red | **Demo** |
| **T-09** | **Evidencias** | Ver el razonamiento | Por alumno: predicción, dato, conclusión; indicadores con **frase literal**; competencia y capacidad CNEB; "no evaluable" en gris; "dudoso" a revisar; leyenda "orienta, no califica" | Abrir alumno | Panel / Cerebro | **Demo** |
| T-10 | Ficha del alumno | Memoria útil | Recuerdos del Cerebro (citas fechadas), conceptos confundidos, sugerencia de pregunta; editar/borrar. El Cerebro no recibe datos de Guardián | Corregir / borrar | Cerebro | Prototipo |
| T-11 | Resumen de clase | Cerrar | Lo que vimos / lo que les costó / tres ejercicios, con frases reales | Guardar | Panel | Demo |
| T-12 | Malla curricular | Seguimiento por competencia | Matriz alumnos × capacidades con evidencia por celda; "sin evidencia aún" ≠ "no logrado" | Abrir celda | Malla | Prototipo |
| **T-13** | **Reporte por competencia** | Informe serio, sin papeleo | Competencia "Indaga": % de alumnos con evidencia en cada capacidad, citas representativas, próxima exhibición sugerida | Compartir con director | Malla | **Demo** |
| T-14 | Para llevar | Continuidad | Compartir por QR · WhatsApp · Imprimir; modo continuidad | Compartir | Familia | Demo |
| T-15 | Hoja A4 | Papel | Pasos con pictogramas, tabla para datos, QR de vuelta, texto en quechua revisado | Imprimir | Familia | Demo |
| T-16 | Mensaje a familias | Lazo con el hogar | Plantilla corta; audio en quechua grabado | Abrir WhatsApp | Familia | Prototipo |
| T-17 | Registro auxiliar | Cumplir sin doble trabajo | Exporta Excel; **la docente elige** AD/A/B/C con la evidencia al lado | Exportar | Malla | Roadmap |
| T-18 | Proyectar / Auditorio | Ver juntos | Holograma en pantalla, pirámide o cajita; convocar a todos los grupos | Proyectar | Exhibición | Demo (proyección existe) |
| T-19 | Hub y sincronización | Saber qué está guardado | Modo hub (celular, laptop, kit MINEDU); grupos conectados; cola pendiente | Sincronizar | Red | Prototipo |
| T-20 | Ajustes, lenguas y privacidad | Confianza | Lenguas y variedades; datos locales; exportar/borrar; qué sale a la nube y cuándo; retención del Cerebro | Exportar / borrar | Panel | Demo |
| T-21 | Consentimientos y Rikuy Guardián | Control legal y ético | Por alumno (apodo): menores de 14 = consentimiento del apoderado + asentimiento del alumno; 14-17 = consentimiento del alumno con información comprensible (sí/no/revocado, fecha, canal); nivel activo (apagado · 1 eventos de aprendizaje y check-in · 2 cámara y voz: no compilado, bloqueado por defecto); jurisdicción (UE = bloqueado); texto en castellano y quechua con audio; explicación de que la confidencialidad no es absoluta (SíseVe) | Activar / desactivar | Guardián | Prototipo (Nivel 1) |

### 3.2 Estudiante

| ID | Nombre | Propósito | Contenido clave | Acción principal | Módulo | Estado |
|---|---|---|---|---|---|---|
| E-00 | Entrar | Acceso sin cuentas | Código o QR; apodo y emblema del grupo; avatar por integrante (sin nombres reales); consentimiento leído en voz alta | Entrar | Museo | **Demo** |
| E-00d | Aviso de Rikuy Guardián | Que el alumno sepa qué es antes de decidir | Qué usa (eventos de la exhibición), qué **no** usa (cámara, voz, teclado), quién lo ve (solo su docente), cuándo se borra, que puede decir "no" o pausar, y que **la confidencialidad no es absoluta** (si cuenta que alguien le hace daño o que está en peligro, la docente debe activar SíseVe); lectura en voz alta; opción del Nivel 2 solo si existe y está permitido | Aceptar / no, gracias | Guardián | Prototipo |
| E-00e | Permiso de la familia | Consentimiento de menores | Estado del permiso del apoderado (menores de 14), canal y fecha; cómo retirarlo | Ver estado | Guardián | Prototipo |
| **E-01** | **Vestíbulo del museo** | Hogar | Mapa 2D: puertas a las salas, Patio, Auditorio, Casa; Rikuy guía; otros grupos visibles con hub; candados | Caminar | Museo | **Demo** |
| E-02 | Sala | Recorrer un área CNEB | Vitrinas con placas; luces encendidas en lo completado | Acercarse a una vitrina | Museo | Demo (Física) |
| E-03 | Placa | Saber qué hay | Nombre, competencia, duración, materiales | Entrar | Museo | Demo |
| E-04 | Auditorio | Reunión de clase | Holograma compartido, mensaje de la docente | Escuchar | Museo | Roadmap |
| **E-05** | **Vitrina holográfica** | Explorar con las manos | Holograma del péndulo; indicador de cámara activa; guía de gestos (girar, acercar, soltar); botones táctiles equivalentes; **selector de formatos** (Holograma · Video · Audio · Diagrama · Quiz) con el formato activo resaltado; **todos disponibles desde el inicio** (la predicción desbloquea la medición, no la visualización) | Girar / soltar / cambiar formato | Exhibición / Gestos | **Demo** (holograma, diagrama, audio) · Prototipo (video, quiz) |
| E-06 | Pregunta guía | Plantear | Pregunta, materiales con pictogramas, seguridad; audio es/qu | Siguiente | Exhibición | Demo |
| **E-07** | **Predicción** | Hipótesis antes del dato | ¿Qué cambias? · ¿qué pasará? · ¿por qué?; voz o texto; tocar su avatar para firmar | Guardar (desbloquea medir) | Exhibición | **Demo** |
| **E-08** | **Rikuy** | Pensar, no copiar | La piedra de un ojo que habla (TTS castellano / audio grabado en quechua; solo las 4 expresiones de DESIGN.md §6, disparadas por eventos de la app); escalera de pistas 1·2·3; recuerdo del Cerebro; mensajes honestos | Pedir pista / responder | Tutor | **Demo** |
| **E-09** | **Medición propia** | Dato propio | Cronómetro grande para 10 oscilaciones; longitudes 25/50/100 cm; modo sensor | Iniciar / parar | Exhibición | **Demo** |
| E-10 | Tabla | Ordenar evidencia | L / 10T / T; repetir; marcar dato raro | Comparar | Exhibición | Demo |
| **E-11** | **Comparar** | Contrastar | Puntos propios sobre T = 2π√(L/g); error %; el holograma oscila con su longitud | Concluir | Exhibición | **Demo** |
| E-12 | Conclusión | Explicar | Texto o voz; Rikuy pregunta "¿qué dato lo prueba?"; nudo del quipu si ayudó al grupo | Terminar | Exhibición | Demo |
| E-13 | Patio de juegos | Reto corto | Retos con contexto local y competencia | Jugar | Juegos | Prototipo |
| E-14 | Cuaderno de campo (dentro de Cerebro) | Memoria del grupo | Predicciones, datos, conclusiones; "lo que Rikuy recuerda de mí" | Revisar | Cerebro | Prototipo |
| E-15 | Quipu de logros | Cooperar | Quipu del grupo con nudos y su motivo; quipu de la clase; decoraciones desbloqueadas; sin ranking | Ver | Quipu | Demo (un nudo) |
| E-16 | Recibir "Para llevar" | Continuidad | Escanear QR del paquete | Guardar | Familia | Demo |
| **E-17** | **Mi QR** | Entregar sin red | QR animado (650 ms por cuadro) | Mostrar | Red | **Demo** |
| E-18 | Lengua y audio | Lengua de casa | Castellano · quechua (variedad, "grabado por hablante") · otras | Cambiar | Lenguas | Demo (es/qu) |
| **E-19** | **Mi Cerebro Rikuy** | Ver lo que sé, con pruebas | Mapa de nodos (conceptos y capacidades CNEB) por salas; nodo encendido solo con evidencia; al tocar: frase literal, exhibición, fecha; estados **sin explorar** (contorno) · **explorado** · **razonado** · **por revisar**, con "?" para pregunta abierta (relleno + borde + texto; nunca solo color); "Cada luz de tu cerebro es algo que tú dijiste"; "¿por qué está así?" (E-19n); vista 2D (3D opcional). *Equivalencia con ARQUITECTURA 3.12:* `sin_explorar` = sin explorar · `explorado` = explorado · `en_camino` = por revisar · `logrado` = razonado · `pregunta_abierta` = "?"; la interfaz usa estos nombres | Tocar nodo / ir a la exhibición sugerida | Cerebro | **Demo** (nodos del péndulo) |
| E-20 | Rikuy Guardián: ayuda a tiempo y check-in | Ayudar a quien se atasca y escuchar lo que el alumno decide decir | **E-20** indicador permanente "Guardián activo" (ícono fijo + texto; no cambia con el estado del alumno) y tarjeta de oferta: "¿Quieres una pista?" / "¿Más despacio?" / "¿Pausa de un minuto?" con "No, gracias"; nunca muestra etiquetas emocionales. **E-20b** ajustes y pausa (pausar o retirar pesa lo mismo que activar). **E-20c** check-in momentáneo (por maquetar): anclado al paso exacto, una o varias emociones con intensidad (poco/medio/mucho), opciones de cuerpo y relación, "no sé" / "prefiero no decir", "¿qué te ayudaría ahora?", texto libre opcional, elección "solo yo / compartir con mi profe", y el aviso de que la confidencialidad no es absoluta (SíseVe). **E-20d** "necesito hablar con alguien" (por maquetar): el alumno elige con quién | Aceptar / rechazar / responder / omitir | Guardián | Prototipo (Nivel 1) |
| E-21 | Punto de encuentro | Presencia entre grupos sin chat libre | Avatares de grupo en el museo; solo reacciones de lista cerrada (saludar, señalar, aplaudir, ayuda) | Reaccionar | Museo | Prototipo (propuesta de los wireframes) |
| E-22 | Lab (inicio) | Entrada de la pestaña Lab | "Continuar" la exhibición en curso, datos propios, exhibiciones abiertas por la docente | Continuar | Exhibición | Prototipo (propuesta) |
| E-23 | Yo | Reunir lo personal del grupo | Mi QR (E-17), Lengua y audio (E-18), Guardián: ajustes y pausa (E-20b), Red y pendientes (E-24), Recibir "Para llevar" (E-16) | Abrir | Panel del alumno | Demo (E-17, E-18, E-16) / Prototipo (E-23, E-24) |
| E-24 | Red y pendientes | Saber qué está guardado | Chip neutro, nunca rojo: "Sin red · todo funciona", "n guardados aquí; se envían por QR o al conectar" | Mostrar mi QR | Red | Prototipo (propuesta) |
| E-25 | Error real | Plantilla de error | Una frase + qué hacer + alternativa; sin jerga; Rikuy no aparece en errores de pérdida de datos | Reintentar / alternativa | Transversal | Demo (propuesta) |

### 3.3 Familia, director/UGEL y administración

| ID | Nombre | Contenido clave | Estado |
|---|---|---|---|
| F-01 | Mensaje de WhatsApp | "Hoy el grupo de Yeni midió un péndulo. Pregúntenle: ¿de qué depende lo que tarda?" + audio grabado en quechua + enlace | Prototipo |
| F-02 | Página "Para llevar" | Pasos con pictogramas, audio, tabla, QR de vuelta | Demo |
| F-03 | Hoja A4 | Igual que F-02, impresa | Demo |
| F-04 | "Lo hicimos" | Un toque o foto del cuaderno (sin rostros) | Roadmap |
| F-05 | Mensaje semanal a la familia | WhatsApp cada viernes: texto corto + audio grabado en la lengua de casa + enlace; la docente lo envía a mano con plantilla (T-16); en difusión sin nombrar a menores, 1:1 si lleva nombre; sin notas, comparaciones ni datos de Guardián | Prototipo (propuesta de los wireframes) |
| D-01 | Tablero de la IE | Cobertura de competencias por sección; exhibiciones realizadas | Roadmap |
| **D-02** | **Tablero UGEL** | Mapa de IE; avance por competencia; conceptos difíciles; continuidad en cierres; brechas por lengua y conectividad; solo agregados n ≥ 5 | Prototipo (datos simulados) |
| D-03 | Detalle de IE | Tendencias por competencia, sin ranking de docentes | Roadmap |
| D-04 | Exportar informe | PDF/CSV para UGEL, DRE, ProFuturo | Roadmap |
| D-05 | Medición de impacto | Cohortes pre/post y observables | Roadmap |
| A-01 a A-04 | Administración | Biblioteca curada; revisión lingüística y grabaciones; colegios y hubs; auditoría de IA | Roadmap |

### 3.4 Desgloses y estados de los wireframes

Las pantallas con sufijo son **desgloses o estados** de IDs que ya existen, no pantallas nuevas del inventario. **Docente:** T-06a/b/c, T-07d, T-07x, T-08b, T-09d, T-09e, T-10e, T-11b, T-13b, T-04e, T-04n, T-19s, T-20b/c, T-21x, T-01e, T-ERR. **Estudiante:** E-00a/b/c/f, E-01b, E-02b/c, E-05a/b/c/s/d/v/q, E-08a/q/b/c/n, E-12b, E-13b, E-15b, E-17b/c, E-19e/n, E-20b/c/d. Los únicos IDs sin equivalente previo son E-00d, E-00e, E-21 a E-25 y F-05 (arriba).

## 4. Navegación y patrones

| Patrón | Docente | Estudiante |
|---|---|---|
| Hogar | T-01 | E-01 Vestíbulo del museo |
| Navegación principal | Barra de 5 pestañas: **Hoy · Clase · Evidencia · Reportes · Ajustes**. En Hoy (T-01), *stepper* de los 4 tramos del día. Clase = Preparar + Museo + Para llevar; Evidencia = Cierre; Reportes = Malla, Competencia, Registro; Ajustes = consentimientos y Guardián, lenguas, datos y hub | Barra de 5 pestañas, oculta solo en E-00: **Museo · Lab · Cerebro · Quipu · Yo**. Museo = E-01/E-02/E-03/E-13/E-21; Lab = E-22 y el recorrido de una exhibición (E-05 a E-12); Cerebro = E-19 con E-14 dentro; Quipu = E-15; Yo = E-23 (Mi QR, Lengua, Guardián, Red, Para llevar) |
| Encabezado | Clase + chip del hub (`Hub activo · 6 grupos` / `Sin red · todo funciona` / `Sincronizando 12`) + interruptores rápidos | Emblema del grupo + avatares de integrantes (tocar para "firmar") + chip de cámara (si gestos activos) + chip "Guardián activo" (si corresponde) + Rikuy |
| Tutor | Supervisa desde T-07 | Rikuy (piedra de un ojo colgada de su cordón) flotante en exhibiciones y juegos |
| Profundidad | ≤ 3 niveles | Vestíbulo → Sala → Exhibición; "volver al vestíbulo" siempre visible |
| Etiquetas honestas | "Prototipo" · "Generado con IA, aprobado por la docente" · "Grabado por hablante (variedad)" · "Datos simulados" | Igual, en lenguaje sencillo |

## 5. Estados transversales

| Estado | Dónde | Qué se ve | Qué NO se hace |
|---|---|---|---|
| **Sin red** (normal) | Todas | Chip neutro "Sin red · todo funciona" | Nunca rojo; nunca bloquear |
| **Hub activo / grupo desconectado** | T-06, E-01 | "Conectado al hub de la profesora" / "Trabajando solos: entregan por QR" | No perder la sesión |
| **Sincronizando / pendiente** | T-19, E-17 | "n eventos guardados aquí; se enviarán por QR o al conectar" | No perder datos al cerrar |
| **Vitrina cerrada** | E-02/E-03 | Candado: "Se abre cuando tu docente lo indique" | No mostrar exhibiciones no aprobadas |
| **Sala vacía** | E-02 | Rikuy: "Esta sala aún no tiene exhibiciones; visita la Sala Física" | — |
| **Cámara denegada / poca luz / gama baja** | E-05 | "Usaremos el dedo" con los mismos controles | No insistir con permisos |
| **Gestos apagados por la docente** | E-05 | Ícono de mano tachado; controles táctiles | — |
| **Sensor no disponible** | E-09 | "Usaremos el cronómetro" | No bloquear |
| **Audio en quechua no grabado aún** | E-08, E-18 | Texto en quechua con sello "sin audio revisado" o castellano con aviso | No usar TTS quechua |
| **Tutor apagado** | E-08 | Rikuy en reposo, sin burbuja (solo las 4 expresiones de DESIGN.md §6): "Hoy trabajan sin Rikuy" | — |
| **IA en línea no disponible** | T-04, E-08 | Tutor de reglas; exhibición pregenerada | No mostrar error al alumno |
| **QR incompleto** | T-08 | Anillo de progreso; "faltan 3 cuadros"; repetidos se ignoran | No descartar lo recibido |
| **Sin evidencia** | T-09, T-12 | "No evaluable" / "sin evidencia aún" en gris | No contarlo como cero |
| **Cerebro vacío** | T-10, E-14, E-19 | "Rikuy aún no recuerda nada de ti"; mapa con nodos apagados en contorno | No encender nodos sin evidencia |
| **Guardián activo** | Todas las de estudiante | Ícono fijo de ojo + "Guardián activo" en el encabezado (no cambia con el estado del alumno) | Nunca activo sin consentimiento; nunca oculto |
| **Guardián sin consentimiento / UE** | E-00d, E-20, T-21 | Apagado (Rikuy sigue funcionando igual); el Nivel 2 (cámara y voz) no se compila y en la UE está bloqueado; T-21 explica por qué | No pedir asentimiento al alumno menor de 14 sin el consentimiento del apoderado |
| **Check-in omitido / "prefiero no decir"** | E-20c | Se respeta, no se repite en la sesión y no se interpreta | No insistir; no tratar la omisión como señal |
| **Confidencialidad** | E-00d, E-20c | Antes del primer check-in: "lo que compartas queda con tu docente, salvo si alguien te hace daño o estás en peligro" | No prometer confidencialidad absoluta |
| **Formato no disponible sin red** | E-05 | Formato atenuado "se descarga al conectar"; el holograma y el diagrama siempre están | — |
| **Cierre escolar** | T-01, T-14 | "Tu región cierra el 11 dic: prepara Para llevar" (con fuente) | — |
| **Error real** | Cualquiera | Una frase + qué hacer + alternativa | Sin jerga técnica |

## 6. Flujos principales

### F1. Preparar (Rosa, con red, la tarde anterior)
1. T-01 → **Preparar** → T-02. Si hay exhibición lista: Usar → T-05. Si no: T-03 → T-04 (verificador en verde) → T-05.
2. **Aprobar**: la exhibición (≈ 10 KB con audios comprimidos) queda en su celular.

### F2. Visita al museo sin internet
1. Rosa enciende el hub (T-19) y abre la Sala Física (T-07). Muestra T-06.
2. Cada grupo: E-00 (escanea QR, emblema, avatares) → E-01 → camina a la Sala Física (E-02) → placa (E-03).
3. E-05: el péndulo aparece como holograma; lo giran con la mano y lo sueltan con un gesto.
4. E-06 → E-07 predicción firmada con el avatar de Yeni.
5. E-08: Rikuy pregunta en voz (castellano o audio en quechua): "¿Cuánto más crees que tardará si la cuerda mide el doble?"
6. E-09 → E-10: miden 10 oscilaciones a 3 longitudes con su celular y cuerda.
7. E-11: sus puntos sobre la curva; el holograma oscila con su longitud.
8. E-12 conclusión; si explicaron a otro grupo, la docente confirma un nudo (E-15).
9. Cada paso es un evento: por el hub llega en vivo a T-06; sin hub queda en el celular del grupo.

### F3. Recibir evidencia
1. Con hub: llega sola a T-09. Sin hub: Rosa → **Cierre** → T-08; el grupo muestra E-17; ≈ 10 s por grupo.
2. Los eventos alimentan el Cerebro (T-10) y la malla (T-12).

### F4. Reflexionar y reportar
1. T-09: frase literal por alumno, competencia, "no evaluable", "dudoso".
2. T-11 resumen en tres partes. T-13 reporte de la competencia "Indaga". (Roadmap: T-17 registro auxiliar.)

### F5. Para llevar
1. **Para llevar** → T-14: QR a cada grupo (E-16), A4 (T-15), WhatsApp con audio en quechua (T-16 → F-01).
2. En casa (F-02/F-03) repiten; al volver, E-17 → T-08 devuelve el resultado.

### F6. Reporte semanal y territorial
1. Al tener red, T-19 sube agregados anónimos por competencia.
2. Director en D-01; UGEL en D-02 con n mínimo.

### F7. Juego en la lengua de casa (Inti)
1. E-01 → Patio → E-13 "Feria de Chivay" con audio grabado en quechua; Rikuy acompaña; nudo para su grupo.

## 7. La demo dorada (pitch, 3:00 de producto)

**Un recorrido: Yeni en el Museo Rikuy, con un péndulo real, en modo avión; la evidencia llega al panel de Rosa.** Dispositivos: celular A (Rosa), celular B (grupo de Yeni), cuerda con piedra, regla. Ambas pantallas proyectadas.

| Tiempo | Pantallas | Qué pasa | Qué siente el jurado | Estado |
|---|---|---|---|---|
| 0:00-0:10 | (sistema) | **Modo avión** en ambos celulares, en cámara | "No hay internet de verdad" | En vivo |
| 0:10-0:30 | E-00 → E-01 | Yeni escanea el QR de clase; aparece el **Museo Rikuy**; Rikuy, la piedra de un ojo, la guía a la **Sala Física** | Producto completo y cálido | En vivo |
| 0:30-0:55 | E-02 → E-05 | La vitrina del péndulo se enciende como **holograma**; Yeni lo **gira con la mano** frente a la cámara y lo **suelta con un gesto** (chip "cámara: solo tu mano, nada se guarda"); un toque muestra que la exhibición también existe como diagrama y audio | Magia tangible; la cámara solo ve la mano y no guarda nada | En vivo |
| 0:55-1:20 | E-07 → E-08 | Predicción: "si alargo la cuerda, tarda más". Rikuy **pregunta en voz**; se cambia a quechua y suena la **grabación de una hablante** | Tutor que no responde; lengua de casa con respeto | En vivo (audio con sello de revisión) |
| 1:20-1:55 | E-09 → E-11 | Yeni mide 10 oscilaciones con la piedra real (una longitud en vivo; las otras precargadas); sus puntos caen sobre la curva; error 4 %; el holograma oscila con su longitud | **Dato propio**: el laboratorio ya no es un edificio | En vivo |
| 1:55-2:05 | E-12 → E-19 | Concluye con su frase; en **Mi Cerebro Rikuy** se encienden los nodos "longitud → periodo" con su cita; el grupo anuda un nudo del quipu por explicarle a otro grupo | Mapa real, no decorativo; cooperar | En vivo |
| 2:05-2:30 | E-17 → T-08 → T-09 | QR animado; el celular de Rosa lo lee; aparece la **frase literal de Yeni** con la competencia CNEB "Indaga" y "no evaluable" en otra capacidad | Evidencia honesta sin red | En vivo |
| 2:30-2:45 | T-13 | **Reporte por competencia**: la clase en la competencia "Indaga", con citas | Seriedad curricular | En vivo |
| 2:45-3:00 | T-14 → T-15 | "Tu región cierra el 11 dic": **Para llevar** genera la hoja A4 y el QR | Continuidad ante El Niño | En vivo |

**Pantallas etiquetadas (5 s cada una, después o en el video):** Rikuy Guardián: Rikuy ofrece una pista tras un atasco, check-in voluntario, indicador visible y pantallas de aviso y permiso (Prototipo; sin cámara ni voz) · selector de formatos con video y quiz (Prototipo) · visita multigrupo con hub (Prototipo) · Cerebro: "la semana pasada dijiste…" (Prototipo) · tablero UGEL (Prototipo, datos simulados) · Creador con verificador CNEB (Prototipo) · WhatsApp con audio en quechua (Prototipo) · holograma en pirámide (video, 10 s).

**Plan B:** si fallan el modo avión, los gestos o el QR, se pasa sin explicar al video de respaldo de 90 s con el mismo guion; los gestos tienen siempre la alternativa táctil en vivo.
