import base from './playwright.config.ts';
import { defineConfig } from '@playwright/test';

// Local only (not committed): use the installed Chrome because the Playwright browser build is missing.
export default defineConfig({
  ...base,
  use: { ...base.use, launchOptions: { args: ['--ignore-certificate-errors'], executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  projects: (base.projects ?? []).map((p) => ({ ...p, use: { ...p.use, launchOptions: { args: ['--ignore-certificate-errors'], executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } } })),
});
