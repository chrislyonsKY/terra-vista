import * as THREE from "three";
import type { SceneModule } from "../ThreeApp";

export interface TerrainData {
  elevations: Float32Array;
  width: number;
  height: number;
  noDataValue: number | null;
}

export type ColorRampName = "terrain" | "viridis" | "magma" | "arctic" | "desert" | "slope" | "aspect";

export class TerrainModule implements SceneModule {
  private mesh: THREE.Mesh | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.MeshStandardMaterial | null = null;
  private texture: THREE.DataTexture | null = null;
  private scene: THREE.Scene | null = null;
  private wireframeMesh: THREE.LineSegments | null = null;
  private wireframeMaterial: THREE.LineBasicMaterial | null = null;

  private currentData: TerrainData | null = null;
  private currentRamp: ColorRampName = "terrain";
  private exaggeration = 1.0;
  private showWireframe = false;
  private sceneSize = 200;

  private minElev = 0;
  private maxElev = 1;

  init(scene: THREE.Scene, _camera: THREE.PerspectiveCamera): void {
    this.scene = scene;
  }

  getElevationRange(): { min: number; max: number } {
    return { min: this.minElev, max: this.maxElev };
  }

  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  getSceneBounds(): { sizeX: number; sizeZ: number } | null {
    if (!this.currentData) return null;
    const { width, height } = this.currentData;
    const aspect = width / height;
    const sizeX = aspect >= 1 ? this.sceneSize : this.sceneSize * aspect;
    const sizeZ = aspect >= 1 ? this.sceneSize / aspect : this.sceneSize;
    return { sizeX, sizeZ };
  }

  setExaggeration(value: number): void {
    this.exaggeration = value;
    if (this.currentData) {
      this.rebuildGeometry();
    }
  }

  setColorRamp(ramp: ColorRampName): void {
    this.currentRamp = ramp;
    if (this.currentData) {
      this.rebuildTexture();
    }
  }

  setWireframe(show: boolean): void {
    this.showWireframe = show;
    if (this.wireframeMesh) {
      this.wireframeMesh.visible = show;
    }
  }

  loadTerrain(data: TerrainData): void {
    this.clearTerrain();
    this.currentData = data;

    const { elevations, noDataValue } = data;

    this.minElev = Infinity;
    this.maxElev = -Infinity;
    for (let i = 0; i < elevations.length; i++) {
      const v = elevations[i];
      if (noDataValue !== null && v === noDataValue) continue;
      if (!isFinite(v)) continue;
      if (v < this.minElev) this.minElev = v;
      if (v > this.maxElev) this.maxElev = v;
    }
    if (!isFinite(this.minElev)) this.minElev = 0;
    if (!isFinite(this.maxElev)) this.maxElev = 1;

    this.rebuildGeometry();
    this.rebuildTexture();
  }

