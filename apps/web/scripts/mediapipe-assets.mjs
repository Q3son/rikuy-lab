#!/usr/bin/env node
/**
 * Bundles the MediaPipe hand assets in apps/web/public/mediapipe/ (1.4): no CDN at runtime.
 *
 *   node apps/web/scripts/mediapipe-assets.mjs           # fetch/copy, then verify against the manifest
 *   node apps/web/scripts/mediapipe-assets.mjs --pin     # (re)write the hashes in the manifest
 *   node apps/web/scripts/mediapipe-assets.mjs --check   # verify only (CI): whitelist + hashes
 *
 * - The .wasm loader comes from the pinned npm package @mediapipe/tasks-vision (version below).
 * - hand_landmarker.task comes from Google's model bucket at a pinned URL (float16, version 1).
 * Only hand_landmarker.task and gesture_recognizer.task are allowed here; face models live in
 * public/mediapipe/senales/ and belong to F10 (4.9).
 */
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'public', 'mediapipe');
const MANIFEST = join(OUT, 'manifest.json');
const ROOT = join(here, '..', '..', '..');
const TASKS_VISION = '1.2.2';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const FILES = [
  { path: 'wasm/vision_wasm_module_internal.js', from: `node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_module_internal.js` },
  { path: 'wasm/vision_wasm_module_internal.wasm', from: `node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_module_internal.wasm` },
  { path: 'hand_landmarker.task', url: MODEL_URL },
];
const ALLOWED = new Set(['manifest.json', 'README.md', ...FILES.map((f) => f.path)]);
const ALLOWED_MODELS = new Set(['hand_landmarker.task', 'gesture_recognizer.task']);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const mode = process.argv.includes('--check') ? 'check' : process.argv.includes('--pin') ? 'pin' : 'fetch';

async function listFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(p)));
    else out.push(relative(OUT, p).replaceAll('\\', '/'));
  }
  return out;
}

async function fetchAll() {
  await mkdir(join(OUT, 'wasm'), { recursive: true });
  const pkg = JSON.parse(await readFile(join(ROOT, 'node_modules/@mediapipe/tasks-vision/package.json'), 'utf8'));
  if (pkg.version !== TASKS_VISION) throw new Error(`@mediapipe/tasks-vision ${pkg.version} installed, ${TASKS_VISION} pinned`);
  for (const f of FILES) {
    const dest = join(OUT, f.path);
    if (f.from) await copyFile(join(ROOT, f.from), dest);
    else {
      const res = await fetch(f.url);
      if (!res.ok) throw new Error(`download failed (${res.status}) for ${f.url}`);
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    }
    console.log(`ok ${f.path}`);
  }
}

async function check(manifest) {
  const problems = [];
  for (const p of await listFiles(OUT)) {
    if (p.startsWith('senales/')) continue; // F10's precache group
    const name = p.split('/').at(-1);
    if (!ALLOWED.has(p)) problems.push(`not whitelisted: ${p}`);
    if (name.endsWith('.task') && !ALLOWED_MODELS.has(name)) problems.push(`model not allowed: ${p}`);
  }
  for (const f of manifest.files) {
    const buf = await readFile(join(OUT, f.path)).catch(() => null);
    if (!buf) problems.push(`missing: ${f.path}`);
    else if (sha256(buf) !== f.sha256) problems.push(`hash mismatch: ${f.path}`);
  }
  return problems;
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8').catch(() => '{"files":[]}'));
if (mode !== 'check') await fetchAll();
if (mode === 'pin' || manifest.files.length === 0) {
  const files = [];
  for (const f of FILES) {
    const buf = await readFile(join(OUT, f.path));
    files.push({ path: f.path, sha256: sha256(buf), bytes: buf.length, source: f.url ?? `npm:@mediapipe/tasks-vision@${TASKS_VISION}` });
  }
  await writeFile(MANIFEST, JSON.stringify({ tasksVision: TASKS_VISION, files }, null, 2) + '\n');
  console.log('manifest pinned');
} else {
  const problems = await check(manifest);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log('mediapipe assets verified');
}
