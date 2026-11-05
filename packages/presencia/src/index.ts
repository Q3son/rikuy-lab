/**
 * @rikuy/presencia: Museum real-time protocol: presence, positions, rooms, teacher orders (3.9).
 * Pure and transport-agnostic: the hub (apps/hub) and the Android hub drive it with sockets and timers.
 */
export const packageName = '@rikuy/presencia' as const;

export * from './servidor.ts';
export * from './propuestas.ts';
export * from './cliente.ts';
