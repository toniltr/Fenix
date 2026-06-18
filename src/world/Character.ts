import * as THREE from "three";

// Entidad espacial base: mesh + (opcional) AnimationMixer + walkTo.
// El "cómo se mueve" vive aquí; el "por qué se mueve" lo decide ink.
export class Character {
  object: THREE.Object3D;
  mixer?: THREE.AnimationMixer;

  private target: THREE.Vector3 | null = null;
  private onArrive: (() => void) | null = null;
  private speed = 2.0; // m/s

  constructor(object: THREE.Object3D) {
    this.object = object;
  }

  /** ordena caminar hacia un punto; callback opcional al llegar */
  walkTo(point: THREE.Vector3, onArrive?: () => void): void {
    this.target = point.clone();
    this.onArrive = onArrive ?? null;
  }

  stop(): void {
    this.target = null;
    this.onArrive = null;
  }

  /** se llama cada frame desde el render loop */
  update(dt: number): void {
    // CRÍTICO: sin esto, T-pose estática.
    this.mixer?.update(dt);

    if (!this.target) return;
    const pos = this.object.position;
    const dir = new THREE.Vector3().subVectors(this.target, pos);
    dir.y = 0;
    const dist = dir.length();
    if (dist < 0.05) {
      const cb = this.onArrive;
      this.stop();
      cb?.();
      return;
    }
    dir.normalize();
    pos.addScaledVector(dir, Math.min(this.speed * dt, dist));
    this.object.lookAt(pos.x + dir.x, pos.y, pos.z + dir.z);
  }
}
