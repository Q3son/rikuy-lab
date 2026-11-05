import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

/**
 * HTTPS en desarrollo: los celulares solo permiten micrófono y cámara en
 * contextos seguros. Al abrir https://<IP-de-la-laptop>:5173 el navegador
 * avisa del certificado propio: "Avanzado" → "Continuar".
 */
export default defineConfig({
  // Rutas relativas: funciona en la raíz del servidor del aula y en
  // subcarpetas como https://q3son.github.io/rikuy-lab/
  base: './',
  plugins: [react(), tailwindcss(), basicSsl()],
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
        // React SPA (hash router)
        index: resolve(import.meta.dirname, 'index.html'),
        // Classic hologram pages (vanilla code in legacy/), kept until F1/F3 port them (5.1)
        clasico: resolve(import.meta.dirname, 'clasico.html'),
        display: resolve(import.meta.dirname, 'display.html'),
        control: resolve(import.meta.dirname, 'control.html'),
        panel: resolve(import.meta.dirname, 'panel.html'),
      },
    },
  },
});
