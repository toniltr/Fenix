import * as THREE from "three";

// Punto con nombre que ink referencia por string ("puerta_tienda").
// El InkBridge resuelve nombre -> Marker -> coordenada.
export class Marker {
  constructor(
    public id: string,
    public position: THREE.Vector3,
  ) {}

  static fromTuple(id: string, t: [number, number, number]): Marker {
    return new Marker(id, new THREE.Vector3(t[0], t[1], t[2]));
  }
}
