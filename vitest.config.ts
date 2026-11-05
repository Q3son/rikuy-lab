import { defineConfig } from 'vitest/config';

/**
 * Root test runner. Each workspace is a Vitest project (Vitest 4+ replaced
 * `vitest.workspace.ts` with `test.projects`). Packages without their own
 * config run in Node with the defaults; apps/web brings jsdom + React.
 */
export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
    passWithNoTests: true,
  },
});
