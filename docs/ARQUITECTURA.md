# Arquitectura

## Vista general

```
 ┌─────────────── aula (misma red WiFi, sin internet si hace falta) ───────────────┐
 │                                                                                  │
 │  Celular bajo la pirámide        Celular / laptop del grupo     Laptop docente   │
 │  display.html                    control.html                   panel.html       │
 │  Three.js + HoloRenderer         voz · táctil · gestos          resumen en vivo  │
 │        ▲  state                        │ command / gesture            ▲          │
 │        └──────────── WebSocket /ws (sala) ─────────────────┐          │          │
 │                                                            │          │          │
 │                     apps/server (Node)                     ▼          │          │
 │   POST /api/agent ──► agente LLM (Claude | Ollama) ─► fallback reglas │          │
 │   POST /api/events ─► JsonlEventStore (data/<sala>.jsonl)             │          │
 │   GET  /api/dashboard ─► summarize() ─────────────────────────────────┘          │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

Todo lo pedagógico vive en `packages/core`, sin dependencias, y se usa igual en
el servidor y en el navegador. Si el servidor o internet fallan, el navegador
sigue funcionando con el mismo agente de reglas y la misma analítica.

## Núcleo (`packages/core`)

| Archivo | Responsabilidad |
|---|---|
| `curriculum.ts` | Conceptos (con sistema, nivel, sinónimos, escena), relaciones y prácticas (variables, pregunta guía, pistas, limitaciones). **Es lo que se cambia para otro curso.** |
| `physics.ts` | Modelos simples y explicables: actividad de la lactasa por temperatura y pH, periodo del péndulo, frecuencia respiratoria por altitud. |
| `tools.ts` | Herramientas del agente (`Command`) y su esquema JSON para el LLM. El servidor descarta cualquier llamada que no cumpla el esquema. |
| `analytics.ts` | Clasifica preguntas (factual, causal, hipotética, relacional), puntúa hipótesis (variable · predicción · justificación), detecta conexiones entre sistemas y resume por grupo con evidencias y una sugerencia. |
| `rulesAgent.ts` | Tutor socrático sin LLM: navega, manipula la vista, fija variables, da pistas graduales y registra hipótesis y conclusiones. |
| `protocol.ts` | Mensajes del bus entre dispositivos. |

## Agente

1. El texto del estudiante llega a `POST /api/agent` con el contexto (práctica, escena, variables, pistas usadas).
2. El LLM recibe las herramientas de `tools.ts` más `analizar_turno` (obligatoria), que devuelve la clasificación para el panel.
3. `assemble()` valida cada llamada: escena existente, variable de la práctica, rangos. Lo inválido se descarta.
4. Si el LLM no responde en el tiempo límite o no hay clave, responde `rulesAgent`.
5. El cliente ejecuta los comandos en el proyector y registra los eventos.

Reglas del tutor (prompt de sistema): no da la respuesta, pide predicción antes de correr la simulación,
pistas en tres niveles, admite las limitaciones del modelo.

## Holograma (`apps/web/src/holo`)

- `HoloRenderer`: 4 cámaras a 90° alrededor del modelo → 4 texturas → composición ortográfica en cruz,
  cada vista con "arriba" hacia afuera. Espejo/volteo/rotación se aplican como signos de escala y giro
  sobre la composición, así funcionan igual en pirámide, cajita y normal. Fondo negro absoluto.
- `ViewController`: giro, inclinación y zoom suavizados; acepta deltas de toque, gestos, agente y bus.
  Tras 6 s sin interacción vuelve un giro lento.
- `SceneManager`: cola de transiciones; la escena actual se disuelve en partículas
  (`MeshSurfaceSampler`) que se reagrupan en la siguiente. Si existe `public/models/<id>.glb`,
  reemplaza al modelo procedural sin tocar código.

## Agregar una escena

1. Crear un módulo en `apps/web/src/scenes/` que cumpla `SceneModule` (`build`, opcional `update`, `readout`, `highlight`, `explode`).
2. Registrarlo en `scenes/registry.ts` y su id en `SCENE_IDS` (`packages/core/src/tools.ts`).
3. Agregar el concepto en `curriculum.ts` con `sceneId` y sinónimos para que el agente lo encuentre.
4. Opcional: un `.glb` en `apps/web/public/models/<id>.glb`.

## Llevarlo a otro curso o carrera

Un curso es un archivo de currículo: conceptos con sistema y nivel, relaciones, prácticas con variables y pistas.
El agente, la analítica y el panel no cambian. Para Medicina, por ejemplo, los "sistemas" pasan a ser
asignaturas de la malla y `isRelational` detecta cuando un estudiante conecta conceptos de dos cursos.

## Sin internet

| Pieza | Sin internet |
|---|---|
| Web | Service worker guarda la app; servidor en la laptop del aula. |
| Tutor | Agente de reglas, u Ollama local con `LLM_PROVIDER=openai`. |
| Voz | Depende del navegador: Chrome en Android reconoce voz sin red si tiene el idioma descargado. Siempre queda escribir. |
| Gestos | Copiar el `.wasm` y el `.task` de MediaPipe a `apps/web/public/mediapipe/`. |
| Analítica | Cola en el dispositivo; se sincroniza cuando vuelve la red. |
