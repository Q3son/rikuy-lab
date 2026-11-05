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

- Ecosistema Museo Rikuy: shell React, entrada de docente y grupos, panel "Mi clase", tutor con juez de razonamiento y memoria por alumno, Creador de prácticas alineadas al CNEB, hub local y más de 1 800 pruebas.
- Mejoras del holograma: calibración, pantalla completa, gestos con aviso visible y péndulo simulado.
- Correcciones de CI para publicar en GitHub Pages; sección de uso de IA y ética en el README.
- Conversación socrática con memoria del paso (`packages/tutor/src/dialogo`): guiones del péndulo y la lactasa, pistas graduales con "no sé", respuestas en partes, definiciones y órdenes de voz al holograma, sin bucles. Integrada al control del holograma.
- Evolución: la versión clásica del 4 de noviembre (`clasico.html`) deja la pantalla de inicio y queda como respaldo, accesible por su URL.

- Pruebas en aula simulada con los celulares del equipo.
- Video de 3 minutos y presentación de 5 minutos.
- Entrega antes de las 23:59.
