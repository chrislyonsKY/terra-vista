import * as THREE from "three";
import type { SceneModule } from "../ThreeApp";

export class LightingModule implements SceneModule {
  private ambientLight: THREE.AmbientLight | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private fillLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;

  init(scene: THREE.Scene, _camera: THREE.PerspectiveCamera): void {
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x362a1a, 0.4);
    scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.3);
    scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
    this.sunLight.position.set(100, 200, 80);
    this.sunLight.castShadow = false;
    scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0x8090b0, 0.3);
    this.fillLight.position.set(-60, 40, -80);
    scene.add(this.fillLight);
  }

  update(_delta: number): void {}

  dispose(): void {
    if (this.ambientLight) {
      this.ambientLight.removeFromParent();
      this.ambientLight = null;
    }
    if (this.sunLight) {
      this.sunLight.removeFromParent();
      this.sunLight = null;
    }
    if (this.fillLight) {
      this.fillLight.removeFromParent();
      this.fillLight = null;
    }
    if (this.hemiLight) {
      this.hemiLight.removeFromParent();
      this.hemiLight = null;
    }
  }
}
