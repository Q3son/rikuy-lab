# Wireframes del estudiante y del museo: notas

> Archivo principal: [index.html](index.html) (autocontenido, sin CDN, clicable). **52 pantallas** en 10 flujos, 360×640, escala de grises. IDs de [INFORMATION_ARCHITECTURE.md](../../INFORMATION_ARCHITECTURE.md) (releída al terminar: incluye E-19 Mi Cerebro Rikuy y E-20 Señales). Las variantes llevan sufijo (E-05a, E-08q…). Las pantallas que **propongo añadir** a la IA llevan la etiqueta "Propuesta nueva" y usan IDs desde E-21.

## 1. Convenciones usadas

- `.phone` 360×640, borde 1 px `#333`, radio 24 px; `.screen-id` (insignia arriba a la izquierda con ID y título); `.annot` (nota amarilla `#fff7c2` en el margen); `system-ui`; grises `#111/#555/#999/#ddd/#f4f4f4`; primario `#333`.
- **Encabezado único** (52 px): emblema del grupo, nombre y código, avatares de integrantes (tocarlos = firmar), chip de red (`Sin red · todo funciona` / `Hub de la profe · 6 grupos` / `Trabajando solos` / `12 guardados aquí`). Debajo, **fila de miga de pan** con "‹ volver" y, a la derecha, los chips de estado: cámara activa (`solo tu mano · nada se guarda`, `mano + Señales`, `leyendo QR`, `sin cámara · usa el dedo`) y `Señales activas · sin cámara` (ojo de Rikuy abierto, IA sección 5).
- **Barra inferior única**: `Museo · Lab · Cerebro · Quipu · Yo`. Se oculta solo en la entrada (E-00). Botón flotante de Rikuy ("voz") en pantallas de exhibición.
- Objetivos táctiles ≥ 44 px (≥ 48 px en acciones primarias); el estado nunca se codifica solo con color; cada gesto tiene alternativa táctil.
- Demo dorada: marcos con aro negro grueso y etiqueta "★ Demo dorada n/22".

## 2. Pantallas (52)

| Flujo | IDs | Estado |
|---|---|---|
| A. Entrar | E-00a código/QR · E-00b grupo y avatares · E-00c cámara de manos (leído en voz alta) · E-00d aviso de Señales (Nivel 1) y opción del Nivel 2 · E-00e permiso de la familia (solo estado) · E-00f código no encontrado | E-00 Demo; E-00d/E-00e Prototipo |
| B. Museo | E-01 vestíbulo · E-01b sin hub · E-02 sala · E-03 placa · E-02b vitrina cerrada · E-02c sala vacía · **E-21** punto de encuentro (nueva) · E-04 Auditorio | Demo; E-21 Prototipo; E-04 Roadmap |
| C. Exhibición | E-05a guía de gestos · E-05b girar con la mano · E-05c sin cámara · E-05s selector de formatos (estados) · E-05d diagrama · E-05v video y audio · E-05q quiz · E-06 pregunta guía · E-07 predicción (tarjeta de hipótesis) | E-05: Demo (holograma, diagrama, audio), Prototipo (video, quiz) |
| D. Tutor y Señales | E-08a Rikuy por voz · E-08q pregunta en quechua (audio grabado) · E-08b escalera de pistas + recuerdo · E-08c tutor apagado · E-08n quechua sin audio · **E-20** oferta de ayuda · E-20b ajustes y pausa | E-08 Demo; E-20 Prototipo (Nivel 1) |
| E. Laboratorio | **E-22** Lab (inicio, nueva) · E-09 cronómetro · E-10 tabla · E-11 comparar (gráfica) · E-12 conclusión · E-12b nudo ganado | Demo; E-22 Prototipo |
| F. Entrega | E-17a Mi QR · E-17b incompleto · E-17c entregado | Demo |
| G. Cerebro | **E-19** Mi Cerebro Rikuy (mapa) · E-19e vacío · E-19n "¿por qué está así?" · E-14 cuaderno | E-19 Demo (nodos del péndulo); E-14 Prototipo |
| H. Quipu | E-15 quipu del grupo · E-15b quipu de la clase | E-15 Demo; E-15b Roadmap |
| I. Patio | E-13 retos · E-13b reto «Feria de Chivay» | Prototipo |
| J. Yo y estados | **E-23** Yo · E-18 lengua y audio · **E-24** red y pendientes · E-16 recibir «Para llevar» · **E-25** error real | E-16/E-18 Demo; E-23 a E-25 propuestas |

