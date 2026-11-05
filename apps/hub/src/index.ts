/**
 * @rikuy/hub: local hub (Hono + node:sqlite + one multiplexed WebSocket for sync, presence and
 * the hologram bus + Ollama proxy). `main.ts` is the CLI entry point; this module is the API.
 */
export const packageName = '@rikuy/hub' as const;

export { createHub, channelOf, type HubOptions, type RunningHub } from './server.ts';
export { readConfig, type HubConfig } from './config.ts';
export { SqliteEventLog } from './log/sqlite-log.ts';
export { SyncHub } from './sync/sync-hub.ts';
export { HoloRelay } from './bus/holo-relay.ts';
export { TutorService, type LocalModel } from './ia/tutor.ts';
export { OllamaModel } from './ia/ollama.ts';
