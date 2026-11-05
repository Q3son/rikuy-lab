/**
 * Dependency rules of docs/ecosistema/ARQUITECTURA_ECOSISTEMA.md, section 2.3.
 * Run with `npm run lint:deps`.
 */
const PKG = (name) => `^packages/${name}/`;

/** Allowed workspace dependencies per package (contracts is allowed for everyone). */
const ALLOWED = {
  contracts: [],
  core: [],
  'curriculum-cneb': ['core'],
  'lab-engine': ['core'],
  senales: ['core'],
  tutor: ['core', 'curriculum-cneb', 'lab-engine', 'senales'], // senales: only the EstadoApoyo type
  sync: ['core'],
  'store-dexie': ['sync'],
  evidencia: ['core', 'curriculum-cneb', 'tutor'], // tutor: only the judge
  memoria: ['core', 'curriculum-cneb', 'evidencia'],
  reportes: ['core', 'curriculum-cneb', 'evidencia', 'memoria', 'quipu'],
  quipu: ['core'],
  presencia: ['core'],
  cerebro: ['core', 'curriculum-cneb', 'memoria'],
  campus: ['core', 'curriculum-cneb'],
  retos: ['core'],
  lenguas: ['core'],
  ai: ['core', 'tutor', 'curriculum-cneb'],
  mensajeria: ['core', 'reportes', 'lenguas'], // never senales (FUNCIONES_EXTRA 1.5)
  holo: [],
  ui: [],
};
const ALL = Object.keys(ALLOWED);

const perPackage = Object.entries(ALLOWED).map(([pkg, allowed]) => {
  const forbidden = ALL.filter((p) => p !== pkg && p !== 'contracts' && !allowed.includes(p));
  return {
    name: `deps-of-${pkg}`,
    comment: `${pkg} may only depend on contracts${allowed.length ? ', ' + allowed.join(', ') : ''} (2.3)`,
    severity: 'error',
    from: { path: PKG(pkg) },
    to: { path: forbidden.length ? `^packages/(${forbidden.join('|')})/` : '^$' },
  };
});

const APP_ALLOWED = {
  hub: ['contracts', 'core', 'sync', 'presencia', 'tutor', 'evidencia', 'memoria', 'ai', 'mensajeria'],
  cloud: ['contracts', 'core', 'ai', 'curriculum-cneb', 'reportes', 'sync', 'mensajeria'],
  android: [],
  server: ['core'], // legacy, removed by F8
};
const perApp = Object.entries(APP_ALLOWED).map(([app, allowed]) => ({
  name: `deps-of-app-${app}`,
  severity: 'error',
  from: { path: `^apps/${app}/` },
  to: { path: `^packages/(${ALL.filter((p) => !allowed.includes(p)).join('|')})/` },
}));

/** Domain packages: no React, Dexie, Three.js or MediaPipe (rule 2; fetch is checked by ESLint). */
const DOMAIN = ['contracts', 'core', 'curriculum-cneb', 'lab-engine', 'tutor', 'sync', 'evidencia', 'memoria', 'reportes', 'quipu', 'presencia', 'senales', 'cerebro', 'retos', 'lenguas', 'mensajeria'];

module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'packages-not-to-apps',
      comment: 'No package in packages/* imports from apps/* (2.3.1)',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'domain-no-frameworks',
      comment: 'Domain packages do not import React, Dexie, Three.js or MediaPipe (2.3.2)',
      severity: 'error',
      from: { path: `^packages/(${DOMAIN.join('|')})/` },
      to: { path: 'node_modules/(react|react-dom|dexie|three|@mediapipe)/' },
    },
    {
      name: 'campus-dom-only-in-canvas',
      severity: 'error',
      from: { path: '^packages/campus/src/', pathNot: '^packages/campus/src/canvas/' },
      to: { path: '^packages/campus/src/canvas/' },
    },
    {
      name: 'ai-keyed-adapters-server-only',
      comment: 'API keys live only in apps/cloud: the browser never imports the Gemini or Meta adapters (2.3.3)',
      severity: 'error',
      from: { path: '^(apps/(web|android)|packages/(?!ai/))' },
      to: { path: '^packages/ai/src/adaptadores/(gemini|meta)' },
    },
    {
      name: 'signals-never-reach-records',
      comment: 'Hard rule: signals never reach a log, record or individual report (2.3)',
      severity: 'error',
      from: { path: '^packages/(memoria|evidencia|reportes|cerebro|quipu|mensajeria)/' },
      to: { path: '^packages/senales/' },
    },
    {
      name: 'mensajeria-never-senales',
      comment: 'Hard rule: outgoing messages never import signals / Guardián code (FUNCIONES_EXTRA 1.5)',
      severity: 'error',
      from: { path: '^packages/mensajeria/' },
      to: { path: '^packages/senales/' },
    },
    ...perPackage,
    ...perApp,
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(dist|legacy|node_modules)/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'types', 'node', 'default'],
      extensions: ['.ts', '.tsx', '.js', '.json'],
    },
  },
};
