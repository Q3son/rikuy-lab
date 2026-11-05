# Rikuy Lab

Laboratorio de ciencias holográfico y agéntico para colegios sin laboratorio.
Hack4Edu 2026 · Reto 17 (ProFuturo) · modalidad innovadora.

*Rikuy* significa "ver" en quechua. Un celular bajo una pirámide de acetato
(o una cajita con una lámina a 45°) proyecta modelos 3D que flotan en el aire.
Los estudiantes le hablan a un tutor que **transforma la escena** (del sistema
digestivo al intestino, a la vellosidad, al enterocito y a la lactasa rompiendo
lactosa), **cambia variables** de la simulación y **responde con preguntas**,
sin dar la respuesta. El docente ve en un panel qué está entendiendo cada grupo.

## Qué incluye

| Pieza | Qué hace |
|---|---|
| **Museo Rikuy** (inicio) | Entrada para la docente y para los grupos con código de clase; salas por área del CNEB, exhibiciones con holograma, tutor, juez de razonamiento, memoria por alumno y panel "Mi clase". Ver [docs/ecosistema/ECOSISTEMA.md](docs/ecosistema/ECOSISTEMA.md). |
| **Proyector** (`display.html`) | Holograma en 4 vistas (pirámide), 1 vista (cajita) o normal. Espejo, volteo, rotación y tamaño ajustables. Toque, voz y gestos de mano. |
| **Control del grupo** (`control.html`) | Mantener para hablar, panel táctil para girar y hacer zoom, deslizadores de variables, botones de escena. |
| **Panel docente** (`panel.html`) | Tipos de pregunta, razonamiento (variable · predicción · justificación), mapa de conceptos explorados, frases que sustentan cada indicador y una sugerencia por grupo. Orienta, no califica. |
| **Tutor** (`apps/server`) | Agente con herramientas (`ir_a`, `fijar_variable`, `rotar`, `zoom`, `dar_pista`...). Funciona con Claude, con un modelo local vía Ollama o, sin nada, con un agente de reglas. |

## Probar solo con el celular

Abrir **https://q3son.github.io/rikuy-lab/#/holo** en Chrome: un celular como proyector bajo la
pirámide y otro como control, o un solo celular. En el control, **Habla con Rikuy** conversa por voz
sobre el péndulo o la lactasa: evalúa cada respuesta, da pistas con "no sé" y mueve el holograma
("pon la longitud en 2 metros", "suéltalo").
Esta versión no necesita laptop ni servidor: el tutor de reglas corre en el navegador.
Para que otro celular sea el control remoto y para el panel docente con varios grupos,
hace falta el servidor (sección siguiente).

## Arrancar

Requisitos: Node.js 22 o superior.

```bash
npm install
cp .env.example .env      # opcional: sin cambios funciona con el agente de reglas
npm run dev
```

- Laptop: `https://localhost:5173`
- Celulares en la misma red WiFi: `https://<IP-de-la-laptop>:5173`
  (aceptar el aviso del certificado: es local y hace falta para el micrófono y la cámara).

Elegir el rol en la pantalla de inicio con el mismo código de **sala** en todos los
dispositivos. También se puede abrir directo:

```
/display.html?sala=aula1&modo=piramide&escena=digestivo
/display.html?sala=aula1&modo=cajita&espejo=1
/control.html?sala=aula1&grupo=G3
/panel.html?sala=aula1
```

Para el aula: `npm run build && npm start` sirve todo desde `http://<IP>:8787`
(para voz en celulares usar `npm run dev` o un proxy HTTPS).

## Holograma: espejo y orientación

En el proyector, tocar ⚙ (esquina superior izquierda):

- **Pirámide**: 4 vistas en cruz. Ajustar *Tamaño* y *Hueco central* a la base de la pirámide.
- **Cajita**: una sola vista centrada para una lámina a 45°.
- **⇋ Espejo** si el modelo o el texto se ven invertidos en el reflejo; **⇅ Voltear** si salen de cabeza; **↻** gira el lienzo 90°.

