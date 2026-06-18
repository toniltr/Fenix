import * as THREE from "three";

// Traduce clics a un raycast contra los interactuables de la SALA ACTUAL.
// Los targets cambian al viajar entre salas, por eso son mutables.
export class InputManager {
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private targets: THREE.Object3D[] = [];
  private handler: (obj: THREE.Object3D) => void = () => {};

  constructor(
    private dom: HTMLElement,
    private camera: THREE.Camera,
  ) {
    this.dom.addEventListener("pointerdown", (e) => this.onDown(e));
  }

  setPickHandler(handler: (obj: THREE.Object3D) => void): void {
    this.handler = handler;
  }
  setPickTargets(targets: THREE.Object3D[]): void {
    this.targets = targets;
  }

  private onDown(e: PointerEvent): void {
    if (e.button !== 0) return; // izquierdo; OrbitControls usa derecho/medio
    const rect = this.dom.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.targets, false);
    if (hits.length > 0) this.handler(hits[0].object);
  }
}
