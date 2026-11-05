/**
 * Péndulo simple, the hero of the hologram. Variables: longitud (m), gravedad, masa and
 * amortiguacion (0 = sin rozamiento, 1 = con rozamiento).
 *
 * The swing is simulated (PendulumModel), so the period shown is measured from the motion and can
 * be compared with T = 2π√(L/g). Hologram language: Fotón cyan structure with Fresnel rims, a Sol
 * bob with an additive halo, a fading comet trail, a meter ruler and in-scene labels that every
 * pyramid view reads facing it. Everything is allocated in build(); update() only writes numbers.
 */
import * as THREE from 'three';
import { HoloLabel } from './label.ts';
import { PALETTE, at, halo, holo } from './materials.ts';
import { PendulumModel } from './pendulumModel.ts';
import { pendulumPeriod } from './physics.ts';
import type { SceneModule } from './types.ts';

const FOTON = 0x19cbee;
const SOL = 0xf5b301;
const GRANA = 0xff4f7b; // Grana, lifted so it survives the acetate (dark reds vanish)
/**
 * Drawn length for a real length L (m): affine, so 25 cm is still a readable pendulum and 2 m
 * still fits under the beam. The L tag always shows the real value.
 */
const drawn = (L: number) => 0.45 + 0.65 * L;
const PIVOT_Y = 1.0;
const TRAIL = 56;
const ARC = 0.42;

const trailVertex = /* glsl */ `
  attribute float aAge;
  uniform float uSize;
  varying float vFade;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFade = pow(1.0 - aAge, 1.7);
    gl_PointSize = uSize * (1.0 - aAge * 0.75) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const trailFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vFade;
    gl_FragColor = vec4(uColor * a, a);
  }`;

