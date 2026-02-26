import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export interface SceneModule {
  init(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void;
  update(delta: number): void;
  dispose(): void;
}

export class ThreeApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private timer: THREE.Timer;
  private modules: SceneModule[] = [];
  private animationFrameId: number | null = null;
  private boundResize: () => void;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd4e6f1);
    this.scene.fog = new THREE.FogExp2(0xd4e6f1, 0.0015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    );
    this.camera.position.set(0, 50, 80);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    this.timer = new THREE.Timer();

    this.boundResize = this.onResize.bind(this);
    window.addEventListener("resize", this.boundResize);
    this.onResize();
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getControls(): OrbitControls {
    return this.controls;
  }

  addModule(mod: SceneModule): void {
    mod.init(this.scene, this.camera);
    this.modules.push(mod);
  }

  removeModule(mod: SceneModule): void {
    const idx = this.modules.indexOf(mod);
    if (idx !== -1) {
      mod.dispose();
      this.modules.splice(idx, 1);
    }
  }

  start(): void {
    this.animate();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  dispose(): void {
    this.stop();
    for (const mod of this.modules) {
      mod.dispose();
    }
    this.modules = [];
    this.controls.dispose();
    this.renderer.dispose();
    window.removeEventListener("resize", this.boundResize);
  }

  resetCamera(): void {
    this.camera.position.set(150, 120, 180);
    this.controls.target.set(0, 10, 0);
    this.controls.update();
  }

  captureScreenshot(): string | null {
    this.renderer.render(this.scene, this.camera);
    try {
      return this.renderer.domElement.toDataURL("image/png");
    } catch {
      return null;
    }
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    this.timer.update();
    const delta = this.timer.getDelta();
    this.controls.update();
    for (const mod of this.modules) {
      mod.update(delta);
    }
    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
