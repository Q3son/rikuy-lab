/** Hub configuration from environment variables (see apps/hub/README.md). */
import { resolve } from 'node:path';

export interface HubConfig {
  port: number;
  host: string;
  dbPath: string;
  webDist: string;
  open: boolean;
  adminToken: string | undefined;
  publicUrl: string | undefined;
  ollama: { baseUrl: string; model: string; embedModel: string } | null;
}

export function readConfig(env: Record<string, string | undefined>, srcDir: string): HubConfig {
  const port = Number(env.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`invalid PORT: ${env.PORT}`);
  const dataDir = env.HUB_DATA_DIR ? resolve(env.HUB_DATA_DIR) : resolve(srcDir, '../data');
  return {
    port,
    host: env.HOST ?? '0.0.0.0',
    dbPath: resolve(dataDir, 'hub.sqlite'),
    webDist: env.HUB_WEB_DIST ? resolve(env.HUB_WEB_DIST) : resolve(srcDir, '../../web/dist'),
    open: env.HUB_OPEN === '1' || env.HUB_OPEN === 'true',
    adminToken: env.HUB_TOKEN || undefined,
    publicUrl: env.HUB_PUBLIC_URL || undefined,
    ollama: env.OLLAMA_URL
      ? { baseUrl: env.OLLAMA_URL, model: env.OLLAMA_MODEL ?? 'qwen2.5:3b', embedModel: env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text' }
      : null,
  };
}
