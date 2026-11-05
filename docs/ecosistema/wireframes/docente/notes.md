# Wireframes docente, familia y director: notas

Archivo: [`index.html`](index.html) (autocontenido, sin CDN). **50 pantallas** en 10 flujos. Baja fidelidad en grises; el color nunca es el único portador de significado (forma + texto + número). Celular 360×640, escritorio 1280×800 al 60 %, hoja A4. ★ = pantalla del tramo docente de la demo dorada. Datos, nombres de IE y UGEL son ficticios; Rosa, Yeni, Hilda y Julio son perfiles compuestos.

## 1. Pantallas

| ID | Pantalla | Dispositivo | Estado | Flujo |
|---|---|---|---|---|
| T-00 | Bienvenida · crear clase | Celular | Demo | 1. Arranque |
| T-01 ★ | Inicio · «Mi clase de hoy» | Celular | Demo | 1. Arranque |
| T-02 | Biblioteca de exhibiciones | Celular | Demo | 2. Preparar |
| T-03 | Creador · elegir desempeño | Celular | Prototipo | 2. Preparar |
| T-04 ★ | Creador · borrador + verificador | Celular | Prototipo | 2. Preparar |
| T-04e | Creador · verificador en rojo | Celular | Prototipo | 2. Preparar |
| T-05 ★ | Revisar y aprobar | Celular | Demo | 2. Preparar |
| T-19 ★ | Hub y sincronización | Celular | Prototipo | 3. Museo en vivo |
| T-06a ★ | Visita en vivo · código y QR de entrada | Celular | Demo | 3. Museo en vivo |
| T-06b ★ | Visita en vivo · mapa del museo con grupos | Celular | Prototipo | 3. Museo en vivo |
| T-07 ★ | Supervisión · grupos, tutor, gestos, IA | Celular | Demo | 3. Museo en vivo |
| T-07d | Detalle de grupo | Celular | Demo | 3. Museo en vivo |
| T-06c | Señales de aprendizaje · agregado por grupo | Celular | Prototipo (Nivel 1) | 3. Museo en vivo |
| T-18 | Proyectar holograma / convocar al Auditorio | Celular | Demo | 3. Museo en vivo |
| T-08 ★ | Recibir evidencia (QR o hub) | Celular | Demo | 4. Cierre y evidencia |
| T-08b | Recibir · QR incompleto | Celular | Demo | 4. Cierre y evidencia |
| T-09 ★ | Evidencias por alumno y grupo | Celular | Demo | 4. Cierre y evidencia |
| T-09d | Evidencia de un alumno (detalle) | Celular | Demo | 4. Cierre y evidencia |
| T-10 | Ficha del alumno · Cerebro | Celular | Prototipo | 4. Cierre y evidencia |
| T-11 | Resumen de clase en tres partes | Celular | Demo | 4. Cierre y evidencia |
| T-11b | Cerrar clase y reflexionar | Celular | Prototipo | 4. Cierre y evidencia |
| T-12 | Malla curricular | Celular | Prototipo | 5. Reportes CNEB |
| T-13 ★ | Reporte por competencia · clase | Celular | Demo | 5. Reportes CNEB |
| T-13b | Reporte por alumno | Celular | Prototipo | 5. Reportes CNEB |
| T-17 | Registro auxiliar (exportar) | Celular | Roadmap | 5. Reportes CNEB |
| T-14 ★ | Para llevar · compartir exhibición | Celular | Demo | 6. Para llevar |
| T-15 ★ | Hoja A4 · vista previa | Celular | Demo | 6. Para llevar |
| T-16 | Mensaje a familias | Celular | Prototipo | 6. Para llevar |
| F-01 ★ | Mensaje de WhatsApp (lo que recibe Hilda) | Celular | Prototipo | 7. Familia |
| F-05 | Mensaje semanal a la familia | Celular | Propuesto (ID nuevo) | 7. Familia |
| F-02 | Página ligera «Para llevar» (sin instalar) | Celular | Demo | 7. Familia |
| F-03 ★ | Hoja A4 impresa | A4 | Demo | 7. Familia |
| F-04 | «Lo hicimos» | Celular | Roadmap | 7. Familia |
| D-01 | Tablero de la IE (director) | Escritorio | Roadmap | 8. Director / UGEL / ProFuturo |
| D-02 | Tablero territorial (UGEL / ProFuturo) | Escritorio | Prototipo (datos simulados) | 8. Director / UGEL / ProFuturo |
| D-03 | Detalle de IE | Escritorio | Roadmap | 8. Director / UGEL / ProFuturo |
| D-04 | Exportar informe (PDF / CSV) | Escritorio | Roadmap | 8. Director / UGEL / ProFuturo |
| D-05 | Medición de impacto | Escritorio | Roadmap | 8. Director / UGEL / ProFuturo |
| T-20 | Ajustes, lenguas y privacidad | Celular | Demo | 9. Ajustes |
| T-21 | Consentimientos y Señales de aprendizaje | Celular | Prototipo (Nivel 1) | 9. Ajustes |
| T-20b | Lenguas y variedades (detalle de T-20) | Celular | Demo | 9. Ajustes |
| T-20c | Datos y privacidad (detalle de T-20) | Celular | Demo | 9. Ajustes |
| T-01e | Inicio · sin clase (vacío) | Celular | Demo | 10. Estados |
| T-04n | Creador · IA en línea no disponible | Celular | Prototipo | 10. Estados |
| T-07x | Supervisión · grupo desconectado | Celular | Demo | 10. Estados |
| T-19s | Hub · sincronizando / pendiente | Celular | Prototipo | 10. Estados |
| T-09e | Evidencias · sin evidencia aún | Celular | Demo | 10. Estados |
| T-10e | Ficha · Cerebro vacío | Celular | Prototipo | 10. Estados |
| T-21x | Señales · apagadas / Nivel 2 denegado | Celular | Prototipo | 10. Estados |
| T-ERR | Error real (plantilla) | Celular | Demo | 10. Estados |

