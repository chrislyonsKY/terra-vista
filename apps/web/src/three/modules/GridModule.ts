import * as THREE from "three";
import type { SceneModule } from "../ThreeApp";

export class GridModule implements SceneModule {
  private gridHelper: THREE.GridHelper | null = null;

  init(scene: THREE.Scene, _camera: THREE.PerspectiveCamera): void {
    this.gridHelper = new THREE.GridHelper(400, 40, 0x3a3a3e, 0x333336);
    this.gridHelper.position.y = -0.5;
    scene.add(this.gridHelper);
  }

  update(_delta: number): void {}

  dispose(): void {
    if (this.gridHelper) {
      this.gridHelper.geometry.dispose();
      (this.gridHelper.material as THREE.Material).dispose();
      this.gridHelper.removeFromParent();
      this.gridHelper = null;
    }
  }
}
