import * as THREE from "three";
import type { SceneModule } from "@/ThreeApp";

export class GridModule implements SceneModule {
  private gridHelper: THREE.GridHelper | null = null;
  private axesHelper: THREE.AxesHelper | null = null;

  init(scene: THREE.Scene, _camera: THREE.PerspectiveCamera): void {
    this.gridHelper = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
    scene.add(this.gridHelper);

    this.axesHelper = new THREE.AxesHelper(5);
    scene.add(this.axesHelper);
  }

  update(_delta: number): void {}

  dispose(): void {
    if (this.gridHelper) {
      this.gridHelper.geometry.dispose();
      (this.gridHelper.material as THREE.Material).dispose();
      this.gridHelper.removeFromParent();
      this.gridHelper = null;
    }
    if (this.axesHelper) {
      this.axesHelper.geometry.dispose();
      (this.axesHelper.material as THREE.Material).dispose();
      this.axesHelper.removeFromParent();
      this.axesHelper = null;
    }
  }
}
