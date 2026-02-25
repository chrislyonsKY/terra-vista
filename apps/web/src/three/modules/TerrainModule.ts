import * as THREE from "three";
import type { SceneModule } from "../ThreeApp";
import type { Extent } from "@mapqc/shared";

export interface TerrainData {
  elevations: Float32Array;
  width: number;
  height: number;
  extent: Extent;
  noDataValue: number | null;
}

export class TerrainModule implements SceneModule {
  private mesh: THREE.Mesh | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.MeshStandardMaterial | null = null;
  private texture: THREE.DataTexture | null = null;
  private scene: THREE.Scene | null = null;
  private elevationScale = 1;

  init(scene: THREE.Scene, _camera: THREE.PerspectiveCamera): void {
    this.scene = scene;
  }

  setElevationScale(scale: number): void {
    this.elevationScale = scale;
    if (this.mesh) {
      this.mesh.scale.setY(scale);
    }
  }

  loadTerrain(data: TerrainData): void {
    this.clearTerrain();

    const { elevations, width, height, extent, noDataValue } = data;
    const extentW = extent.maxX - extent.minX;
    const extentH = extent.maxY - extent.minY;

    let minElev = Infinity;
    let maxElev = -Infinity;
    for (let i = 0; i < elevations.length; i++) {
      const v = elevations[i];
      if (noDataValue !== null && v === noDataValue) continue;
      if (!isFinite(v)) continue;
      if (v < minElev) minElev = v;
      if (v > maxElev) maxElev = v;
    }

    if (!isFinite(minElev)) minElev = 0;
    if (!isFinite(maxElev)) maxElev = 1;
    const elevRange = maxElev - minElev || 1;

    const segW = Math.min(width - 1, 512);
    const segH = Math.min(height - 1, 512);

    this.geometry = new THREE.PlaneGeometry(extentW, extentH, segW, segH);
    this.geometry.rotateX(-Math.PI / 2);

    const positions = this.geometry.attributes.position;
    const vertCountX = segW + 1;
    const vertCountZ = segH + 1;

    for (let iz = 0; iz < vertCountZ; iz++) {
      for (let ix = 0; ix < vertCountX; ix++) {
        const srcX = Math.floor((ix / segW) * (width - 1));
        const srcY = Math.floor((iz / segH) * (height - 1));
        const srcIdx = srcY * width + srcX;
        let elev = elevations[srcIdx];

        if (noDataValue !== null && elev === noDataValue) elev = minElev;
        if (!isFinite(elev)) elev = minElev;

        const normalizedElev = ((elev - minElev) / elevRange) * (extentW * 0.1);
        const vertIdx = iz * vertCountX + ix;
        positions.setY(vertIdx, normalizedElev);
      }
    }

    this.geometry.computeVertexNormals();
    positions.needsUpdate = true;

    this.texture = this.buildColorRamp(elevations, width, height, minElev, maxElev, noDataValue);

    this.material = new THREE.MeshStandardMaterial({
      map: this.texture,
      side: THREE.DoubleSide,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(
      extent.minX + extentW / 2,
      0,
      extent.minY + extentH / 2
    );
    this.mesh.scale.setY(this.elevationScale);

    if (this.scene) {
      this.scene.add(this.mesh);
    }
  }

  private buildColorRamp(
    elevations: Float32Array,
    width: number,
    height: number,
    minElev: number,
    maxElev: number,
    noDataValue: number | null
  ): THREE.DataTexture {
    const texW = Math.min(width, 512);
    const texH = Math.min(height, 512);
    const data = new Uint8Array(texW * texH * 4);
    const range = maxElev - minElev || 1;

    for (let y = 0; y < texH; y++) {
      for (let x = 0; x < texW; x++) {
        const srcX = Math.floor((x / texW) * width);
        const srcY = Math.floor((y / texH) * height);
        const srcIdx = srcY * width + srcX;
        let elev = elevations[srcIdx];

        const texIdx = (y * texW + x) * 4;

        if ((noDataValue !== null && elev === noDataValue) || !isFinite(elev)) {
          data[texIdx] = 40;
          data[texIdx + 1] = 40;
          data[texIdx + 2] = 60;
          data[texIdx + 3] = 255;
          continue;
        }

        const t = (elev - minElev) / range;
        const [r, g, b] = this.elevationColor(t);
        data[texIdx] = r;
        data[texIdx + 1] = g;
        data[texIdx + 2] = b;
        data[texIdx + 3] = 255;
      }
    }

    const tex = new THREE.DataTexture(data, texW, texH, THREE.RGBAFormat);
    tex.needsUpdate = true;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  private elevationColor(t: number): [number, number, number] {
    const clamped = Math.max(0, Math.min(1, t));
    if (clamped < 0.2) {
      const s = clamped / 0.2;
      return [
        Math.floor(30 + s * 20),
        Math.floor(80 + s * 60),
        Math.floor(30 + s * 20),
      ];
    } else if (clamped < 0.4) {
      const s = (clamped - 0.2) / 0.2;
      return [
        Math.floor(50 + s * 100),
        Math.floor(140 + s * 60),
        Math.floor(50 - s * 10),
      ];
    } else if (clamped < 0.6) {
      const s = (clamped - 0.4) / 0.2;
      return [
        Math.floor(150 + s * 80),
        Math.floor(200 - s * 40),
        Math.floor(40 + s * 20),
      ];
    } else if (clamped < 0.8) {
      const s = (clamped - 0.6) / 0.2;
      return [
        Math.floor(230 - s * 30),
        Math.floor(160 - s * 60),
        Math.floor(60 + s * 30),
      ];
    } else {
      const s = (clamped - 0.8) / 0.2;
      return [
        Math.floor(200 + s * 55),
        Math.floor(100 + s * 100),
        Math.floor(90 + s * 120),
      ];
    }
  }

  private clearTerrain(): void {
    if (this.mesh) {
      this.mesh.removeFromParent();
      this.mesh = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
  }

  update(_delta: number): void {}

  dispose(): void {
    this.clearTerrain();
    this.scene = null;
  }
}
