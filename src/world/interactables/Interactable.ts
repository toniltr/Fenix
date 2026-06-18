import * as THREE from "three";

// Base de objetos usables. El DATO espacial (mesh, posición) es del motor;
// la CONDICIÓN/consecuencia narrativa se delega a ink vía inkNode (si lo hay).
export abstract class Interactable {
  abstract readonly kind: "door" | "pickup" | "furniture";
  constructor(
    public id: string,
    public mesh: THREE.Mesh,
    public inkNode: string, // "" si la interacción no es narrativa (p.ej. puerta de paso)
  ) {
    mesh.userData.interactableId = id;
  }
}
