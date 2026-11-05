/**
 * Local-only runner for F5 when the pinned Playwright browser build is not downloaded: reuses the root
 * config and points Chromium at an already installed build (RIKUY_CHROMIUM). CI uses playwright.config.ts.
 */
import { defineConfig } from '@playwright/test';
import base from '../../playwright.config.ts';

const executablePath = process.env.RIKUY_CHROMIUM;

export default defineConfig({
  ...base,
  testDir: '..',
  use: { ...base.use, ...(executablePath ? { launchOptions: { executablePath } } : {}) },
  webServer: base.webServer
    ? { ...(base.webServer as object), command: 'npm run build -w @rikuy/web && npm run preview -w @rikuy/web -- --port 4173 --strictPort', cwd: '../..' } as never
    : undefined,
});
