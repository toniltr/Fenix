import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Clock } from "./Clock.js";
import { SceneManager } from "./SceneManager.js";
import { InputManager } from "./InputManager.js";
import { LightingManager } from "./LightingManager.js";
import { AssetLoader } from "./AssetLoader.js";
import type { Physics } from "./Physics.js";
import type { Updatable } from "./SceneManager.js";

// Orquestador: dueño del render loop y del dt.
export class Engine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  clock = new Clock();
  scenes: SceneManager;
  input: InputManager;
  lighting: LightingManager;

  private readonly assets: AssetLoader;
  private readonly persistent: Updatable[] = [];
  private roomUpdatables: Updatable[] = [];

  constructor(private readonly physics?: Physics) {
    const app = document.getElementById("app")!;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    app.appendChild(this.renderer.domElement);

    this.assets = new AssetLoader(this.renderer);

    this.scene.background = new THREE.Color(0x14141a);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    this.camera.position.set(4, 4, 6);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1, 0);
    this.controls.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.controls.minPolarAngle = 0.2;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 17;
    this.controls.update();

    this.scenes = new SceneManager(this.scene);
    this.input = new InputManager(this.renderer.domElement, this.camera);

    this.lighting = new LightingManager(this.scene, this.renderer);

    window.addEventListener("resize", () => this.onResize());
  }

  private async setupGround(): Promise<void> {
    const gltf = await this.assets.load("/models/ground.glb");
    this.scene.add(gltf.scene);
  }

  /** objeto persistente (no se borra al viajar de sala) */
  addPersistent(obj: THREE.Object3D): void {
    this.scene.add(obj);
  }
  addUpdatable(u: Updatable): void {
    this.persistent.push(u);
  }
  addRoomUpdatable(u: Updatable): void {
    this.roomUpdatables.push(u);
  }
  clearRoomUpdatables(): void {
    this.roomUpdatables = [];
  }

  async start(): Promise<void> {
    await this.setupGround();
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = this.clock.tick();
      for (const u of this.persistent) u.update(dt);
      for (const u of this.roomUpdatables) u.update(dt);
      this.physics?.step();
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  resetCameraToFar(): void {
    const dir = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target)
      .normalize();
    this.camera.position.copy(
      this.controls.target.clone().addScaledVector(dir, this.controls.maxDistance),
    );
    this.controls.update();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