export function pendulo(): SceneModule {
  const model = new PendulumModel({ length: 0.5, theta0: 0.38 });
  const labels: HoloLabel[] = [];
  let arm: THREE.Group;
  let rope: THREE.Mesh;
  let bob: THREE.Group;
  let ropeMat: THREE.MeshStandardMaterial;
  let arc: THREE.Line;
  let trailPos: Float32Array;
  let trailAttr: THREE.BufferAttribute;
  let label: HoloLabel;
  let lengthTag: HoloLabel;
  let releases = 0;
  let trailPrimed = false;
  let shownT = -1;
  let shownMeasured = false;
  let shownL = -1;
  let shownDamping = false;
  let highlightLeft = 0;

  const newLabel = (width: number) => {
    const l = new HoloLabel(width);
    labels.push(l);
    return l;
  };

  return {
    id: 'pendulo',
    label: 'Péndulo simple',
    practice: 'pendulo',
    build() {
      const root = new THREE.Group();
      // The swing plane is turned 45°: each of the four pyramid faces sees the swing at an angle
      // instead of two faces seeing it edge-on. Labels are sprites, so they still face every view.
      const g = new THREE.Group();
      g.rotation.y = Math.PI / 4;
      root.add(g);

      // Support: beam, mount and a glowing pivot.
      g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.045, 0.22), holo(FOTON, { emissive: 0.55 })), new THREE.Vector3(0, PIVOT_Y + 0.05, 0)));
      g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.08, 16), holo(PALETTE.white, { emissive: 0.8 })), new THREE.Vector3(0, PIVOT_Y, 0)));
      g.add(at(halo(FOTON, 0.32, 0.9), new THREE.Vector3(0, PIVOT_Y, 0)));

      // Arm: rope and bob rotate together around the pivot.
      arm = new THREE.Group();
      arm.position.y = PIVOT_Y;
      ropeMat = holo(PALETTE.white, { emissive: 1.1 });
      rope = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 1, 6), ropeMat);
      bob = new THREE.Group();
      bob.add(new THREE.Mesh(new THREE.SphereGeometry(0.095, 32, 20), holo(SOL, { emissive: 0.85 })));
      bob.add(halo(SOL, 0.62, 0.95));
      arm.add(rope, bob);
      g.add(arm);

      // Trajectory guide: unit arc scaled by the current length (lines keep 1 px when scaled).
      const arcPts: number[] = [];
      for (let i = 0; i <= 48; i++) {
        const a = -ARC + (2 * ARC * i) / 48;
        arcPts.push(Math.sin(a), -Math.cos(a), 0);
      }
      const arcGeo = new THREE.BufferGeometry();
      arcGeo.setAttribute('position', new THREE.Float32BufferAttribute(arcPts, 3));
      arc = new THREE.Line(arcGeo, new THREE.LineDashedMaterial({ color: FOTON, dashSize: 0.03, gapSize: 0.025, transparent: true, opacity: 0.75 }));
      arc.computeLineDistances();
      arc.position.y = PIVOT_Y;
      g.add(arc);

      // Rest line (vertical through the pivot), faint.
      const rest = new THREE.BufferGeometry();
      rest.setAttribute('position', new THREE.Float32BufferAttribute([0, PIVOT_Y, 0, 0, PIVOT_Y - drawn(2) - 0.12, 0], 3));
      const restLine = new THREE.Line(rest, new THREE.LineDashedMaterial({ color: GRANA, dashSize: 0.05, gapSize: 0.05, transparent: true, opacity: 0.55 }));
      restLine.computeLineDistances();
      g.add(restLine);

      // Comet trail of the bob: a fading line plus soft points, both additive.
      trailPos = new Float32Array(TRAIL * 3);
      const age = new Float32Array(TRAIL);
      const colors = new Float32Array(TRAIL * 3);
      const sol = new THREE.Color(SOL);
      const foton = new THREE.Color(FOTON);
      const c = new THREE.Color();
      for (let i = 0; i < TRAIL; i++) {
        const k = i / (TRAIL - 1);
        age[i] = k;
        c.copy(sol).lerp(foton, Math.min(1, k * 1.6)).multiplyScalar((1 - k) ** 1.5);
        colors.set([c.r, c.g, c.b], i * 3);
      }
      const trailGeo = new THREE.BufferGeometry();
      trailAttr = new THREE.BufferAttribute(trailPos, 3);
      trailAttr.setUsage(THREE.DynamicDrawUsage);
      trailGeo.setAttribute('position', trailAttr);
      trailGeo.setAttribute('aAge', new THREE.BufferAttribute(age, 1));
      trailGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      const trailDots = new THREE.Points(
        trailGeo,
        new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(SOL) }, uSize: { value: 150 } },
          vertexShader: trailVertex,
          fragmentShader: trailFragment,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      trailLine.frustumCulled = false;
      trailDots.frustumCulled = false;
      g.add(trailLine, trailDots);

      // Readout inside the hologram, above the beam.
      label = newLabel(1.9);
      label.sprite.position.set(0, PIVOT_Y + 0.46, 0);
      root.add(label.sprite);
      // Length tag that rides beside the middle of the rope.
      lengthTag = newLabel(1.1);
      g.add(lengthTag.sprite);

      // Fixed footprint so the auto-fit framing never changes with the length.
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.45, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
      frame.position.y = 0.36;
      root.add(frame);
      return root;
    },
    update(dt, ctx) {
      model.setTargetLength(ctx.variables.longitud ?? 0.5);
      model.gravity = ctx.variables.gravedad ?? 9.8;
      model.damping = (ctx.variables.amortiguacion ?? 0) >= 0.5;
      const r = ctx.releases ?? 0;
      if (r !== releases) {
        releases = r;
        model.release();
      }
      model.step(ctx.running ? dt : 0);

      const v = drawn(model.length);
      rope.scale.y = v;
      rope.position.y = -v / 2;
      bob.position.y = -v;
      bob.scale.setScalar(0.75 + Math.cbrt(ctx.variables.masa ?? 0.2) * 0.45);
      arm.rotation.z = model.theta;
      arc.scale.set(v, v, 1);

      // Trail: shift one slot and write the bob position in scene coordinates.
      const x = Math.sin(model.theta) * v;
      const y = PIVOT_Y - Math.cos(model.theta) * v;
      if (!trailPrimed) {
        for (let i = 0; i < TRAIL; i++) {
          trailPos[i * 3] = x;
          trailPos[i * 3 + 1] = y;
          trailPos[i * 3 + 2] = 0;
        }
        trailPrimed = true;
      } else if (ctx.running) {
        trailPos.copyWithin(3, 0, (TRAIL - 1) * 3);
        trailPos[0] = x;
        trailPos[1] = y;
        trailPos[2] = 0;
      }
      trailAttr.needsUpdate = true;

      lengthTag.sprite.position.set(0.95 + x * 0.5, PIVOT_Y - v * 0.5, 0);

      if (highlightLeft > 0) {
        highlightLeft -= dt;
        ropeMat.emissiveIntensity = highlightLeft > 0 ? 1.1 + (Math.sin(ctx.time * 8) * 0.5 + 0.5) * 2 : 1.1;
      }

      // Labels: redraw only when the rounded values change.
      const measured = model.measuredPeriod !== null;
      const T = Math.round((model.measuredPeriod ?? pendulumPeriod(model.targetLength, model.gravity)) * 100);
      const L = Math.round(model.targetLength * 100);
      if (T !== shownT || measured !== shownMeasured || model.damping !== shownDamping) {
        shownT = T;
        shownMeasured = measured;
        shownDamping = model.damping;
        label.set([
          { text: `T ${measured ? '=' : '≈'} ${(T / 100).toFixed(2)} s`, color: '#F5B301', size: 92 },
          { text: measured ? (model.damping ? 'medido · con rozamiento' : 'periodo medido') : 'midiendo…', color: '#5FE3FF', size: 54 },
        ]);
      }
      if (L !== shownL) {
        shownL = L;
        lengthTag.set([{ text: `L = ${(L / 100).toFixed(2)} m`, color: '#E9FBFF', size: 96 }]);
      }
    },
    readout(ctx) {
      const T = model.measuredPeriod ?? pendulumPeriod(model.targetLength, ctx.variables.gravedad ?? 9.8);
      return { label: 'Periodo', value: `${T.toFixed(2)} s · L ${model.targetLength.toFixed(2)} m` };
    },
    highlight(part) {
      if (/cuerda|longitud/.test(part)) {
        highlightLeft = 2.5;
        return true;
      }
      return false;
    },
    dispose() {
      labels.forEach((l) => l.dispose());
    },
  };
}
