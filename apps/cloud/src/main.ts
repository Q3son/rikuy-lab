/** Node entry point: `npm run dev -w @rikuy/cloud`. All configuration comes from environment variables. */
import { serve } from '@hono/node-server';
import { crearApp } from './app.ts';
import { crearDepsDesdeEntorno } from './deps.ts';
import { crearReportesDesdeEntorno } from './reportes/entorno.ts';

const env = process.env;
const deps = crearDepsDesdeEntorno(env, crearReportesDesdeEntorno(env));
const puerto = Number(env.PORT ?? 8788);

serve({ fetch: crearApp(deps).fetch, port: puerto }, () => {
  console.log(`[cloud] listening on :${puerto} (IA: ${deps.modo === 'simulado' ? 'simulated, no keys' : deps.modo})`);
});
