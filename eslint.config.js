// Flat ESLint config. Architecture rules that are about imports between packages live in
// .dependency-cruiser.cjs; this file covers code-level rules (2.3, 4.6, 4.9).
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const DOMAIN = [
  'contracts', 'core', 'curriculum-cneb', 'lab-engine', 'tutor', 'sync', 'evidencia', 'memoria',
  'reportes', 'quipu', 'presencia', 'senales', 'cerebro', 'retos', 'lenguas', 'mensajeria',
];

/** No network, storage or media capture where frames, audio or signals could leak (4.6, 4.9). */
const NO_LEAK_GLOBALS = ['fetch', 'XMLHttpRequest', 'WebSocket', 'MediaRecorder', 'indexedDB'].map((name) => ({
  name,
  message: 'Forbidden here: nothing captured by the camera, microphone or signals may leave this module (4.6, 4.9).',
}));
const NO_LEAK_PROPERTIES = ['toBlob', 'toDataURL'].map((property) => ({
  property,
  message: 'Frames are never exported (4.6, 4.9).',
}));

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**', '**/dist/**', '**/coverage/**', 'playwright-report/**', 'test-results/**',
      'apps/web/legacy/**', 'apps/server/**', 'apps/web/public/**', 'docs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}', 'packages/ui/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Pure domain: no React, Dexie, Three.js, MediaPipe and no network (2.3.2).
    files: DOMAIN.map((p) => `packages/${p}/src/**/*.ts`),
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['react', 'react-*', 'dexie', 'dexie-*', 'three', 'three/*', '@mediapipe/*'], message: 'Domain packages stay framework-free (2.3.2).' }] },
      ],
      'no-restricted-globals': ['error', { name: 'fetch', message: 'Only ai/adaptadores may use fetch (2.3.2).' }],
    },
  },
  {
    // Gestures and learning signals: no frames, audio or numbers leave the device (1.4, 4.9).
    files: ['apps/web/src/platform/gestos/**', 'apps/web/src/platform/gestos.ts', 'apps/web/src/platform/senales/**'],
    rules: {
      'no-restricted-globals': ['error', ...NO_LEAK_GLOBALS],
      'no-restricted-properties': ['error', ...NO_LEAK_PROPERTIES],
    },
  },
  {
    // The face model and affect inference only exist inside the signals module (4.6).
    files: ['**/*.{ts,tsx}'],
    ignores: ['apps/web/src/platform/senales/**', 'packages/senales/**', 'packages/contracts/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'Literal[value=/face_landmarker|FaceLandmarker|affect/i]', message: 'Face/affect models only inside the signals module (4.6, 4.9).' },
        { selector: 'Identifier[name=/^FaceLandmarker$/]', message: 'Face/affect models only inside the signals module (4.6, 4.9).' },
      ],
    },
  },
);
