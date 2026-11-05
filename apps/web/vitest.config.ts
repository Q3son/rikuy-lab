import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Component tests: jsdom + React. Kept apart from vite.config.ts (no HTTPS or PWA plugin in tests). */
export default defineConfig({
  plugins: [react()],
  test: {
    name: '@rikuy/web',
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
