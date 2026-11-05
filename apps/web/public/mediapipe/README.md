# MediaPipe hand assets (F3)

Bundled so gestures work offline and nothing is fetched from a CDN (ARQUITECTURA_ECOSISTEMA 1.4).

- `wasm/vision_wasm_module_internal.{js,wasm}`: from `@mediapipe/tasks-vision@1.2.2` (module build, used by the gesture worker).
- `hand_landmarker.task`: float16 v1 model from Google's MediaPipe model bucket.
- `manifest.json`: version, source, size and sha256 of every file. The test `src/platform/gestos/assets.test.ts` fails on any other file or hash.

Refresh: `node apps/web/scripts/mediapipe-assets.mjs` (copy + download + verify), `--pin` to rewrite hashes after a deliberate upgrade, `--check` to verify only.
Only `hand_landmarker.task` and `gesture_recognizer.task` are allowed here; `senales/` belongs to F10.