Los estados son los de `INFORMATION_ARCHITECTURE.md` (Demo / Prototipo / Roadmap). Las pantallas con sufijo (T-06a/b/c, T-07d, T-08b, T-09d, T-11b, T-13b, T-04e, T-20b/c y los estados T-01e, T-04n, T-07x, T-19s, T-09e, T-10e, T-21x, T-ERR) son **desgloses o estados** de IDs que ya existen en la IA, no pantallas nuevas del inventario. **F-05** (mensaje semanal) es el único ID sin equivalente en la IA.

### Tramo docente de la demo dorada

1. T-01 Inicio → 2. T-04 / T-05 prepara y aprueba → 3. T-19 / T-06a enciende el hub y muestra el código → 4. T-06b / T-07 ve a los grupos → **5. T-08 recibe el QR de Yeni → 6. T-09 frase literal → 7. T-13 reporte «Indaga» → 8. T-14 / T-15 Para llevar** (F-01 y F-03 son el destino en casa). Los pasos 5-8 son los 55 segundos en vivo de la IA §7 (2:05-3:00); los pasos 1-4 son contexto previo o pantallas etiquetadas (Prototipo).

## 2. Decisiones de diseño

1. **Barra inferior fija `Hoy · Clase · Evidencia · Reportes · Ajustes`** (convención del encargo). La IA define 4 pestañas del día (Preparar · Museo · Cierre · Para llevar). Resolución: **Clase** = Preparar + Museo + Para llevar (control segmentado arriba); **Evidencia** = Cierre (Recibir · Evidencias · Resumen); **Reportes** = Malla · Competencia · Registro; **Hoy** conserva el stepper de los 4 tramos; **Ajustes** contiene consentimientos/Señales, lenguas, datos y hub. La IA §4 («4 pestañas del día») debería actualizarse.
2. **Una acción primaria por pantalla**, objetivos táctiles ≥ 44 px (primarios 48), todo a un pulgar, nada que escribir en clase (chips en vez de texto).
3. **Chip de red neutro, nunca rojo.** Sin red, sin hub, grupo desconectado, pendiente de sincronizar y QR incompleto son estados normales (T-07x, T-19s, T-08b). Los errores reales siguen «una frase + qué hacer + alternativa» (T-ERR).
4. **Evidencia honesta:** frase literal siempre; «no evaluable» y «sin evidencia aún» en gris rayado con guion, nunca 0 ni «no logrado»; «orienta, no califica» en cada vista de evidencia; el calificativo AD/A/B/C solo existe en T-17, con casillas vacías y elegido por la docente.
5. **Cero ranking.** T-07 ordena «los que te necesitan primero» por señales observables; D-01 y D-03 ordenan por grado, no por valor ni por docente.
6. **Verificador bloqueante pero no autoritario:** con rojos (T-04e) no se puede aprobar; con verdes la docente igual aprueba (T-05). La etiqueta «Generado con IA, aprobado por [docente]» aparece al aprobar.
7. **Lenguas:** castellano y quechua con variedad declarada y estado de revisión (revisado / grabado n de m / borrador visible solo para la docente). Las maquetas usan el marcador «[texto en quechua]»: no se escribió quechua inventado.
8. **Familia sin app:** F-01 y F-05 como chat de WhatsApp (texto corto + audio + enlace), F-02 página ligera con pictogramas, F-03 hoja A4. Ningún mensaje lleva notas, comparaciones ni Señales.
9. **Director/UGEL:** solo agregados; celdas con n < 5 suprimidas; heatmaps con número + patrón; sincronización con formas distintas por estado y causa en texto («sin red en la zona»); etiqueta fija «Datos simulados».
10. **Señales de aprendizaje alineadas con la IA y ECOSISTEMA §2.14 / PROYECCIONES §6.1 (versión actualizada):** T-21 = consentimientos (nivel Apagado · 1 Comportamiento · 2 Cámara y voz; consentimiento de apoderado y alumno con fecha y canal; jurisdicción con UE = bloqueado; texto es/qu con audio). T-06c = agregado **por grupo** en lenguaje observable («varios momentos de confusión en la medición», «7 min sin avanzar»), nunca por alumno ni con etiquetas emocionales, con la tasa de ofertas de ayuda aceptadas. Interruptor en T-07 (apagado por defecto) y «Apagar señales» siempre visible y dominante. T-21x cubre el estado apagado y las caídas (Nivel 2 denegado → vuelve a Nivel 1). T-10 y T-20c repiten que el Cerebro y la nube no reciben Señales.

