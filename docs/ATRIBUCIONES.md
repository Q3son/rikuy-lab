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

## Tutor, juez y memoria (F4)

- Juez con nivel, cita literal y "NO" (`aggregateRuns`, `sanitizeQuote`): portado de `Educacion/web/src/lib/judge/rubric.ts`, proyecto propio del equipo.
- Agente de reglas, escalera de pistas y herramientas: refactor del `rulesAgent.ts` y `tools.ts` de Rikuy Lab (código del equipo).
- Contrato de honestidad ("anunciar en futuro, confirmar con el resultado"), patrón del director que propone JSON y el código valida, e idea de memoria por alumno: patrones de [paoloose/aulaquipu](https://github.com/paoloose/aulaquipu) (`apps/web-app/lib/director.ts`, `backend/agents/aulaquipu-tutor`). Solo patrones, sin copiar código.
- Búsqueda por palabras clave: [MiniSearch](https://github.com/lucaong/minisearch) (MIT).

## Capa de IA y Creador (F7)

- [Willay](https://github.com/yughiyami/willay) (yughiyami): el patrón "la IA propone, la regla decide, la docente confirma" (`backend/willay/domain/tiers.py`) y la lógica de reintentos y presupuesto del adaptador de Meta (`backend/willay/adapters/meta_model_api.py`, `meta_usage.py`), portada de Python a TypeScript en `packages/ai/src/adaptadores/meta.ts` y en el presupuesto de `@rikuy/ai`. También la idea de pictogramas generados y revisados por la docente. Ver `docs/ecosistema/CREDITOS.md`.
