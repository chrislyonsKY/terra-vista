import * as THREE from "three";
import type { SceneModule } from "../ThreeApp";

export class LightingModule implements SceneModule {
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;

  init(scene: THREE.Scene, _camera: THREE.PerspectiveCamera): void {
    this.ambientLight = new THREE.AmbientLight(0x6666aa, 0.5);
    scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(5, 10, 7);
    scene.add(this.directionalLight);
  }

  update(_delta: number): void {}

  dispose(): void {
    if (this.ambientLight) {
      this.ambientLight.removeFromParent();
      this.ambientLight = null;
    }
    if (this.directionalLight) {
      this.directionalLight.removeFromParent();
      this.directionalLight = null;
    }
  }
}
