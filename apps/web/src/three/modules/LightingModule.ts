import * as THREE from "three";
import type { SceneModule } from "../ThreeApp";

export class LightingModule implements SceneModule {
  private ambientLight: THREE.AmbientLight | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private fillLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private backLight: THREE.DirectionalLight | null = null;

  init(scene: THREE.Scene, _camera: THREE.PerspectiveCamera): void {
    this.hemiLight = new THREE.HemisphereLight(0xb0d0f0, 0x443322, 0.6);
    scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0x606060, 0.5);
    scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff0d0, 1.8);
    this.sunLight.position.set(150, 300, 100);
    scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0x90a8c0, 0.6);
    this.fillLight.position.set(-80, 60, -100);
    scene.add(this.fillLight);

    this.backLight = new THREE.DirectionalLight(0x607090, 0.3);
    this.backLight.position.set(0, 50, -200);
    scene.add(this.backLight);
  }

  update(_delta: number): void {}

  dispose(): void {
    const lights = [this.ambientLight, this.sunLight, this.fillLight, this.hemiLight, this.backLight];
    for (const light of lights) {
      if (light) {
        light.removeFromParent();
      }
    }
    this.ambientLight = null;
    this.sunLight = null;
    this.fillLight = null;
    this.hemiLight = null;
    this.backLight = null;
  }
}
