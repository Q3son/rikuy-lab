/**
 * Renderizador holográfico.
 *
 * Modos de salida (mismo contenido, distinta distribución en pantalla):
 *  - piramide: 4 vistas en cruz para la pirámide de 4 caras.
 *  - cajita:   1 vista centrada para la lámina a 45° (Pepper's ghost de un plano).
 *  - normal:   vista directa, para depurar o proyectar.
 *
 * Cada vista se dibuja primero en una textura (render target) y luego se
 * compone en una escena ortográfica. Así espejo, volteo y rotación de cada
 * vista son transformaciones de un plano, sin tocar la escena 3D.
 */
import * as THREE from 'three';

export type HoloMode = 'piramide' | 'cajita' | 'normal';

export interface HoloOptions {
  mode: HoloMode;
  /** Espejo horizontal de cada vista (el reflejo invierte izquierda/derecha). */
  mirror: boolean;
  /** Volteo vertical de cada vista (si la imagen sale de cabeza). */
  flip: boolean;
  /** Hueco central de la pirámide, en fracción del lado corto (0..0.3). */
  gap: number;
  /** Tamaño de cada vista, en fracción del lado corto de la pantalla. */
  viewSize: number;
  /** Rotación de toda la composición, en grados (para alinear con la pirámide). */
  rotation: number;
}

export const DEFAULT_OPTIONS: HoloOptions = {
  mode: 'piramide',
  mirror: false,
  flip: false,
  gap: 0.06,
  viewSize: 0.36,
  rotation: 0,
};

export class HoloRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  /** Pivote al que se aplican giros y zoom del usuario. */
  readonly pivot = new THREE.Group();
  options: HoloOptions;

  private readonly cameras: THREE.PerspectiveCamera[] = [];
  private readonly targets: THREE.WebGLRenderTarget[] = [];
  private readonly composeScene = new THREE.Scene();
  private readonly composeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
  private readonly composeRoot = new THREE.Group();
  private readonly quads: THREE.Mesh[] = [];
  private readonly directCamera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement, options: Partial<HoloOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Negro absoluto: en Pepper's ghost el negro se vuelve transparente.
    this.renderer.setClearColor(0x000000, 1);
    this.scene.background = null;
    this.scene.add(this.pivot);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2, 3, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x66ccff, 1.2);
    rim.position.set(-3, 1, -3);
    this.scene.add(rim);

    // Cuatro cámaras alrededor del objeto (frente, derecha, atrás, izquierda).
    for (let i = 0; i < 4; i++) {
      const cam = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
      const a = (i * Math.PI) / 2;
      cam.position.set(Math.sin(a) * 4, 0.4, Math.cos(a) * 4);
      cam.lookAt(0, 0, 0);
      this.cameras.push(cam);
      const rt = new THREE.WebGLRenderTarget(512, 512, { samples: 4 });
      rt.texture.colorSpace = THREE.SRGBColorSpace;
      this.targets.push(rt);
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false }));
      this.quads.push(quad);
      this.composeRoot.add(quad);
    }
    this.composeScene.add(this.composeRoot);
    this.composeCamera.position.z = 5;
    this.directCamera.position.set(0, 0.4, 4);
    this.directCamera.lookAt(0, 0, 0);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setOptions(patch: Partial<HoloOptions>) {
    this.options = { ...this.options, ...patch };
    this.layout();
  }

  resize() {
    const canvas = this.renderer.domElement;
    this.width = canvas.clientWidth || window.innerWidth;
    this.height = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(this.width, this.height, false);
    this.directCamera.aspect = this.width / this.height;
    this.directCamera.updateProjectionMatrix();
    this.layout();
  }

  /** Coloca las vistas en coordenadas de píxeles (cámara ortográfica = pantalla). */
  private layout() {
    const { mode, mirror, flip, gap, viewSize, rotation } = this.options;
    const w = this.width;
    const h = this.height;
    Object.assign(this.composeCamera, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 });
    this.composeCamera.updateProjectionMatrix();
    this.composeRoot.rotation.z = THREE.MathUtils.degToRad(rotation);

    const short = Math.min(w, h);
    const sx = mirror ? -1 : 1;
    const sy = flip ? -1 : 1;

    if (mode === 'piramide') {
      const size = short * viewSize;
      const offset = short * gap + size / 2;
      // Orden: abajo, derecha, arriba, izquierda. El "arriba" de cada vista
      // apunta hacia afuera del centro: así el reflejo queda de pie.
      const placements = [
        { x: 0, y: -offset, rot: Math.PI },
        { x: offset, y: 0, rot: Math.PI / 2 },
        { x: 0, y: offset, rot: 0 },
        { x: -offset, y: 0, rot: -Math.PI / 2 },
      ];
      placements.forEach((p, i) => {
        const q = this.quads[i];
        q.visible = true;
        q.position.set(p.x, p.y, 0);
        q.rotation.z = p.rot;
        q.scale.set(size * sx, size * sy, 1);
      });
    } else if (mode === 'cajita') {
      const size = short * 0.95;
      this.quads.forEach((q, i) => {
        q.visible = i === 0;
        q.position.set(0, 0, 0);
        q.rotation.z = 0;
        q.scale.set(size * sx, size * sy, 1);
      });
    }
  }

  render() {
    const { mode, mirror, flip } = this.options;
    if (mode === 'normal') {
      this.renderer.setRenderTarget(null);
      this.renderer.domElement.style.transform = `scale(${mirror ? -1 : 1}, ${flip ? -1 : 1})`;
      this.renderer.render(this.scene, this.directCamera);
      return;
    }
    this.renderer.domElement.style.transform = '';
    const n = mode === 'piramide' ? 4 : 1;
    for (let i = 0; i < n; i++) {
      this.renderer.setRenderTarget(this.targets[i]);
      this.renderer.clear();
      this.renderer.render(this.scene, this.cameras[i]);
    }
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.composeScene, this.composeCamera);
  }
}
