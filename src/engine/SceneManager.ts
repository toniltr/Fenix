import * as THREE from "three";

interface Updatable { update(dt: number): void }

// Carga/descarga de salas. Aquí vive el issue #2: disponer colliders y
// geometría de la sala anterior al viajar entre escenas.
export class SceneManager {
  private roomGroup = new THREE.Group();

  constructor(private scene: THREE.Scene) {
    this.scene.add(this.roomGroup);
  }

  add(obj: THREE.Object3D): void {
    this.roomGroup.add(obj);
  }

  /** limpieza al cambiar de sala (dispose de geometrías/materiales) */
  clearRoom(): void {
    this.roomGroup.traverse((o: THREE.Object3D) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.roomGroup.clear();
    // TODO issue #2: aquí también world.removeCollider(...) de la sala saliente
  }
}

export type { Updatable };