## 3. Preguntas abiertas

1. **Pestañas.** ¿Se acepta la barra de 5 ítems con Preparar/Museo/Para llevar dentro de «Clase»? Alternativa: sacar «Para llevar» a su propia pestaña y fusionar Evidencia y Reportes. Afecta §4 y §6 de la IA.
2. **Nivel 2 en celular compartido.** Una cámara por grupo no aísla a un niño: T-21 asume que el Nivel 2 corre solo si **todos** los integrantes consintieron. Decidir esto (o descartar el Nivel 2 hasta tener un dispositivo por alumno) depende de la revisión legal pendiente (PROYECCIONES §6.1).
3. **Señales y financiadores.** ¿ProFuturo (fundación española) exige cumplir el art. 5(1)(f) del AI Act? Si sí, T-21 debe mostrar el Nivel 2 bloqueado en todas las clases, no solo en la UE.
4. **«Ofertas de ayuda aceptadas» en D-05.** PROYECCIONES la lista como métrica de impacto, pero ECOSISTEMA dice que Señales no entra a reportes de UGEL. Propuesta: mostrar solo la tasa agregada de aceptación (no de confusión) en D-05 y nunca en D-02. A confirmar.
5. **Apodo ↔ nombre.** La docente necesita saber quién es «Yeni» para actuar; la IA dice «apodo». Los wireframes asumen un vínculo apodo-padrón opcional guardado solo en su celular. Confirmar.
6. **Mensajes a familias: 1:1 o difusión.** F-01 nombra a Yeni (1:1); en un grupo de WhatsApp de familias eso expone a un menor. T-16 propone «el grupo» en difusión y personalizar al enviar 1:1. ¿Se acepta?
7. **Mensaje semanal (F-05).** ¿Lo envía la docente a mano cada viernes (sin pasarela) o se programa? Hoy: manual con plantilla en T-16.
8. **Hub.** T-19 y T-06 asumen el hub en el celular de la docente (app nativa, Roadmap) o laptop-hub (Prototipo). Plan B en pantalla: T-07x y el relevo QR (T-08).
9. **Registro auxiliar (T-17).** El formato oficial depende de cada UGEL; por verificar. Las casillas AD/A/B/C arrancan vacías a propósito.
10. **Texto CNEB.** Los nombres de competencia y capacidades se escribieron de memoria y el desempeño de T-03 está marcado «muestra». Copiar literal del JSON curricular antes de mostrar al jurado (PROYECCIONES §7, punto 9).
11. **Calendario de cierre escolar.** El aviso de T-01 cita Infobae (13 oct 2026). ¿De dónde sale en producción (MINEDU/DRE) y cómo se actualiza sin red?
12. **Acceso del director.** La IA no define cómo se autentica el director o el especialista de la UGEL para abrir D-01/D-02 (¿enlace firmado por la UGEL?).

## 4. Verificaciones hechas

- Todos los enlaces internos `#ID` resuelven y no hay IDs duplicados.
- Ningún celular desborda su área de contenido (comprobado en navegador); F-02 y F-04 se cortan a propósito (páginas que se desplazan).
- `INFORMATION_ARCHITECTURE.md` se releyó al final: cambió durante el trabajo (T-21 pasó a «Consentimientos y Señales»; aparecieron E-19 y E-20; la demo dorada incorpora Mi Cerebro Rikuy). Las pantallas de Señales se rehicieron para coincidir. El tramo docente de la demo (T-08 → T-15) no cambió.
- Fuera de alcance y no tocado: pantallas de estudiante/museo (E-xx), administración de contenido (A-xx) y el sistema visual «Luz de Puna» (`DESIGN.md`): estos wireframes son grises a propósito.
