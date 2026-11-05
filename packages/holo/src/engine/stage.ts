/**
 * The hologram pedestal shared by every scene, so the museum reads as one place: a Fotón ring
 * base with a polar grid and a soft glow, plus a few floating motes of light. It lives in the
 * renderer scene (not in the scene pivot), so it stays still while the exhibit turns.
 * One draw call per piece; the motes move in the vertex shader (one uniform per frame).
 */
import * as THREE from 'three';
import { glowMap } from '../scenes/materials.ts';

const FOTON = 0x19cbee;
export const STAGE_Y = -1.0;
const MOTES = 70;

const moteVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float life = fract(uTime * 0.06 + aSeed);
    p.y += life * 2.4;
    p.x += sin(uTime * 0.4 + aSeed * 40.0) * 0.06;
    vAlpha = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.6, 1.0, life));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const moteFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha * 0.8;
    gl_FragColor = vec4(uColor * a, a);
  }`;

export interface Stage {
  group: THREE.Group;
  update(time: number): void;
  dispose(): void;
}

export function createStage(): Stage {
  const group = new THREE.Group();
  group.position.y = STAGE_Y;
  const additive = (opacity: number) =>
    new THREE.LineBasicMaterial({ color: FOTON, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

  // Bright outer ring (a flat band) and a soft disc of light under the exhibit.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.88, 0.91, 96),
    new THREE.MeshBasicMaterial({ color: FOTON, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 2.3),
    new THREE.MeshBasicMaterial({ map: glowMap(), color: FOTON, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.01;

  // Polar grid: two inner circles and 24 ticks around the rim.
  const pts: number[] = [];
  const circle = (r: number, seg: number, dash: boolean) => {
    for (let i = 0; i < seg; i++) {
      if (dash && i % 2) continue;
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      pts.push(Math.cos(a0) * r, 0, Math.sin(a0) * r, Math.cos(a1) * r, 0, Math.sin(a1) * r);
    }
  };
  circle(0.6, 72, true);
  circle(0.3, 48, false);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r0 = i % 6 === 0 ? 0.72 : 0.8;
    pts.push(Math.cos(a) * r0, 0, Math.sin(a) * r0, Math.cos(a) * 0.86, 0, Math.sin(a) * 0.86);
  }
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const grid = new THREE.LineSegments(gridGeo, additive(0.32));

  // Motes rising from the ring.
  const pos = new Float32Array(MOTES * 3);
  const seed = new Float32Array(MOTES);
  for (let i = 0; i < MOTES; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.2 + Math.random() * 0.7;
    pos.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3);
    seed[i] = Math.random();
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  moteGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const uniforms = { uTime: { value: 0 }, uSize: { value: 22 }, uColor: { value: new THREE.Color(FOTON) } };
  const motes = new THREE.Points(
    moteGeo,
    new THREE.ShaderMaterial({ uniforms, vertexShader: moteVertex, fragmentShader: moteFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  motes.frustumCulled = false;

  group.add(glow, ring, grid, motes);
  for (const o of [glow, ring, grid, motes]) o.renderOrder = -1;

  return {
    group,
    update(time) {
      uniforms.uTime.value = time;
    },
    dispose() {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose();
      });
    },
  };
}
