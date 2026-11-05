/**
 * Three.js engine of the exhibit viewer: renderer, view, scenes and morph (moved from the classic
 * hologram without rewriting, 1.4). Heavy: import it only on demand (`@rikuy/holo/engine`).
 */
export { DEFAULT_OPTIONS, HoloRenderer, type HoloMode, type HoloOptions } from './engine/HoloRenderer.ts';
export { applyViewerAction } from './engine/applyAction.ts';
export { Morph } from './engine/Morph.ts';
export { SceneManager, type SceneCatalog, type SceneManagerOptions } from './engine/SceneManager.ts';
export { attachTouchpad } from './engine/touch.ts';
export { ViewController } from './engine/ViewController.ts';
export { SCENES } from './scenes/registry.ts';
export type { SceneContext, SceneModule } from './scenes/types.ts';
