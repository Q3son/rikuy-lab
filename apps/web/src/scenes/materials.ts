/**
 * Materiales pensados para holograma: colores claros y saturados con
 * emisión propia. En Pepper's ghost lo oscuro desaparece, así que nada
 * importante debe ser negro ni gris oscuro.
 */
import * as THREE from 'three';

export const PALETTE = {
  cyan: 0x5fe3ff,
  teal: 0x3dffc5,
  amber: 0xffc14d,
  coral: 0xff7a6b,
  pink: 0xff6fb5,
  violet: 0xb48cff,
  white: 0xf4fbff,
  lime: 0xc6ff5c,
  liver: 0xff8a5c,
};

export function holo(color: number, opts: { emissive?: number; opacity?: number; wire?: boolean } = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: opts.emissive ?? 0.35,
    roughness: 0.35,
    metalness: 0.1,
    transparent: (opts.opacity ?? 1) < 1,
    opacity: opts.opacity ?? 1,
    wireframe: opts.wire ?? false,
    side: THREE.DoubleSide,
  });
  return m;
}

export function glowLine(color: number): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
}

/** Tubo a lo largo de una lista de puntos suaves. */
export function tube(points: THREE.Vector3[], radius: number, material: THREE.Material, segments = 120, radial = 12): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, radial, false), material);
}

/** Pulso de brillo para resaltar una parte. */
export function pulse(mat: THREE.MeshStandardMaterial, t: number, base = 0.35) {
  mat.emissiveIntensity = base + (Math.sin(t * 6) * 0.5 + 0.5) * 0.9;
}

export function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

/** Ubica un objeto (position/scale de three.js no se pueden reasignar). */
export function at<T extends THREE.Object3D>(o: T, p: THREE.Vector3, scale?: number): T {
  o.position.copy(p);
  if (scale !== undefined) o.scale.setScalar(scale);
  return o;
}
