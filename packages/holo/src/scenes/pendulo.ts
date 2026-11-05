/**
 * Péndulo simple. Variables: longitud, masa, gravedad.
 * Con el sensor del celular (acelerómetro) se puede comparar con un
 * péndulo real; ver input/motion.ts.
 */
import * as THREE from 'three';
import { pendulumAngle, pendulumPeriod } from './physics.ts';
import type { SceneModule } from './types.ts';
import { PALETTE, at, holo } from './materials.ts';

export function pendulo(): SceneModule {
  let arm: THREE.Group;
  let rope: THREE.Mesh;
  let bob: THREE.Mesh;
  let ropeMat: THREE.MeshStandardMaterial;
  let t = 0;
  let lastL = -1;

  return {
    id: 'pendulo',
    label: 'Péndulo simple',
    practice: 'pendulo',
    build() {
      const g = new THREE.Group();
      g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.3), holo(PALETTE.violet, { emissive: 0.6 })), new THREE.Vector3(0, 1.1, 0)));
      arm = new THREE.Group();
      arm.position.y = 1.1;
      ropeMat = holo(PALETTE.white, { emissive: 0.8 });
      rope = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), ropeMat);
      bob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), holo(PALETTE.amber, { emissive: 0.7 }));
      arm.add(rope, bob);
      g.add(arm);
      // Arco guía de la trayectoria.
      const arc = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.004, 4, 64, 0.7), holo(PALETTE.cyan, { opacity: 0.4 }));
      arc.rotation.z = -Math.PI / 2 - 0.35;
      arc.position.y = 1.1;
      g.add(arc);
      return g;
    },
    update(dt, ctx) {
      const L = ctx.variables.longitud ?? 0.5;
      const gravity = ctx.variables.gravedad ?? 9.8;
      const m = ctx.variables.masa ?? 0.2;
      // Escala visual: 2 m reales caben en ~2 unidades de escena.
      const visual = 0.3 + L * 0.85;
      if (L !== lastL) {
        rope.scale.y = visual;
        rope.position.y = -visual / 2;
        bob.position.y = -visual;
        lastL = L;
      }
      bob.scale.setScalar(0.6 + Math.cbrt(m) * 0.6);
      if (ctx.running) t += dt;
      arm.rotation.z = pendulumAngle(t, L, gravity);
    },
    readout(ctx) {
      const T = pendulumPeriod(ctx.variables.longitud ?? 0.5, ctx.variables.gravedad ?? 9.8);
      return { label: 'Periodo', value: `${T.toFixed(2)} s` };
    },
    highlight(part) {
      if (/cuerda|longitud/.test(part)) {
        ropeMat.emissiveIntensity = 2;
        return true;
      }
      return false;
    },
  };
}
