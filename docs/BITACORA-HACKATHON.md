# Bitácora Hack4Edu 2026

Modalidad innovadora: el código se desarrolla dentro del hackathon. El historial de commits y ramas
de este repositorio es la evidencia.

## Flujo de trabajo

- `main`: versión estable para la demo y la entrega.
- `develop`: integración.
- `feature/*`, `docs/*`, `chore/*`: una rama por pieza, unida a `develop` con merge (`--no-ff`) para conservar el historial.

## 3 de noviembre

- Definición del reto (17, ProFuturo), usuarios y propuesta de valor.
- Pruebas físicas con la cajita y la pirámide; decisión de soportar espejo en software.

## 4 de noviembre

- Monorepo (`packages/core`, `apps/server`, `apps/web`).
- Núcleo: currículo, física, herramientas del agente, analítica de aprendizaje, agente de reglas, pruebas.
- Servidor: agente LLM con validación de herramientas y respaldo sin conexión, relay de salas, eventos, panel.
- Web: renderer holográfico (pirámide, cajita, normal) con espejo y volteo, transiciones de partículas,
  9 escenas, voz, toque, gestos de mano, control remoto, panel docente, PWA.

## 5 de noviembre

- Pruebas en aula simulada con los celulares del equipo.
- Video de 3 minutos y presentación de 5 minutos.
- Entrega antes de las 23:59.
