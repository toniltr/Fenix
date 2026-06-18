import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Clock } from "./Clock.js";
import { SceneManager } from "./SceneManager.js";
import { InputManager } from "./InputManager.js";
import type { Physics } from "./Physics.js";
import type { Updatable } from "./SceneManager.js";
import type { Theme } from "@/types/world.js";

// Orquestador: dueño del render loop y del dt.
export class Engine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  clock = new Clock();
  scenes: SceneManager;
  input: InputManager;

  private ground!: THREE.Mesh;
  // persistentes: sobreviven al cambio de sala (jugador, ticker de hambre)
  private persistent: Updatable[] = [];
  // de sala: se vacían al viajar (NPCs de la sala)
  private roomUpdatables: Updatable[] = [];

  constructor(private physics?: Physics) {
    const app = document.getElementById("app")!;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    app.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x14141a);

    this.camera = new THREE.PerspectiveCamera(
      55, window.innerWidth / window.innerHeight, 0.1, 100,
    );
    this.camera.position.set(4, 4, 6);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1, 0);
    this.controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.controls.minPolarAngle = 0.2;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.update();

    this.scenes = new SceneManager(this.scene);
    this.input = new InputManager(this.renderer.domElement, this.camera);

    this.setupLights();
    this.setupGround();

    window.addEventListener("resize", () => this.onResize());
  }

  private setupLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xddeeff, 0x223344, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 8, 4);
    this.scene.add(sun);
  }

  private setupGround(): void {
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x2a2a32 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);
    const grid = new THREE.GridHelper(40, 40, 0x444455, 0x33333a);
    this.scene.add(grid);
  }

  /** aplica el tema visual de la sala (suelo + fondo): el diferenciador de un vistazo */
  setTheme(theme: Theme): void {
    (this.ground.material as THREE.MeshStandardMaterial).color.set(theme.floor);
    (this.scene.background as THREE.Color).set(theme.background);
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

  start(): void {
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

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
