import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'node:path';

/**
 * HTTPS en desarrollo: los celulares solo permiten micrófono y cámara en
 * contextos seguros. Al abrir https://<IP-de-la-laptop>:5173 el navegador
 * avisa del certificado propio: "Avanzado" → "Continuar".
 */
export default defineConfig({
  plugins: [basicSsl()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
      '/ws': { target: 'ws://localhost:8787', ws: true },
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        display: resolve(import.meta.dirname, 'display.html'),
        control: resolve(import.meta.dirname, 'control.html'),
        panel: resolve(import.meta.dirname, 'panel.html'),
      },
    },
  },
});
