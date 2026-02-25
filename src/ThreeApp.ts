import * as THREE from "three";

export interface SceneModule {
  init(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void;
  update(delta: number): void;
  dispose(): void;
}

export class ThreeApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private modules: SceneModule[] = [];
  private animationFrameId: number | null = null;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    window.addEventListener("resize", this.onResize.bind(this));
    this.onResize();
  }

  addModule(mod: SceneModule): void {
    mod.init(this.scene, this.camera);
    this.modules.push(mod);
  }

  start(): void {
    this.clock.start();
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
    this.renderer.dispose();
    window.removeEventListener("resize", this.onResize.bind(this));
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
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
