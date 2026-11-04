/**
 * Orquesta la escena activa, la transformación entre escenas y la
 * ejecución de los comandos del agente.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PRACTICES, practiceById, type Command, type DisplayState } from '@rikuy/core';
import { SCENES } from '../scenes/registry.ts';
import type { SceneContext, SceneModule } from '../scenes/types.ts';
import { disposeGroup } from '../scenes/materials.ts';
import { Morph } from './Morph.ts';
import type { ViewController } from './ViewController.ts';

/**
 * Envuelve el modelo y lo escala para que quepa en cada vista sin cortarse,
 * sea cual sea su tamaño original (procedural o .glb).
 */
const FIT_RADIUS = 1.0;
function fit(model: THREE.Group): THREE.Group {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const wrapper = new THREE.Group();
  wrapper.add(model);
  if (box.isEmpty()) return wrapper;
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2 || 1;
  const k = FIT_RADIUS / radius;
  wrapper.scale.setScalar(k);
  wrapper.position.copy(center).multiplyScalar(-k);
  return wrapper;
}

export class SceneManager {
  current: SceneModule | null = null;
  private root: THREE.Group | null = null;
  private readonly morph = new Morph();
  readonly ctx: SceneContext = { running: true, time: 0, variables: {} };
  private busy = Promise.resolve();
  onChange: (state: DisplayState) => void = () => {};
  onHint: (text: string, level: number) => void = () => {};

  constructor(private readonly pivot: THREE.Group, private readonly view: ViewController) {
    pivot.add(this.morph.points);
    // Valores por defecto de todas las variables de todas las prácticas.
    for (const p of PRACTICES) for (const v of p.variables) this.ctx.variables[v.id] ??= v.default;
  }

  /** Cambia de escena con la transformación de partículas. */
  goTo(id: string): Promise<void> {
    this.busy = this.busy.then(() => this.transition(id));
    return this.busy;
  }

  private async transition(id: string) {
    const factory = SCENES[id];
    if (!factory || this.current?.id === id) return;
    const next = factory();
    const group = next.build();
    const override = await this.loadOverride(id);
    const nextRoot = fit(override ?? group);
    nextRoot.visible = false;
    this.pivot.add(nextRoot);

    const prevRoot = this.root;
    const prev = this.current;
    const morphing = this.morph.run(prevRoot, nextRoot);
    if (prevRoot) prevRoot.visible = false;
    await morphing;
    if (prevRoot) {
      this.pivot.remove(prevRoot);
      disposeGroup(prevRoot);
      prev?.dispose?.();
    }
    nextRoot.visible = true;
    this.root = nextRoot;
    this.current = next;
    this.view.reset();
    this.emit();
  }

  /** Si existe public/models/<id>.glb, se usa en lugar del modelo procedural. */
  private async loadOverride(id: string): Promise<THREE.Group | null> {
    try {
      const url = `${import.meta.env.BASE_URL}models/${id}.glb`;
      const head = await fetch(url, { method: 'HEAD' });
      if (!head.ok || !(head.headers.get('content-type') ?? '').includes('model')) return null;
      const gltf = await new GLTFLoader().loadAsync(url);
      const g = new THREE.Group();
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3()).length();
      gltf.scene.position.sub(box.getCenter(new THREE.Vector3()));
      g.scale.setScalar(2.4 / size);
      g.add(gltf.scene);
      return g;
    } catch {
      return null;
    }
  }

  apply(commands: Command[]) {
    for (const c of commands) {
      switch (c.tool) {
        case 'ir_a':
          void this.goTo(c.args.escena);
          break;
        case 'fijar_variable':
          this.ctx.variables[c.args.variable] = Number(c.args.valor);
          break;
        case 'correr':
          this.ctx.running = true;
          break;
        case 'pausar':
          this.ctx.running = false;
          break;
        case 'resaltar':
          this.current?.highlight?.(c.args.parte);
          break;
        case 'rotar':
          this.view.rotateDeg(c.args.yaw ?? 0, c.args.pitch ?? 0);
          break;
        case 'zoom':
          this.view.nudge(0, 0, c.args.factor);
          break;
        case 'separar_partes':
          this.current?.explode?.(c.args.activo);
          break;
        case 'reiniciar_vista':
          this.view.reset();
          break;
        case 'dar_pista': {
          const p = practiceById.get(this.current?.practice ?? 'lactasa');
          const level = Math.max(1, Math.min(3, c.args.nivel));
          const hint = p?.hints[level - 1];
          if (hint) this.onHint(hint, level);
          break;
        }
        default:
          break; // registrar_* lo maneja la analítica
      }
    }
    this.emit();
  }

  update(dt: number) {
    this.ctx.time += dt;
    this.morph.update(dt);
    this.current?.update?.(dt, this.ctx);
  }

  state(): DisplayState {
    return {
      scene: this.current?.id ?? '',
      running: this.ctx.running,
      variables: { ...this.ctx.variables },
      readout: this.current?.readout?.(this.ctx),
    };
  }

  emit() {
    this.onChange(this.state());
  }
}
