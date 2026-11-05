/**
 * Local-only runner for F5: reuses the root config on its own port (other fronts' worktrees may already
 * serve 4173) and can point Chromium at an installed build via RIKUY_CHROMIUM when the pinned browser
 * build is not downloaded. CI uses playwright.config.ts.
 */
import { defineConfig } from '@playwright/test';
import base from '../../playwright.config.ts';

const PORT = Number(process.env.RIKUY_E2E_PORT ?? 4185);
const executablePath = process.env.RIKUY_CHROMIUM;

export default defineConfig({
  ...base,
  testDir: '..',
  use: {
    ...base.use,
    baseURL: `https://localhost:${PORT}/`,
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: `npm run build -w @rikuy/web && npm run preview -w @rikuy/web -- --port ${PORT} --strictPort`,
    cwd: '../..',
    url: `https://localhost:${PORT}/`,
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