  private rebuildGeometry(): void {
    const data = this.currentData;
    if (!data || !this.scene) return;

    if (this.mesh) this.mesh.removeFromParent();
    if (this.wireframeMesh) this.wireframeMesh.removeFromParent();
    if (this.geometry) this.geometry.dispose();
    if (this.wireframeMaterial) this.wireframeMaterial.dispose();

    const { elevations, width, height, noDataValue } = data;
    const elevRange = this.maxElev - this.minElev || 1;

    const maxSeg = 800;
    const segW = Math.min(width - 1, maxSeg);
    const segH = Math.min(height - 1, maxSeg);

    const aspect = width / height;
    const sizeX = aspect >= 1 ? this.sceneSize : this.sceneSize * aspect;
    const sizeZ = aspect >= 1 ? this.sceneSize / aspect : this.sceneSize;

    this.geometry = new THREE.PlaneGeometry(sizeX, sizeZ, segW, segH);
    this.geometry.rotateX(-Math.PI / 2);

    const positions = this.geometry.attributes.position;
    const vertCountX = segW + 1;
    const vertCountZ = segH + 1;

    const heightScale = (this.sceneSize * 0.1) * this.exaggeration;

    for (let iz = 0; iz < vertCountZ; iz++) {
      for (let ix = 0; ix < vertCountX; ix++) {
        const srcX = Math.floor((ix / segW) * (width - 1));
        const srcY = Math.floor((iz / segH) * (height - 1));
        const srcIdx = srcY * width + srcX;
        let elev = elevations[srcIdx];

        if (noDataValue !== null && elev === noDataValue) elev = this.minElev;
        if (!isFinite(elev)) elev = this.minElev;

        const normalized = (elev - this.minElev) / elevRange;
        const vertIdx = iz * vertCountX + ix;
        positions.setY(vertIdx, normalized * heightScale);
      }
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();

    if (!this.material) {
      this.material = new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        flatShading: false,
        roughness: 0.7,
        metalness: 0.1,
      });
    }

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    const wireGeo = new THREE.WireframeGeometry(this.geometry);
    this.wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      opacity: 0.08,
      transparent: true,
    });
    this.wireframeMesh = new THREE.LineSegments(wireGeo, this.wireframeMaterial);
    this.wireframeMesh.visible = this.showWireframe;
    this.scene.add(this.wireframeMesh);
  }

  private rebuildTexture(): void {
    const data = this.currentData;
    if (!data || !this.material) return;

    if (this.texture) this.texture.dispose();

    const { elevations, width, height, noDataValue } = data;
    const texW = Math.min(width, 1024);
    const texH = Math.min(height, 1024);
    const pixels = new Uint8Array(texW * texH * 4);
    const range = this.maxElev - this.minElev || 1;

    const isSlope = this.currentRamp === "slope";
    const isAspect = this.currentRamp === "aspect";

    if (isSlope || isAspect) {
      this.renderSlopeAspect(pixels, texW, texH, isAspect);
    } else {
      const rampFn = COLOR_RAMPS[this.currentRamp as keyof typeof COLOR_RAMPS];

      for (let y = 0; y < texH; y++) {
        for (let x = 0; x < texW; x++) {
          const srcX = Math.floor((x / texW) * width);
          const srcY = Math.floor((y / texH) * height);
          const srcIdx = srcY * width + srcX;
          const elev = elevations[srcIdx];
          const texIdx = (y * texW + x) * 4;

          if ((noDataValue !== null && elev === noDataValue) || !isFinite(elev)) {
            pixels[texIdx] = 20;
            pixels[texIdx + 1] = 20;
            pixels[texIdx + 2] = 30;
            pixels[texIdx + 3] = 255;
            continue;
          }

          const t = (elev - this.minElev) / range;
          const [r, g, b] = rampFn(t);
          pixels[texIdx] = r;
          pixels[texIdx + 1] = g;
          pixels[texIdx + 2] = b;
          pixels[texIdx + 3] = 255;
        }
      }
    }

    this.texture = new THREE.DataTexture(pixels, texW, texH, THREE.RGBAFormat);
    this.texture.needsUpdate = true;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.material.map = this.texture;
    this.material.needsUpdate = true;
  }

  private getElevAt(x: number, y: number): number {
    const data = this.currentData!;
    const cx = Math.max(0, Math.min(data.width - 1, x));
    const cy = Math.max(0, Math.min(data.height - 1, y));
    const v = data.elevations[cy * data.width + cx];
    if (data.noDataValue !== null && v === data.noDataValue) return this.minElev;
    if (!isFinite(v)) return this.minElev;
    return v;
  }

  private renderSlopeAspect(pixels: Uint8Array, texW: number, texH: number, isAspect: boolean): void {
    const data = this.currentData!;
    const { width, height } = data;

    for (let ty = 0; ty < texH; ty++) {
      for (let tx = 0; tx < texW; tx++) {
        const sx = Math.floor((tx / texW) * width);
        const sy = Math.floor((ty / texH) * height);
        const texIdx = (ty * texW + tx) * 4;

        const z1 = this.getElevAt(sx - 1, sy - 1);
        const z2 = this.getElevAt(sx, sy - 1);
        const z3 = this.getElevAt(sx + 1, sy - 1);
        const z4 = this.getElevAt(sx - 1, sy);
        const z6 = this.getElevAt(sx + 1, sy);
        const z7 = this.getElevAt(sx - 1, sy + 1);
        const z8 = this.getElevAt(sx, sy + 1);
        const z9 = this.getElevAt(sx + 1, sy + 1);

        const dzdx = ((z3 + 2 * z6 + z9) - (z1 + 2 * z4 + z7)) / 8;
        const dzdy = ((z7 + 2 * z8 + z9) - (z1 + 2 * z2 + z3)) / 8;
        const slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));

        if (isAspect) {
          if (slopeRad < 0.01) {
            pixels[texIdx] = 180;
            pixels[texIdx + 1] = 180;
            pixels[texIdx + 2] = 180;
          } else {
            let aspectDeg = (Math.atan2(-dzdy, dzdx) * 180 / Math.PI + 360) % 360;
            const hue = aspectDeg / 360;
            const [r, g, b] = hslToRgb(hue, 0.7, 0.55);
            pixels[texIdx] = r;
            pixels[texIdx + 1] = g;
            pixels[texIdx + 2] = b;
          }
        } else {
          const slopeDeg = slopeRad * 180 / Math.PI;
          const t = Math.min(1, slopeDeg / 60);
          const v = Math.floor(255 * (1 - t * 0.85));
          pixels[texIdx] = v;
          pixels[texIdx + 1] = v;
          pixels[texIdx + 2] = v;
        }
        pixels[texIdx + 3] = 255;
      }
    }
  }

  private clearTerrain(): void {
    if (this.mesh) {
      this.mesh.removeFromParent();
      this.mesh = null;
    }
    if (this.wireframeMesh) {
      this.wireframeMesh.removeFromParent();
      this.wireframeMesh = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    if (this.wireframeMaterial) {
      this.wireframeMaterial.dispose();
      this.wireframeMaterial = null;
    }
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
  }

  update(_delta: number): void {}

  dispose(): void {
    this.clearTerrain();
    this.currentData = null;
    this.scene = null;
  }
}

