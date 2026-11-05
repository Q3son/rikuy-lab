/**
 * Start the hub: `npm start -w @rikuy/hub` (see apps/hub/README.md).
 * Prints the LAN URLs, the discovery page, the hologram room page and the teacher token.
 */
import { mkdirSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readConfig } from './config.ts';
import { OllamaModel } from './ia/ollama.ts';
import { createHub } from './server.ts';

const config = readConfig(process.env, dirname(fileURLToPath(import.meta.url)));
mkdirSync(dirname(config.dbPath), { recursive: true });

const hub = createHub({
  dbPath: config.dbPath,
  webDist: config.webDist,
  open: config.open,
  adminToken: config.adminToken,
  publicUrl: config.publicUrl,
  model: config.ollama ? new OllamaModel(config.ollama) : null,
  interfaces: networkInterfaces,
});

const running = await hub.listen(config.port, config.host);
const main = running.urls[0]!;
console.log(`
Rikuy hub listo
  Abrir en los celulares:   ${running.urls.join('  ')}
  Descubrir (QR):           ${main}descubrir
  Sala de holograma (QR):   ${main}holo
  Panel docente (token):    ${main}api/clases?token=${running.adminToken}
  IA local:                 ${config.ollama ? `${config.ollama.baseUrl} (${config.ollama.model}); si no responde, reglas` : 'reglas (sin OLLAMA_URL)'}
  Datos:                    ${config.dbPath}
  Modo abierto (sin MAC):   ${config.open ? 'sí' : 'no'}
`);

const stop = async () => {
  await running.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
