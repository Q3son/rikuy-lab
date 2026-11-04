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
| **Proyector** (`display.html`) | Holograma en 4 vistas (pirámide), 1 vista (cajita) o normal. Espejo, volteo, rotación y tamaño ajustables. Toque, voz y gestos de mano. |
| **Control del grupo** (`control.html`) | Mantener para hablar, panel táctil para girar y hacer zoom, deslizadores de variables, botones de escena. |
| **Panel docente** (`panel.html`) | Tipos de pregunta, razonamiento (variable · predicción · justificación), mapa de conceptos explorados, frases que sustentan cada indicador y una sugerencia por grupo. Orienta, no califica. |
| **Tutor** (`apps/server`) | Agente con herramientas (`ir_a`, `fijar_variable`, `rotar`, `zoom`, `dar_pista`...). Funciona con Claude, con un modelo local vía Ollama o, sin nada, con un agente de reglas. |

## Probar solo con el celular

Abrir **https://q3son.github.io/rikuy-lab/** en Chrome, elegir *Proyector*, poner el
celular bajo la pirámide o la cajita y usar el micrófono 🎙 de la esquina.
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
npm test          # pruebas del núcleo (node:test)
npm run typecheck
npm run build
```

## Privacidad

Los grupos usan seudónimos (G1…G8). La cámara de gestos procesa la mano en el
dispositivo y no guarda imágenes. Los eventos se guardan en el servidor del aula
(`data/<sala>.jsonl`).

## Licencia

MIT. Créditos de terceros en [docs/ATRIBUCIONES.md](docs/ATRIBUCIONES.md).
