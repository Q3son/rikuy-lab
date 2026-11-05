/**
 * Text that lives inside the hologram. A sprite always faces the camera that draws it, so each of
 * the four pyramid views gets its own readable copy (the acetate mirror is handled by the view
 * flip). The canvas is redrawn only when the text changes.
 */
import * as THREE from 'three';
import { canvasTexture } from './materials.ts';

export interface LabelLine {
  text: string;
  color: string;
  /** Font size in canvas pixels (canvas is 512 wide). */
  size: number;
}

const W = 512;
const H = 256;

export class HoloLabel {
  readonly sprite: THREE.Sprite;
  private readonly texture: THREE.Texture;
  private key = '';

  constructor(width: number) {
    this.texture = canvasTexture(W, H);
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture, transparent: true, depthWrite: false, toneMapped: false }));
    this.sprite.scale.set(width, (width * H) / W, 1);
    this.sprite.renderOrder = 3;
  }

  set(lines: readonly LabelLine[]): void {
    const key = lines.map((l) => l.text).join('\n');
    if (key === this.key) return;
    this.key = key;
    const canvas = (this.texture as THREE.CanvasTexture).image as HTMLCanvasElement | undefined;
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const total = lines.reduce((s, l) => s + l.size * 1.25, 0);
    let y = (H - total) / 2;
    for (const l of lines) {
      y += (l.size * 1.25) / 2;
      ctx.font = `700 ${l.size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
      // Two passes: a wide soft glow, then the crisp text on top.
      ctx.shadowColor = l.color;
      ctx.shadowBlur = l.size * 0.45;
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, W / 2, y);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.35;
      ctx.fillText(l.text, W / 2, y);
      ctx.globalAlpha = 1;
      y += (l.size * 1.25) / 2;
    }
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
