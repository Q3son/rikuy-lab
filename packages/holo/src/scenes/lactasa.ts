/**
 * Lactasa rompiendo lactosa en glucosa y galactosa.
 *
 * La "proteína" es una cinta procedural con hélices y lazos (esquema
 * didáctico). Con la temperatura se despliega (desnaturalización) y el
 * sitio activo deja de funcionar. Se puede reemplazar por la estructura
 * real (AlphaFold P09848) en formato PDB sin cambiar esta interfaz.
 */
import * as THREE from 'three';
import { lactaseActivity, lactaseUnfolding } from './physics.ts';
import type { SceneModule } from './types.ts';
import { PALETTE, at, holo, pulse } from './materials.ts';

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** Esqueleto nativo: hélices alfa unidas por lazos, plegadas en un glóbulo. */
function nativeBackbone(): THREE.Vector3[] {
  const rnd = seeded(42);
  const pts: THREE.Vector3[] = [];
  let pos = new THREE.Vector3(-0.6, -0.6, 0);
  let dir = new THREE.Vector3(1, 0.4, 0.2).normalize();
  for (let seg = 0; seg < 9; seg++) {
    const helix = seg % 2 === 0;
    const n = helix ? 26 : 10;
    const axisUp = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
    const axisSide = dir.clone().cross(axisUp).normalize();
    for (let i = 0; i < n; i++) {
      const t = i / n;
      if (helix) {
        const a = t * Math.PI * 2 * 3.6;
        pts.push(pos.clone().addScaledVector(dir, t * 0.55).addScaledVector(axisUp, Math.cos(a) * 0.09).addScaledVector(axisSide, Math.sin(a) * 0.09));
      } else {
        pts.push(pos.clone().addScaledVector(dir, t * 0.3).addScaledVector(axisUp, Math.sin(t * Math.PI) * 0.15));
      }
    }
    pos = pts[pts.length - 1].clone();
    // Girar y empujar hacia el centro para formar un glóbulo compacto.
    dir = dir.applyAxisAngle(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), 1.6 + rnd() * 0.8)
      .addScaledVector(pos.clone().negate(), 0.9).normalize();
  }
  // Centrar.
  const c = new THREE.Vector3();
  pts.forEach((p) => c.add(p));
  c.divideScalar(pts.length);
  return pts.map((p) => p.sub(c).multiplyScalar(1.25));
}

/** Cadena desplegada: una onda larga sin estructura. */
function unfoldedBackbone(n: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push(new THREE.Vector3((t - 0.5) * 3.2, Math.sin(t * 22) * 0.12 - 0.2, Math.cos(t * 13) * 0.25));
  }
  return pts;
}

function ring(color: number): THREE.Group {
  const g = new THREE.Group();
  const atom = new THREE.SphereGeometry(0.045, 12, 10);
  const bond = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);
  const mat = holo(color, { emissive: 0.7 });
  const oMat = holo(PALETTE.coral, { emissive: 0.7 });
  const verts: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0);
    verts.push(p);
    g.add(at(new THREE.Mesh(atom, i === 0 ? oMat : mat), p));
    // Grupos OH hacia afuera.
    const oh = p.clone().multiplyScalar(1.6);
    g.add(at(new THREE.Mesh(atom, oMat), oh, 0.7));
    g.add(stick(p, oh, bond, mat));
  }
  for (let i = 0; i < 6; i++) g.add(stick(verts[i], verts[(i + 1) % 6], bond, mat));
  return g;
}

function stick(a: THREE.Vector3, b: THREE.Vector3, geo: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.scale.set(1, a.distanceTo(b), 1);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}

