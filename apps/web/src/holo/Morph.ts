/**
 * Transformación entre escenas: el modelo actual se disuelve en partículas
 * que viajan y se reagrupan con la forma del modelo siguiente.
 * Una sola técnica sirve para todos los saltos de escala.
 */
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

const COUNT = 3500;

export function samplePoints(root: THREE.Object3D, count = COUNT): Float32Array<ArrayBuffer> {
  root.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry) meshes.push(o as THREE.Mesh);
  });
  const out = new Float32Array(count * 3);
  if (!meshes.length) return out;

  // Repartir partículas según el área aproximada (bounding sphere) de cada malla.
  const weights = meshes.map((m) => {
    m.geometry.computeBoundingSphere();
    const r = (m.geometry.boundingSphere?.radius ?? 1) * m.getWorldScale(new THREE.Vector3()).x;
    return Math.max(0.01, r * r);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  // Coordenadas relativas al padre del modelo (el pivote), donde viven las partículas.
  const toParent = root.parent ? root.parent.matrixWorld.clone().invert() : new THREE.Matrix4();
  const p = new THREE.Vector3();
  let k = 0;
  meshes.forEach((mesh, mi) => {
    const n = mi === meshes.length - 1 ? count - k : Math.round((weights[mi] / total) * count);
    if (n <= 0) return;
    let geo = mesh.geometry;
    if (geo.index) geo = geo.toNonIndexed();
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(geo)).build();
    for (let i = 0; i < n && k < count; i++, k++) {
      sampler.sample(p);
      p.applyMatrix4(mesh.matrixWorld).applyMatrix4(toParent);
      out.set([p.x, p.y, p.z], k * 3);
    }
  });
  return out;
}

export class Morph {
  readonly points: THREE.Points;
  private from: Float32Array<ArrayBuffer> = new Float32Array(COUNT * 3);
  private to: Float32Array<ArrayBuffer> = new Float32Array(COUNT * 3);
  private t = 1;
  private duration = 1.4;
  private resolve: (() => void) | null = null;

  constructor(color = 0x7fe6ff) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.025, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.points = new THREE.Points(geo, mat);
    this.points.visible = false;
  }

  get active() {
    return this.t < 1;
  }

  /** Lanza la transición; se resuelve cuando las partículas llegaron. */
  run(fromRoot: THREE.Object3D | null, toRoot: THREE.Object3D): Promise<void> {
    this.from = fromRoot ? samplePoints(fromRoot) : randomSphere(2.2);
    this.to = samplePoints(toRoot);
    this.t = 0;
    this.points.visible = true;
    return new Promise((r) => (this.resolve = r));
  }

  update(dt: number) {
    if (this.t >= 1) return;
    this.t = Math.min(1, this.t + dt / this.duration);
    const e = easeInOut(this.t);
    const pos = this.points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    // Arco hacia afuera a mitad de camino: se ve como una nube que se reordena.
    const swirl = Math.sin(e * Math.PI) * 0.6;
    for (let i = 0; i < arr.length; i += 3) {
      const ax = this.from[i], ay = this.from[i + 1], az = this.from[i + 2];
      const bx = this.to[i], by = this.to[i + 1], bz = this.to[i + 2];
      let x = ax + (bx - ax) * e;
      let y = ay + (by - ay) * e;
      let z = az + (bz - az) * e;
      const ang = swirl * 2.2;
      const c = Math.cos(ang), s = Math.sin(ang);
      const rx = x * c - z * s;
      z = x * s + z * c;
      x = rx * (1 + swirl * 0.3);
      y += Math.sin(i * 0.37 + e * 6) * swirl * 0.15;
      arr[i] = x;
      arr[i + 1] = y;
      arr[i + 2] = z;
    }
    pos.needsUpdate = true;
    (this.points.material as THREE.PointsMaterial).opacity = this.t > 0.85 ? (1 - this.t) / 0.15 : 0.95;
    if (this.t >= 1) {
      this.points.visible = false;
      this.resolve?.();
      this.resolve = null;
    }
  }
}

function randomSphere(r: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(r * Math.cbrt(Math.random()));
    out.set([v.x, v.y, v.z], i * 3);
  }
  return out;
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
