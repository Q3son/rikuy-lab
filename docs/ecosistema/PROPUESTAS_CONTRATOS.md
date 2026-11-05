# Propuestas de cambio a `@rikuy/contracts`

> Los frentes no editan `packages/contracts/` (5.5). Cada frente anota aquí lo que necesita; el dueño del Sprint 0 lo aplica por PR como cambio **aditivo** (campos opcionales, tipos de evento nuevos). Mientras tanto, cada frente trabaja con tipos locales equivalentes y adaptadores simulados.

## F5. Museo Rikuy y retos

### F5-1. Eventos del Ayudante del museo (FUNCIONES_EXTRA §2.4)

Hoy viven como tipos locales en `packages/campus/src/ayudante.ts` (`EventoAyuda`) y se registran en el log en memoria de `apps/web/src/features/mundo/eventos.ts`.

```ts
// TIPOS_EVENTO += (ninguno es de autoridad docente salvo los dos de quipu.nudo.*)
'ayuda.pedida'    datos: { pedidoId, grupoPideId: Ulid, exhibicionId, nodoId, necesidad: 'otras_palabras'|'como_medir'|'revisar_dato' }
'ayuda.ofrecida'  datos: { ofertaId, pedidoId, grupoAyudaId: Ulid }
'ayuda.aceptada'  datos: { pedidoId, ofertaId, grupoAyudaId: Ulid }
'ayuda.cerrada'   datos: { pedidoId, resultado: 'nos_ayudo'|'casi'|'aun_no', nivelJuez?: 'razonado'|'explorado'|'no_evaluable' }
'quipu.nudo.confirmado' (autoridad docente cuando la regla de la clase es "docente confirma")
                  datos: { nudoId, pedidoId, motivo: 'ayudo_a_otro_grupo', nodoId,
                           beneficiarios: [{ tipo: 'grupo', grupoId }, { tipo: 'aula' }] }
'quipu.nudo.revocado'  (autoridad docente) mismos datos; F10 lo traduce en un AsientoQuipu de corrección (`corrigeA`)
```

- Todos `strictObject`: **sin texto libre** hacia otros grupos. La frase "con tus palabras" del grupo que pide **no** viaja en `ayuda.cerrada`; solo el nivel del juez. Si F4 quiere la cita, va por `respuesta.registrada` como hoy.
- Esquemas propuestos `PedidoAyuda`, `OfertaAyuda`, `CierreAyuda` = las interfaces de `ayudante.ts`.
- `MotivoQuipu` ya tiene `ayudo_a_otro_grupo`: se reutiliza (FUNCIONES_EXTRA lo escribe `ayuda_a_otro_grupo`; se propone **no** agregar el sinónimo).

### F5-2. Mensajes de tiempo real del Ayudante (`rt.*`, para F8)

```ts
// cliente → hub
| { t: 'rt.ayuda', a: AccionAyudante }   // acciones de la máquina de estados (pedir, responder, cerrar, cancelar); strict, sin texto libre
// hub → cliente
| { t: 'rt.ayuda.estado', pedidos: PedidoAyuda[] }  // solo los pedidos que le tocan a ese grupo + los abiertos (anónimos: emblema, sin integrante)
```

El hub (o el celular de la docente) es la autoridad que aplica `aplicar()` de `@rikuy/campus`.

### F5-3. Reacciones extendidas (FUNCIONES_EXTRA §2.7)

`Reaccion = z.enum(['saludar','senalar','aplaudir','ayuda','gracias','ya_entendi','ahora_no'])` (lista cerrada y versionada). La UI hoy usa solo las 4 del contrato.

### F5-4. Rutas

`RUTAS.reto = '/retos/:retoId'` y `RUTAS.museoLista = '/museo/lista'`, `RUTAS.museoAyudas = '/museo/ayudas'` (T-23). Hoy `rutaDeReto()` en `packages/campus/src/salas.ts` construye `/retos/<id>` a mano.

### F5-5. Apariencia de la piedra del grupo (FUNCIONES_EXTRA §3.2 función 1)

```ts
Grupo.piedra?: { nombre: string /* 2-16, de una lista de sílabas o validado sin enlaces ni números de teléfono */,
                 cordon: 'sol'|'grana'|'ichu'|'laguna'|'tierra', marco: 'tinta'|'sol'|'laguna' }
evento 'grupo.piedra' datos: { grupoId, piedra }   // cosmético; desbloqueos leídos del quipu (F10)
```

### F5-6. Dependencias (2.3)

`campus → cerebro` (solo lectura de estado de nodo) se evita con un puerto local (`estadoNodo` en `ContextoAyudante`); no hace falta cambiar `.dependency-cruiser.cjs`. Se pide que F10 exponga `estadoNodo(grupoId, nodoId)` agregando a nivel de grupo ("algún integrante razonado").

### F5-7. Colores de sala faltantes (DESIGN.md, no es contrato)

Taller, Patio de juegos y Auditorio no tienen color de sala en DESIGN.md. Provisionalmente: Taller = `ink-2`, Patio = `sol`, Auditorio = `ink`; glifos `taller`, `juego`, `usuarios`.
