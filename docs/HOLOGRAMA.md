# Holograma: construcción e interacción

## Dos formas de proyectar

| | Pirámide (4 caras) | Cajita (1 lámina a 45°) |
|---|---|---|
| Modo en ⚙ | Pirámide | Cajita |
| Se ve desde | 4 lados | 1 lado |
| Imagen | 4 vistas en cruz | 1 vista centrada |
| Espejo | Normalmente no | **Sí**: el reflejo invierte izquierda/derecha |

Ambas usan el efecto *Pepper's ghost*: la lámina transparente refleja la pantalla y el negro no se refleja.
Por eso el fondo es negro absoluto y conviene una pantalla AMOLED con brillo al máximo, en un ambiente con poca luz.

## Pirámide para celular (referencia)

Trapecio de acetato o mica de 0.5 mm, 4 piezas iguales:

- base mayor 6 cm · base menor 1 cm · altura 3.5 cm (para pantallas de 6.5"; escalar en proporción)
- unir con cinta transparente, base menor hacia abajo, al centro de la pantalla
- en ⚙ ajustar *Hueco central* hasta que el cuadrado vacío del centro coincida con la base menor
  y *Tamaño* hasta que cada vista llene su cara

## Espejo y orientación

- **⇋ Espejo**: si el modelo aparece invertido (por ejemplo el hígado a la izquierda cuando debería estar a la derecha).
- **⇅ Voltear**: si la imagen sale de cabeza en la lámina.
- **↻**: gira todo el lienzo 90° (útil si el celular queda en horizontal).

Se guarda en el dispositivo. También por URL: `display.html?modo=cajita&espejo=1`.
Para videos ya grabados: CapCut → Editar → Espejo (y Rotar 180° si sale de cabeza).

## Cómo mover y ampliar el holograma

La pantalla del proyector queda tapada por la pirámide, así que hay cuatro caminos:

1. **Control remoto (recomendado)**: otro celular con `control.html` en la misma sala.
   Arrastrar en el panel táctil = girar, pellizcar = zoom, botones para centrar, separar partes, correr y pausar.
2. **Voz**: "gíralo a la izquierda", "acércalo", "llévame al intestino", "separa las partes", "centra la vista".
   Desde el control (mantener para hablar) o desde el propio proyector (🎙 esquina inferior derecha).
3. **Gestos de mano** (✋ en ajustes o en el control): palma abierta y mover = girar; pinza pulgar-índice = zoom;
   puño = pausa; pulgar arriba = correr. Se procesa en el dispositivo con MediaPipe; la cámara frontal del
   celular del control o la webcam de la laptop funcionan mejor que la del proyector.
4. **Toque directo**: las esquinas de la pantalla del proyector quedan libres de la pirámide; arrastrar sobre
   el lienzo gira y pellizcar hace zoom.

Si nadie interactúa por 6 s, el modelo gira solo.

## Celulares probados por el equipo

| Rol | Equipo | Nota |
|---|---|---|
| Proyector | Redmi Note 15 | AMOLED, muy brillante: el mejor para la pirámide |
| Proyector alterno | POCO X5 Pro | AMOLED |
| Grabar el video | OPPO A79 / Redmi 15 | |
| Respaldo | vivo Y11 | |