Teclado: flechas giran · `+`/`-` zoom · `M` espejo · `F` voltear · espacio micrófono · `S` ajustes.
Detalles de construcción e interacción en [docs/HOLOGRAMA.md](docs/HOLOGRAMA.md).

## Estructura

```
packages/core   currículo, física, herramientas del agente, analítica, agente de reglas (sin dependencias)
apps/server     Express + WebSocket: agente LLM, relay de salas, eventos, panel
apps/web        Vite + Three.js: proyector, control, panel
docs/           arquitectura, holograma, bitácora del hackathon
```

Ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) para el diseño y cómo agregar escenas o cursos.

## Pruebas

```bash
npm test          # más de 1 800 pruebas (vitest)
npm run typecheck
npm run build
```

## Uso ético y responsable de la IA

| Cuidado | Cómo se aplica en Rikuy |
|---|---|
| Privacidad | Grupos y alumnos con seudónimo; sin nombres reales, DNI ni fotos. No se guarda audio: solo el texto de la pregunta, la hipótesis y la conclusión. La cámara de gestos procesa la mano en el dispositivo y no guarda imágenes. Los datos se quedan en el servidor del aula; quien financia solo ve agregados. |
| Datos de prueba | Toda la demo usa datos inventados (clase "2.º B", grupos G1 a G8). Ningún dato real de estudiantes se envió a una herramienta de IA. |
| La IA no hace la tarea | El tutor no entrega la respuesta: pide una predicción, da pistas graduales y registra cuántas usó el grupo. |
| Revisión de errores | La IA propone y el código valida: herramientas con esquema, escenas y rangos verificados; lo inválido se descarta. El juez exige una cita literal del alumno y marca "dudoso" para revisión docente. La docente aprueba cada práctica generada antes de que llegue al aula. |
| Transparencia | El tutor dice cuándo la simulación simplifica la realidad. Cada indicador del panel muestra las frases que lo sustentan. |
| Sesgos | Los indicadores orientan, no califican ni etiquetan; no hay rankings. Los textos en quechua llevan aviso de revisión pendiente hasta que un hablante los valide. |
| Acceso con pocos recursos | Funciona con el celular que ya existe y una pirámide de menos de S/ 3, sin internet (tutor de reglas y app instalable). |

## Uso de IA en el desarrollo

| Herramienta | Para qué la usamos | En qué parte del proyecto | Cómo lo revisamos |
|---|---|---|---|
| Claude (Anthropic), asistente de código | Investigar el reto y las bases, proponer la arquitectura, generar primeras versiones de funciones y pruebas, depurar | Núcleo (`packages/core`), servidor, renderer holográfico, escenas, panel, ecosistema | Pruebas automáticas, ejecución en celulares reales, revisión y explicación del código en equipo |
| Claude (Anthropic), redacción | Reporte, guía de trabajo de campo, guiones del pitch y del video, documentación | `docs/`, presentación | Contraste con las bases oficiales y fuentes citadas; edición del equipo |

IA dentro del producto (opcional, siempre con respaldo sin IA):

| Modelo | Uso | Respaldo |
|---|---|---|
| Claude, Gemini o Meta vía API | Tutor por voz, revisión de prácticas, lectura del plan docente | Agente y juez de reglas en el dispositivo |
| Modelo local con Ollama | Tutor y revisión sin internet en la laptop del aula | Agente y juez de reglas |

## Evidencia de desarrollo

Todo el código se escribió entre el 3 y el 5 de noviembre de 2026. El historial del
repositorio lo muestra: ramas por funcionalidad (`feature/*`, `fix/*`, `docs/*`) unidas
a `develop` y `main` con merge, y la bitácora en [docs/BITACORA-HACKATHON.md](docs/BITACORA-HACKATHON.md).

## Licencia

MIT. Créditos de terceros en [docs/ATRIBUCIONES.md](docs/ATRIBUCIONES.md).
