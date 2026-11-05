import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyViewerAction } from './applyAction.ts';
import { SceneManager } from './SceneManager.ts';
import { ViewController } from './ViewController.ts';

function rig() {
  const pivot = new THREE.Group();
  const view = new ViewController(pivot);
  const scenes = new SceneManager(pivot, view, { catalog: { defaults: { longitud: 0.5 }, hints: () => [] } });
  return { pivot, view, scenes };
}

describe('applyViewerAction (engine side of the control protocol)', () => {
  it('rotates and zooms the view', () => {
    const { pivot, view, scenes } = rig();
    applyViewerAction({ type: 'rotate', dx: 0.5, dy: 0.2 }, view, scenes);
    applyViewerAction({ type: 'zoom', factor: 1.2 }, view, scenes);
    for (let i = 0; i < 120; i++) view.update(1 / 60);
    expect(pivot.rotation.y).toBeCloseTo(0.5, 2);
    expect(pivot.rotation.x).toBeCloseTo(0.2, 2);
    expect(pivot.scale.x).toBeCloseTo(1.2, 2);
  });

  it('pauses and releases the simulation', () => {
    const { view, scenes } = rig();
    applyViewerAction({ type: 'pause' }, view, scenes);
    expect(scenes.ctx.running).toBe(false);
    applyViewerAction({ type: 'release' }, view, scenes);
    expect(scenes.ctx.running).toBe(true);
  });

  it('centers the view', () => {
    const { pivot, view, scenes } = rig();
    applyViewerAction({ type: 'rotate', dx: 1, dy: 0 }, view, scenes);
    applyViewerAction({ type: 'center' }, view, scenes);
    for (let i = 0; i < 120; i++) view.update(1 / 60);
    expect(pivot.rotation.y).toBeCloseTo(0, 2);
  });
});
