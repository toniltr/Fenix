import * as THREE from "three";
import { Interactable } from "./Interactable.js";

export class Door extends Interactable {
  readonly kind = "door" as const;
  leadsTo?: string;

  constructor(id: string, position: THREE.Vector3, inkNode = "", leadsTo?: string) {
    // ámbar si tiene narrativa (algo puede pasar al usarla), violeta si es paso puro
    const color = inkNode ? 0xef9f27 : 0x7f77dd;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 2, 0.2),
      new THREE.MeshStandardMaterial({ color }),
    );
    mesh.position.copy(position);
    mesh.position.y = 1;
    super(id, mesh, inkNode);
    this.leadsTo = leadsTo;
  }
}