**Demo dorada (22 pasos)** según IA §7: E-00a, E-00b, E-00c, E-01, E-02, E-03, E-05a, E-05b, E-05d (un toque muestra el diagrama/audio), E-06, E-07, E-08a, E-08q (audio en quechua grabado), E-09, E-10, E-11, E-12, E-19 (nodos "longitud → periodo" con su cita), E-19n, E-12b (nudo del quipu), E-17a, E-17c. Señales (E-00d, E-00e, E-20, E-20b) quedan **fuera** de la demo en vivo y se muestran como pantallas etiquetadas.

## 3. Decisiones

1. **Barra de 5 pestañas pedida (Museo · Lab · Cerebro · Quipu · Yo)** en lugar de la de la IA (Museo · Cuaderno · Quipu · Mi QR · Lengua; sección 4). Mapeo: Museo = E-01/E-02/E-03/E-13/E-21; Lab = E-22 y todo el recorrido de una exhibición (E-05 a E-12); Cerebro = E-19 con E-14 (cuaderno) dentro; Quipu = E-15; Yo = E-23, que agrupa Mi QR (E-17), Lengua (E-18), Señales (E-20b), Red (E-24) y Para llevar (E-16). Hay que actualizar la sección 4 de la IA.
2. **Selector de formatos dentro de E-05**, como pide la IA: fila de pestañas `Holograma · Diagrama · Audio · Video · Quiz` con el formato activo resaltado. La placa (E-03) solo muestra sellos de formatos y un único botón "Entrar a la exhibición". E-05s dibuja los estados (listo / "se descarga al conectar").
3. **Señales como oferta, nunca como diagnóstico.** Nivel 1 (comportamiento, sin cámara ni micrófono) es el que se muestra: "¿Quieres una pista? Llevas un rato en este paso" con tres ofertas (pista, más despacio, pausa de 1 min) y "No, gracias". Cuenta lo que Rikuy **observó**, no lo que la persona **siente**. Indicador permanente en el encabezado. Nivel 2 (cámara y voz) solo con consentimiento por estudiante **y** permiso de la familia (E-00d/E-00e), omitido en la UE. Pausa y retiro pesan lo mismo que activar (E-20b). La docente ve solo conteos por grupo; las Señales no alimentan el Cerebro.
4. **El Cerebro usa el vocabulario de la IA** (razonado · por revisar · explorado · sin explorar) con relleno, borde y texto; "?" = pregunta abierta. Cada nodo explica su estado con la frase literal, fecha y exhibición (E-19n). Sin porcentajes ni comparaciones; filtros por sala y vista lista accesible.
5. **Presencia sin chat libre** (E-21): solo reacciones de lista cerrada (saludar, señalar, aplaudir, ayuda).
6. **Estados honestos como pantallas propias:** sin red nunca en rojo (E-24), vitrina cerrada (E-02b), sala vacía (E-02c), tutor apagado (E-08c), quechua sin audio revisado (E-08n), cámara denegada/gestos apagados (E-05c), formato sin descargar (E-05s), código inválido (E-00f), error real (E-25), cerebro vacío (E-19e), QR incompleto (E-17b).
7. **Quechua:** las cadenas son marcadores `[qu]` salvo saludos de uso común («Allin p'unchay»). No se inventa traducción; toda cadena `[qu]` espera a un hablante nativo y lleva sello de revisión. Nunca TTS en quechua.
8. **Datos de la demo coherentes con la física:** 25 / 50 / 100 cm → T = 1,03 / 1,40 / 2,09 s frente al modelo 1,00 / 1,42 / 2,01 s; error 4 % en 100 cm, promedio ≈ 3 %.

## 4. Inconsistencias entre documentos que conviene cerrar

- **"Sin detección de emociones" frente a Señales Nivel 2.** `VISION.md` y `ECOSISTEMA.md` 2.4 siguen diciendo "sin detección de emociones"/"cámara que no mira caras"; la IA y la arquitectura incluyen Señales (Nivel 2 = rostro y voz, inferencia de confusión/frustración). Los wireframes siguen la IA: Nivel 1 por defecto y en demo, Nivel 2 aislado y opcional. La frase "Rikuy te mira para que juegues, no para juzgarte" convive mal con una cámara que lee la cara; decidir una postura única antes del pitch.
- **Vocabulario de estados del Cerebro:** arquitectura 3.12 = `sin_explorar / explorado / en_camino / logrado`; IA E-19 = `explorado · razonado · por revisar`. Aquí se usa la IA.
- **Orden de formatos:** arquitectura 3.13 ofrece video, diagrama y quiz **después** de predecir; la IA/ECOSISTEMA los muestran desde E-05 (y la demo toca el diagrama antes de predecir). Aquí se sigue la IA.
- **Barra inferior** (IA §4) distinta de la pedida; ver decisión 1.
- **Consentimiento del Nivel 1:** la IA dice "nunca activas sin consentimiento" (sección 5) pero Nivel 1 no lleva consentimiento individual (solo flag de clase e indicador). Aquí se avisa en E-00d y se muestra el indicador siempre.

## 5. Preguntas abiertas

1. ¿Se conserva el Nivel 2 en el pitch? Opción de menor riesgo: demo solo con Nivel 1 y E-00c (manos); Nivel 2 como "estudio con consentimiento, no activado".
2. **Celular compartido y Nivel 2:** si solo 2 de 5 consienten, la arquitectura dice que ese dispositivo no usa la señal. ¿Aceptable para el aula real, o se enciende solo con el turno de quien firmó?
3. **Permiso de apoderados menores (Ley 29733):** ¿lo recoge la docente en papel, por WhatsApp o en F-01? ¿Dónde queda la prueba y cómo se retira? (E-00e solo muestra el estado.)
4. ¿El holograma antes de predecir revela demasiado (el péndulo oscila)? Alternativa: en E-05 mostrar el péndulo sin soltar y habilitar "Soltar" tras la predicción.
5. Peso de E-05v: video ≤ 60 s en el esquema frente a ≤ 180 s en el texto de 3.13; confirmar para precache.
6. ¿"Lab" es una pestaña con inicio propio (E-22: "Continuar" y datos propios) o el estado de la sesión actual? Confirmar con producto.
7. Variedad del quechua para interfaz y audios, y cuántas frases del repertorio cerrado caben en la demo.
8. Primaria (Inti): ¿versión solo con pictogramas y audio de E-01/E-13? Estas maquetas asumen lectura básica en secundaria.
9. Nudos por "explicar a otro grupo": ¿lo confirma la docente o el grupo ayudado? (E-12b y E-15 muestran "esperando confirmación").
10. Vista 3D del Cerebro (opcional en la IA): no se dibuja; ¿se justifica en celulares de gama baja?

## 6. Cómo revisar

Abrir `index.html` en el navegador. La franja "★ Demo dorada", el mapa de navegación del inicio y la barra superior saltan a cualquier flujo o pantalla; botones, miga de pan, barra inferior y la lista "Navega a" de cada margen son enlaces. Usar "atrás" del navegador para volver. Se verificó que no hay IDs duplicados, que todos los enlaces internos tienen destino y que ningún contenido desborda su marco de 360×640.
