import * as THREE from "three";
import { Interactable } from "./Interactable.js";

// Sólo se crea cuando una rutina lo referencia de verdad (segunda pasada).
export class Furniture extends Interactable {
  readonly kind = "furniture" as const;
  constructor(id: string, mesh: THREE.Mesh, inkNode: string) {
    super(id, mesh, inkNode);
  }
}
