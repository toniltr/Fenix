import * as THREE from "three";
import { Interactable } from "./Interactable.js";

export class Pickup extends Interactable {
  readonly kind = "pickup" as const;
  constructor(id: string, position: THREE.Vector3, inkNode: string) {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.2),
      new THREE.MeshStandardMaterial({ color: 0x5dcaa5 }),
    );
    mesh.position.copy(position);
    super(id, mesh, inkNode);
  }
}
