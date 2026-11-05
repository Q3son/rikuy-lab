import { defineConfig } from 'vitest/config';

/** Component tests: jsdom + React Testing Library (JSX is compiled by Vite from the tsconfig). */
export default defineConfig({
  test: {
    name: '@rikuy/ui',
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    passWithNoTests: true,
  },
});
