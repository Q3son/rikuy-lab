# Atribuciones

Todo el código de este repositorio se escribió durante Hack4Edu 2026 (3–5 de noviembre) y se publica bajo MIT.

## Dependencias

| Proyecto | Uso | Licencia |
|---|---|---|
| [three.js](https://threejs.org) | Render 3D, `MeshSurfaceSampler`, `GLTFLoader` | MIT |
| [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer) | Reconocimiento de gestos de mano en el dispositivo | Apache 2.0 |
| [Vite](https://vite.dev) y `@vitejs/plugin-basic-ssl` | Desarrollo y empaquetado; HTTPS local | MIT |
| [Express](https://expressjs.com) | Servidor HTTP | MIT |
| [ws](https://github.com/websockets/ws) | Relay WebSocket de salas | MIT |
| [tsx](https://tsx.is) | Ejecutar TypeScript en el servidor | MIT |

## Referencias consultadas (sin copiar código)

- Petroochio, *cracked-pepper*: composición de 4 vistas para pirámide en el navegador.
- Electric Archaeology, display holográfico de museo con Three.js.
- MDN, Web Speech API (`SpeechRecognition`, `speechSynthesis`).

## Modelos 3D

Las escenas incluidas son procedurales (generadas por código). Si se agregan `.glb` en
`apps/web/public/models/`, registrar aquí su autor y licencia.

## Proyectos del equipo integrados en Rikuy

Todo lo que sigue es autoría del equipo Rikuy y se desarrolló o integró durante Hack4Edu 2026.

- **Juez del tutor** (nivel, cita literal y "no evaluable": `aggregateRuns`, `sanitizeQuote`): desarrollado por el equipo durante el hackathon.
- **Agente de reglas, escalera de pistas y herramientas**: evolución del `rulesAgent.ts` y `tools.ts` de Rikuy Lab.
- **[AulaQuipu](https://github.com/paoloose/aulaquipu)**, proyecto del equipo: se integran y adaptan al Museo Rikuy el patrón del director que propone acciones en JSON y el código valida, el contrato de honestidad del tutor, la memoria por alumno, las reglas del chat de proximidad (`packages/campus/src/charla.ts`, "Charla de cerca"), la guía que traza el camino en el piso (`apps/web/src/features/escritorio/guia.ts`) y el HUD de la vista de escritorio (`MuseoEscritorio.tsx`, `ObservarMuseo.tsx`). No se usa arte de terceros ni servicios con credenciales; la voz en vivo queda como un gancho apagado (`vozEnVivo.ts`).
- **[Willay](https://github.com/yughiyami/willay)**, proyecto de Daniel, integrante del equipo: se integra el patrón "la IA propone, la regla decide, la docente confirma", la lógica de reintentos y presupuesto del adaptador de modelos (`packages/ai/src/adaptadores/meta.ts`) y la idea de pictogramas revisados por la docente.

## Bibliotecas adicionales

- Búsqueda por palabras clave: [MiniSearch](https://github.com/lucaong/minisearch) (MIT).

Ver también `docs/ecosistema/CREDITOS.md` para las ideas de producto que inspiraron el ecosistema.