function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.floor(a[0] + (b[0] - a[0]) * t),
    Math.floor(a[1] + (b[1] - a[1]) * t),
    Math.floor(a[2] + (b[2] - a[2]) * t),
  ];
}

function multiStop(
  stops: [number, [number, number, number]][],
  t: number
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const local = (clamped - t0) / (t1 - t0);
      return lerp3(c0, c1, local);
    }
  }
  return stops[stops.length - 1][1];
}

const COLOR_RAMPS: Record<ColorRampName, (t: number) => [number, number, number]> = {
  terrain: (t) =>
    multiStop(
      [
        [0.0, [22, 82, 44]],
        [0.15, [60, 140, 60]],
        [0.3, [140, 180, 60]],
        [0.45, [200, 190, 80]],
        [0.55, [180, 140, 70]],
        [0.7, [150, 100, 60]],
        [0.82, [130, 80, 50]],
        [0.92, [200, 200, 210]],
        [1.0, [255, 255, 255]],
      ],
      t
    ),
  viridis: (t) =>
    multiStop(
      [
        [0.0, [68, 1, 84]],
        [0.25, [59, 82, 139]],
        [0.5, [33, 145, 140]],
        [0.75, [94, 201, 98]],
        [1.0, [253, 231, 37]],
      ],
      t
    ),
  magma: (t) =>
    multiStop(
      [
        [0.0, [0, 0, 4]],
        [0.25, [81, 18, 124]],
        [0.5, [183, 55, 121]],
        [0.75, [254, 159, 109]],
        [1.0, [252, 253, 191]],
      ],
      t
    ),
  arctic: (t) =>
    multiStop(
      [
        [0.0, [10, 30, 60]],
        [0.2, [20, 80, 130]],
        [0.4, [60, 150, 180]],
        [0.6, [140, 200, 220]],
        [0.8, [210, 230, 240]],
        [1.0, [250, 252, 255]],
      ],
      t
    ),
  desert: (t) =>
    multiStop(
      [
        [0.0, [60, 40, 20]],
        [0.2, [120, 80, 40]],
        [0.4, [180, 140, 80]],
        [0.6, [210, 180, 120]],
        [0.8, [230, 210, 170]],
        [1.0, [250, 240, 220]],
      ],
      t
    ),
};

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