export function lactasa(): SceneModule {
  let group: THREE.Group;
  let ribbon: THREE.Mesh;
  let ribbonMat: THREE.MeshStandardMaterial;
  let site: THREE.Mesh;
  let siteMat: THREE.MeshStandardMaterial;
  let lactose: THREE.Group;
  let glucose: THREE.Group;
  let galactose: THREE.Group;
  let bridge: THREE.Mesh;
  let bridgeMat: THREE.MeshStandardMaterial;
  let native: THREE.Vector3[];
  let unfolded: THREE.Vector3[];
  let lastUnfold = -1;
  let cycle = 0;
  let highlightSite = false;
  const sitePos = new THREE.Vector3(0.15, 0.55, 0.35);

  const rebuildRibbon = (u: number) => {
    const pts = native.map((p, i) => p.clone().lerp(unfolded[i], u));
    ribbon.geometry.dispose();
    ribbon.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 500, 0.035, 8, false);
  };

  return {
    id: 'lactasa',
    label: 'Lactasa y lactosa',
    practice: 'lactasa',
    build() {
      group = new THREE.Group();
      native = nativeBackbone();
      unfolded = unfoldedBackbone(native.length);
      ribbonMat = holo(PALETTE.cyan, { emissive: 0.45 });
      ribbon = new THREE.Mesh(new THREE.BufferGeometry(), ribbonMat);
      rebuildRibbon(0);
      group.add(ribbon);

      siteMat = holo(PALETTE.lime, { emissive: 0.8, opacity: 0.55 });
      site = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), siteMat);
      site.position.copy(sitePos);
      group.add(site);

      // Lactosa = galactosa + glucosa unidas por un enlace β(1→4).
      lactose = new THREE.Group();
      galactose = ring(PALETTE.amber);
      glucose = ring(PALETTE.pink);
      galactose.position.set(-0.2, 0, 0);
      glucose.position.set(0.2, 0, 0);
      bridgeMat = holo(PALETTE.coral, { emissive: 0.9 });
      bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), bridgeMat);
      bridge.rotation.z = Math.PI / 2;
      lactose.add(galactose, glucose, bridge);
      lactose.scale.setScalar(0.85);
      group.add(lactose);
      return group;
    },
    update(dt, ctx) {
      const temp = ctx.variables.temperatura ?? 37;
      const ph = ctx.variables.ph ?? 6.5;
      const activity = lactaseActivity(temp, ph);
      const u = lactaseUnfolding(temp);
      if (Math.abs(u - lastUnfold) > 0.02) {
        rebuildRibbon(u);
        lastUnfold = u;
      }
      siteMat.opacity = 0.15 + 0.5 * activity;
      if (highlightSite) pulse(siteMat, ctx.time, 0.5);

      // Ciclo de 4 s: llega la lactosa, se une, y si hay actividad, se rompe.
      if (ctx.running) cycle = (cycle + dt * (0.6 + activity * 0.6)) % 4;
      const approach = Math.min(1, cycle / 1.2);
      const start = new THREE.Vector3(1.5, 1.3, 0.8);
      lactose.position.lerpVectors(start, sitePos, easeOut(approach));
      lactose.rotation.set(ctx.time * 0.4, ctx.time * 0.6, 0);

      const breaking = cycle > 1.5 && activity > 0.25;
      const split = breaking ? Math.min(1, (cycle - 1.5) / 1.2) : 0;
      bridge.visible = split < 0.15;
      bridgeMat.emissiveIntensity = cycle > 1.2 && cycle < 1.6 ? 2 : 0.9;
      galactose.position.set(-0.2 - split * 0.9, split * 0.4, 0);
      glucose.position.set(0.2 + split * 0.9, -split * 0.3, split * 0.3);
      // Sin actividad la lactosa se queda y vuelve a salir entera.
      if (!breaking && cycle > 2.2) lactose.position.lerpVectors(sitePos, start, Math.min(1, (cycle - 2.2) / 1.5));
      ribbonMat.emissiveIntensity = 0.3 + activity * 0.4;
    },
    readout(ctx) {
      const a = lactaseActivity(ctx.variables.temperatura ?? 37, ctx.variables.ph ?? 6.5);
      return { label: 'Actividad de la lactasa', value: `${Math.round(a * 100)} %` };
    },
    highlight(part) {
      highlightSite = /sitio|activo/.test(part);
      if (/enlace|union/.test(part)) bridgeMat.emissiveIntensity = 2.5;
      return highlightSite || /enlace|union/.test(part);
    },
    explode(on) {
      galactose.position.x = on ? -0.6 : -0.2;
      glucose.position.x = on ? 0.6 : 0.2;
    },
  };
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
