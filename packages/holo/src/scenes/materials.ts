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
  withFresnel(m);
  return m;
}

/**
 * Hologram rim: the edges facing away from the camera glow in the material's own emissive color
 * (Fresnel term injected in the standard shader). One shared program for every holo material, so
 * it costs a few ALU ops per pixel and no extra pass. Highlights keep working: the rim scales with
 * emissiveIntensity.
 */
export function withFresnel<T extends THREE.MeshStandardMaterial>(m: T, strength = 1.8): T {
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      {
        float rim = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
        totalEmissiveRadiance += mix(emissive, vec3(length(emissive)), 0.3) * pow(rim, 2.4) * ${strength.toFixed(2)};
      }`,
    );
  };
  m.customProgramCacheKey = () => `rikuy-holo-fresnel-${strength.toFixed(2)}`;
  return m;
}

/**
 * Canvas-backed texture. Outside a browser (unit tests in Node) it falls back to a 1x1 white
 * texture so scenes still build.
 */
export function canvasTexture(width: number, height: number, draw?: (ctx: CanvasRenderingContext2D) => void): THREE.Texture {
  if (typeof document === 'undefined') {
    const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    t.needsUpdate = true;
    return t;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx && draw) draw(ctx);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let glowTexture: THREE.Texture | null = null;
/** Soft round glow shared by every halo sprite (created once). */
export function glowMap(): THREE.Texture {
  glowTexture ??= canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  return glowTexture;
}

/**
 * Additive halo around a light-emitting part: a cheap stand-in for bloom on mid-range phones.
 * The shared texture outlives the sprite (material.dispose() does not dispose maps).
 */
export function halo(color: number, size: number, opacity = 0.85): THREE.Sprite {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowMap(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  s.scale.setScalar(size);
  s.renderOrder = 2;
  return s;
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
