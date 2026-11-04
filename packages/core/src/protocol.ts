/**
 * Mensajes que viajan por el bus (WebSocket entre dispositivos o
 * BroadcastChannel dentro del mismo navegador).
 *
 * Roles:
 *  - display: el celular bajo la pirámide; renderiza el holograma.
 *  - control: otro celular o laptop; voz, gestos y botones.
 *  - panel:   vista del docente.
 */
import type { Command } from './tools.ts';
import type { LearningEvent } from './analytics.ts';

export type Role = 'display' | 'control' | 'panel';

export interface DisplayState {
  scene: string;
  running: boolean;
  variables: Record<string, number>;
  /** Métrica principal de la escena (actividad, periodo, frecuencia...). */
  readout?: { label: string; value: string };
}

export type BusMessage =
  | { type: 'hello'; role: Role; room: string; clientId: string }
  | { type: 'command'; commands: Command[]; from: Role }
  | { type: 'gesture'; dx: number; dy: number; dz: number; from: Role }
  | { type: 'say'; text: string; speaker: 'agente' | 'alumno' }
  | { type: 'state'; state: DisplayState }
  | { type: 'event'; event: LearningEvent }
  | { type: 'peers'; roles: Role[] };
